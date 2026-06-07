import type { StatusWykonania } from '~/types/database.types'

const TIMER_META_PREFIX = '__antica_timer_v1__:'

export type ExecutionTimerState = 'pending' | 'running' | 'paused' | 'done' | 'rejected'
export type ExecutionTimerAction = 'start' | 'pause' | 'resume' | 'finish' | 'reject'

export interface TimerExecution {
  status: StatusWykonania
  czas_start: string | null
  czas_koniec: string | null
  czas_min: number | null
  uwagi: string | null
  procedury?: { norma_min: number } | null
}

interface TimerMeta {
  accumulatedMs: number
  runningSince: string | null
  paused: boolean
  note: string | null
}

export interface TimerMutation {
  payload: {
    status?: StatusWykonania
    czas_start?: string | null
    czas_koniec?: string | null
    uwagi?: string | null
  }
}

function parseTimerMeta(execution: TimerExecution) {
  if (execution.uwagi?.startsWith(TIMER_META_PREFIX)) {
    try {
      const parsed = JSON.parse(execution.uwagi.slice(TIMER_META_PREFIX.length)) as Partial<TimerMeta>
      return {
        stored: true,
        meta: {
          accumulatedMs: Math.max(0, Number(parsed.accumulatedMs) || 0),
          runningSince: typeof parsed.runningSince === 'string' ? parsed.runningSince : null,
          paused: Boolean(parsed.paused),
          note: typeof parsed.note === 'string' ? parsed.note : null
        } satisfies TimerMeta
      }
    } catch {
      // Nieprawidłowe metadane traktujemy jak zwykłą notatkę.
    }
  }

  return {
    stored: false,
    meta: {
      accumulatedMs: 0,
      runningSince: execution.status === 'w_trakcie' ? execution.czas_start : null,
      paused: false,
      note: execution.uwagi
    } satisfies TimerMeta
  }
}

function serializeTimerMeta(meta: TimerMeta) {
  return TIMER_META_PREFIX + JSON.stringify(meta)
}

export function executionTimerState(execution: TimerExecution): ExecutionTimerState {
  if (execution.status === 'wykonane') return 'done'
  if (execution.status === 'odrzucone') return 'rejected'
  if (execution.status !== 'w_trakcie') return 'pending'
  return parseTimerMeta(execution).meta.paused ? 'paused' : 'running'
}

export function executionElapsedMs(execution: TimerExecution, now = Date.now()) {
  const { meta, stored } = parseTimerMeta(execution)
  const state = executionTimerState(execution)

  if ((state === 'done' || state === 'rejected') && !stored) {
    if (execution.czas_min != null) return Math.max(0, execution.czas_min * 60_000)
    if (execution.czas_start && execution.czas_koniec) {
      return Math.max(0, new Date(execution.czas_koniec).getTime() - new Date(execution.czas_start).getTime())
    }
  }

  if (state === 'running' && meta.runningSince) {
    return meta.accumulatedMs + Math.max(0, now - new Date(meta.runningSince).getTime())
  }

  return meta.accumulatedMs
}

export function formatExecutionTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function executionNote(execution: TimerExecution) {
  return parseTimerMeta(execution).meta.note
}

export function buildTimerMutation(
  execution: TimerExecution,
  action: ExecutionTimerAction,
  now = new Date(),
  note?: string
): TimerMutation {
  const timestamp = now.toISOString()
  const parsed = parseTimerMeta(execution)
  const elapsedMs = executionElapsedMs(execution, now.getTime())
  const baseMeta: TimerMeta = {
    ...parsed.meta,
    note: note === undefined ? parsed.meta.note : note.trim() || null
  }

  if (action === 'start' || action === 'resume') {
    const meta = { ...baseMeta, runningSince: timestamp, paused: false }
    return {
      payload: {
        status: 'w_trakcie',
        czas_start: execution.czas_start ?? timestamp,
        czas_koniec: null,
        uwagi: serializeTimerMeta(meta)
      }
    }
  }

  if (action === 'pause') {
    const meta = { ...baseMeta, accumulatedMs: elapsedMs, runningSince: null, paused: true }
    return { payload: { status: 'w_trakcie', uwagi: serializeTimerMeta(meta) } }
  }

  const meta = { ...baseMeta, accumulatedMs: elapsedMs, runningSince: null, paused: false }

  return {
    payload: {
      status: action === 'finish' ? 'wykonane' : 'odrzucone',
      czas_koniec: execution.czas_start ? timestamp : null,
      uwagi: serializeTimerMeta(meta)
    }
  }
}
