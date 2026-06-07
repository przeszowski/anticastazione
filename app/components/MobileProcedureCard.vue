<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import type { ExecutionTimerAction } from '~/utils/executionTimer'
import {
  executionElapsedMs,
  executionTimerState,
  formatExecutionTimer
} from '~/utils/executionTimer'
import { formatPoraDnia } from '~/utils/procedureMeta'

const props = defineProps<{
  item: WykonanieWithRelations
  now: number
  busy?: boolean
}>()

const emit = defineEmits<{
  action: [item: WykonanieWithRelations, action: ExecutionTimerAction]
  open: [item: WykonanieWithRelations]
}>()

const dragX = ref(0)
const startX = ref(0)
const startY = ref(0)
const dragging = ref(false)
const horizontal = ref(false)
const moved = ref(false)

const state = computed(() => executionTimerState(props.item))
const elapsed = computed(() => formatExecutionTimer(executionElapsedMs(props.item, props.now)))
const terminal = computed(() => state.value === 'done' || state.value === 'rejected')

const rightAction = computed<ExecutionTimerAction | null>(() => {
  if (state.value === 'pending') return 'start'
  if (state.value === 'paused') return 'resume'
  if (state.value === 'running') return 'finish'
  return null
})

const leftAction = computed<ExecutionTimerAction | null>(() => {
  if (state.value === 'running') return 'pause'
  if (state.value === 'pending' || state.value === 'paused') return 'reject'
  return null
})

const rightLabel = computed(() => {
  if (rightAction.value === 'finish') return 'KONIEC'
  if (rightAction.value === 'resume') return 'WZNÓW'
  return 'START'
})

const leftLabel = computed(() => leftAction.value === 'pause' ? 'PAUZA' : 'ODRZUĆ')

const rightIcon = computed(() => rightAction.value === 'finish'
  ? 'i-lucide-circle-check'
  : rightAction.value === 'resume'
    ? 'i-lucide-rotate-ccw'
    : 'i-lucide-play'
)

const leftIcon = computed(() => leftAction.value === 'pause'
  ? 'i-lucide-pause'
  : 'i-lucide-trash-2'
)

const statusLabel = computed(() => ({
  pending: 'Do zrobienia',
  running: 'W trakcie',
  paused: 'Wstrzymane',
  done: 'Ukończone',
  rejected: 'Odrzucone'
})[state.value])

const icon = computed(() => ({
  Rano: 'i-lucide-sunrise',
  Dzien: 'i-lucide-sun',
  Wieczor: 'i-lucide-moon-star'
})[props.item.procedury?.pora_dnia ?? 'Dzien'])

const cardStyle = computed(() => ({
  transform: `translate3d(${dragX.value}px, 0, 0)`,
  transition: dragging.value ? 'none' : 'transform 280ms cubic-bezier(.32,.72,0,1)'
}))

function onPointerDown(event: PointerEvent) {
  if (terminal.value || props.busy) return
  startX.value = event.clientX
  startY.value = event.clientY
  dragX.value = 0
  dragging.value = true
  horizontal.value = false
  moved.value = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const dx = event.clientX - startX.value
  const dy = event.clientY - startY.value

  if (!horizontal.value && Math.max(Math.abs(dx), Math.abs(dy)) > 7) {
    if (Math.abs(dx) <= Math.abs(dy)) {
      moved.value = true
      dragging.value = false
      return
    }
    horizontal.value = true
  }

  if (!horizontal.value) return
  event.preventDefault()
  moved.value = true
  dragX.value = Math.max(-170, Math.min(170, dx))
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  const action = dragX.value >= 76 ? rightAction.value : dragX.value <= -76 ? leftAction.value : null
  dragX.value = 0
  if (action) emit('action', props.item, action)
}

function onPointerCancel() {
  dragging.value = false
  dragX.value = 0
}

function onClick() {
  if (moved.value) {
    moved.value = false
    return
  }
  emit('open', props.item)
}
</script>

<template>
  <div class="swipe-wrap">
    <div class="swipe-actions" aria-hidden="true">
      <div class="swipe-action swipe-action-start" :class="`swipe-${rightAction}`">
        <span class="swipe-action-icon">
          <UIcon :name="rightIcon" class="size-[22px]" />
        </span>
        <span>{{ rightLabel }}</span>
      </div>
      <div
        class="swipe-action swipe-action-end"
        :class="leftAction === 'pause' ? 'swipe-pause' : 'swipe-reject'"
      >
        <span>{{ leftLabel }}</span>
        <span class="swipe-action-icon">
          <UIcon :name="leftIcon" class="size-[22px]" />
        </span>
      </div>
    </div>

    <button
      type="button"
      class="procedure-card"
      :class="[`state-${state}`, { 'is-busy': busy }]"
      :style="cardStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click="onClick"
    >
      <span class="procedure-icon">
        <UIcon :name="icon" class="size-5" />
      </span>

      <span class="min-w-0 flex-1 text-left">
        <span class="block truncate text-sm font-semibold text-gray-900">
          {{ item.procedury?.nazwa ?? 'Procedura' }}
        </span>
        <span class="mt-0.5 block text-xs text-gray-500">
          {{ formatPoraDnia(item.procedury?.pora_dnia) }} · norma {{ item.procedury?.norma_min ?? 0 }} min
        </span>
      </span>

      <span class="flex min-w-[78px] flex-col items-end gap-1">
        <span class="status-badge" :class="`badge-${state}`">
          <span v-if="state === 'running'" class="run-dot" />
          {{ statusLabel }}
        </span>
        <span v-if="state === 'running' || state === 'paused'" class="timer" :class="{ paused: state === 'paused' }">
          {{ elapsed }}
        </span>
        <span v-else-if="state === 'done'" class="text-xs font-semibold text-green-700">
          {{ elapsed }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.swipe-wrap {
  position: relative;
  height: 78px;
  overflow: hidden;
  border-radius: 16px;
}

.swipe-actions {
  position: absolute;
  inset: 0;
  display: flex;
}

.swipe-action {
  display: flex;
  width: 50%;
  align-items: center;
  gap: 9px;
  padding: 0 16px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.swipe-action-start {
  justify-content: flex-start;
  color: #9a6d24;
  background: #fdf6ec;
}

.swipe-action-end { justify-content: flex-end; }

.swipe-action-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 50%;
  color: currentColor;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 2px 8px rgb(15 23 42 / 9%);
}

.swipe-finish { color: #15803d; background: #f0fdf4; }
.swipe-pause { color: #7c3aed; background: #f5f3ff; }
.swipe-reject { color: #dc2626; background: #fef2f2; }

.procedure-card {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  padding: 0 14px;
  box-shadow: 0 1px 5px rgb(15 23 42 / 7%);
  touch-action: pan-y;
  user-select: none;
  will-change: transform;
}

.procedure-card.state-running {
  border-left: 3px solid #c59d5f;
  background-color: #fff;
  background-image: linear-gradient(90deg, rgb(197 157 95 / 7%), transparent 34%);
}

.procedure-card.state-paused {
  border-left: 3px solid #7c3aed;
  background-color: #fff;
  background-image: linear-gradient(90deg, rgb(124 58 237 / 6%), transparent 34%);
}

.procedure-card.state-done,
.procedure-card.state-rejected { background: #fafafa; }

.procedure-card.is-busy {
  opacity: 0.65;
  pointer-events: none;
}

.procedure-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border-radius: 13px;
  color: #8a6830;
  background: #fdf6ec;
}

.state-running .procedure-icon { animation: pulse 1.8s ease-in-out infinite; }
.state-paused .procedure-icon { color: #7c3aed; background: #f5f3ff; }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.badge-pending { color: #6b7280; background: #f3f4f6; }
.badge-running { color: #2563eb; background: #eff6ff; }
.badge-paused { color: #7c3aed; background: #f5f3ff; }
.badge-done { color: #15803d; background: #f0fdf4; }
.badge-rejected { color: #dc2626; background: #fef2f2; }

.run-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: blink 1s ease-in-out infinite;
}

.timer {
  color: #b08840;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.timer.paused { color: #7c3aed; }

@keyframes blink {
  50% { opacity: 0.3; }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgb(197 157 95 / 30%); }
  50% { box-shadow: 0 0 0 6px rgb(197 157 95 / 0%); }
}

@media (prefers-reduced-motion: reduce) {
  .procedure-card,
  .procedure-icon,
  .run-dot {
    transition: none;
    animation: none;
  }
}
</style>
