<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import type { PoraDnia } from '~/types/database.types'
import type { ExecutionTimerAction, ExecutionTimerState } from '~/utils/executionTimer'
import {
  executionElapsedMs,
  executionNote,
  executionTimerState,
  formatExecutionTimer
} from '~/utils/executionTimer'
import { formatPoraDnia } from '~/utils/procedureMeta'

definePageMeta({ layout: 'mobile', middleware: 'mobile-auth' })

type TaskFilter = 'all' | 'todo' | 'active' | 'done'

const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { wykonania, loading, error, fetchDzien, applyTimerAction } = useWykonania()
const { imieNazwisko, logout } = useAuth()
const toast = useToast()

const today = new Date().toISOString().slice(0, 10)
const selectedStation = ref('')
const selectedTaskId = ref<string | null>(null)
const taskFilter = ref<TaskFilter>('all')
const busyIds = ref(new Set<string>())
const now = ref(Date.now())
const rejectOpen = ref(false)
const rejectReason = ref('')
const pendingReject = ref<WykonanieWithRelations | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

const dateLabel = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
}).format(new Date())

const stationOptions = computed(() =>
  stanowiska.value
    .filter(station => station.aktywne)
    .map(station => ({ label: station.nazwa, value: station.id }))
)

const tasks = computed(() =>
  wykonania.value.filter(item => !selectedStation.value || item.stanowisko_id === selectedStation.value)
)

const stateOf = (item: WykonanieWithRelations) => executionTimerState(item)

const counts = computed(() => {
  const result: Record<ExecutionTimerState, number> = {
    pending: 0,
    running: 0,
    paused: 0,
    done: 0,
    rejected: 0
  }
  tasks.value.forEach(item => result[stateOf(item)]++)
  return result
})

const progress = computed(() =>
  tasks.value.length ? Math.round((counts.value.done / tasks.value.length) * 100) : 0
)

const filteredTasks = computed(() => tasks.value.filter(item => {
  const state = stateOf(item)
  if (taskFilter.value === 'todo') return state === 'pending'
  if (taskFilter.value === 'active') return state === 'running' || state === 'paused'
  if (taskFilter.value === 'done') return state === 'done' || state === 'rejected'
  return true
}))

const periods: PoraDnia[] = ['Rano', 'Dzien', 'Wieczor']
const periodGroups = computed(() =>
  periods
    .map(period => ({
      period,
      items: filteredTasks.value.filter(item => item.procedury?.pora_dnia === period)
    }))
    .filter(group => group.items.length)
)

const selectedTask = computed(() =>
  wykonania.value.find(item => item.id === selectedTaskId.value) ?? null
)

const selectedState = computed(() =>
  selectedTask.value ? executionTimerState(selectedTask.value) : 'pending'
)

const selectedElapsed = computed(() =>
  selectedTask.value ? formatExecutionTimer(executionElapsedMs(selectedTask.value, now.value)) : '0:00'
)

const filters: { value: TaskFilter; label: string }[] = [
  { value: 'todo', label: 'Do zrobienia' },
  { value: 'active', label: 'Aktywne' },
  { value: 'done', label: 'Zakończone' },
  { value: 'all', label: 'Wszystkie' }
]

onMounted(async () => {
  await fetchStanowiska()
  const firstStation = stanowiska.value.find(station => station.aktywne)
  if (firstStation) selectedStation.value = firstStation.id
  await fetchDzien(today, selectedStation.value || undefined)
  clock = setInterval(() => { now.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

watch(selectedStation, async (stationId, previousId) => {
  if (!previousId || stationId === previousId) return
  selectedTaskId.value = null
  await fetchDzien(today, stationId)
})

function setBusy(id: string, busy: boolean) {
  const next = new Set(busyIds.value)
  if (busy) next.add(id)
  else next.delete(id)
  busyIds.value = next
}

function requestReject(item: WykonanieWithRelations) {
  pendingReject.value = item
  rejectReason.value = executionNote(item) ?? ''
  rejectOpen.value = true
}

async function handleAction(item: WykonanieWithRelations, action: ExecutionTimerAction) {
  if (action === 'reject') {
    requestReject(item)
    return
  }

  setBusy(item.id, true)
  try {
    await applyTimerAction(item, action)
    toast.add({
      title: {
        start: 'Procedura rozpoczęta',
        resume: 'Procedura wznowiona',
        pause: 'Procedura wstrzymana',
        finish: 'Procedura ukończona'
      }[action],
      color: action === 'finish' ? 'success' : action === 'pause' ? 'warning' : 'primary'
    })
  } catch (caught) {
    toast.add({
      title: 'Nie udało się zapisać zmiany',
      description: caught instanceof Error ? caught.message : undefined,
      color: 'error'
    })
  } finally {
    setBusy(item.id, false)
  }
}

async function confirmReject() {
  const item = pendingReject.value
  if (!item) return
  setBusy(item.id, true)
  try {
    await applyTimerAction(item, 'reject', rejectReason.value)
    rejectOpen.value = false
    selectedTaskId.value = null
    toast.add({ title: 'Procedura odrzucona', color: 'warning' })
  } catch (caught) {
    toast.add({
      title: 'Nie udało się odrzucić procedury',
      description: caught instanceof Error ? caught.message : undefined,
      color: 'error'
    })
  } finally {
    setBusy(item.id, false)
    pendingReject.value = null
  }
}

function openTask(item: WykonanieWithRelations) {
  selectedTaskId.value = item.id
}

function closeTask() {
  selectedTaskId.value = null
}

function detailPrimaryAction() {
  if (!selectedTask.value) return
  if (selectedState.value === 'running') handleAction(selectedTask.value, 'finish')
  else if (selectedState.value === 'paused') handleAction(selectedTask.value, 'resume')
  else if (selectedState.value === 'pending') handleAction(selectedTask.value, 'start')
  else closeTask()
}
</script>

<template>
  <div class="mobile-tasks">
    <header class="task-hero">
      <div class="relative z-10 flex items-start justify-between">
        <div>
          <div class="text-[11px] font-medium uppercase tracking-wide text-primary-700">{{ dateLabel }}</div>
          <div class="mt-1 text-[22px] font-semibold text-gray-900">
            {{ stanowiska.find(station => station.id === selectedStation)?.nazwa ?? 'Zadania' }}
          </div>
          <div class="mt-1 text-xs text-gray-500">{{ imieNazwisko || 'Pracownik' }}</div>
        </div>
        <button type="button" class="header-action" title="Wyloguj" @click="logout">
          <UIcon name="i-lucide-log-out" class="size-[18px]" />
        </button>
      </div>

      <USelect
        v-model="selectedStation"
        :items="stationOptions"
        value-key="value"
        icon="i-lucide-building-2"
        size="lg"
        class="relative z-10 mt-4 w-full"
      />
    </header>

    <section class="progress-strip">
      <div class="progress-ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle class="ring-track" cx="36" cy="36" r="30" />
          <circle class="ring-value" cx="36" cy="36" r="30" :style="{ strokeDashoffset: 188.5 - (188.5 * progress / 100) }" />
        </svg>
        <div class="progress-value">
          <strong>{{ progress }}%</strong>
          <span>wykon.</span>
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium text-gray-900">{{ counts.done }} z {{ tasks.length }} wykonanych</div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span class="summary-chip chip-done">{{ counts.done }} wyk.</span>
          <span class="summary-chip chip-running">{{ counts.running }} w toku</span>
          <span v-if="counts.paused" class="summary-chip chip-paused">{{ counts.paused }} pauza</span>
          <span v-if="counts.rejected" class="summary-chip chip-rejected">{{ counts.rejected }} odrz.</span>
        </div>
      </div>
    </section>

    <nav class="filter-bar" aria-label="Filtry zadań">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="filter-button"
        :class="{ active: taskFilter === filter.value }"
        @click="taskFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </nav>

    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="m-4" />

    <div v-if="loading" class="grid flex-1 place-items-center">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
    </div>

    <main v-else class="task-list">
      <template v-for="group in periodGroups" :key="group.period">
        <div class="period-heading">
          <span />
          <strong>{{ formatPoraDnia(group.period) }}</strong>
          <span />
        </div>
        <MobileProcedureCard
          v-for="item in group.items"
          :key="item.id"
          :item="item"
          :now="now"
          :busy="busyIds.has(item.id)"
          @action="handleAction"
          @open="openTask"
        />
      </template>

      <div v-if="!periodGroups.length" class="py-14 text-center text-sm text-gray-400">
        Brak zadań w tej kategorii.
      </div>

      <div class="swipe-help">
        <span><UIcon name="i-lucide-arrow-left" /> Pauza / odrzuć</span>
        <span>Start / koniec <UIcon name="i-lucide-arrow-right" /></span>
      </div>
    </main>

    <UModal :open="Boolean(selectedTask)" @update:open="open => { if (!open) closeTask() }">
      <template #content>
        <div v-if="selectedTask" class="overflow-hidden bg-[#f5f4f1]">
          <div class="detail-hero">
            <button type="button" class="detail-close" title="Zamknij" @click="closeTask">
              <UIcon name="i-lucide-arrow-left" class="size-5" />
            </button>
            <div class="relative z-10 mt-auto">
              <span class="detail-norm">~{{ selectedTask.procedury?.norma_min ?? 0 }} min</span>
              <h2 class="mt-2 text-xl font-semibold leading-tight text-gray-900">
                {{ selectedTask.procedury?.nazwa }}
              </h2>
            </div>
          </div>

          <div class="flex items-center gap-2 border-b border-gray-200 bg-white px-5 py-3">
            <span class="detail-chip">{{ selectedTask.stanowiska?.nazwa }}</span>
            <span class="detail-chip green">{{ formatPoraDnia(selectedTask.procedury?.pora_dnia) }}</span>
          </div>

          <div class="bg-white px-5 py-4">
            <div class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Opis procedury</div>
            <p class="mt-2 text-sm leading-6 text-gray-700">
              {{ selectedTask.procedury?.opis || 'Brak dodatkowego opisu.' }}
            </p>
          </div>

          <div class="p-4">
            <div class="detail-timer" :class="`timer-${selectedState}`">
              <div>
                <div class="text-sm font-semibold text-gray-900">
                  {{
                    selectedState === 'running' ? 'Procedura w toku'
                      : selectedState === 'paused' ? 'Procedura wstrzymana'
                        : selectedState === 'done' ? 'Procedura ukończona'
                          : selectedState === 'rejected' ? 'Procedura odrzucona'
                            : 'Gotowa do rozpoczęcia'
                  }}
                </div>
                <div class="mt-1 text-xs text-gray-500">
                  {{
                    selectedState === 'running' ? 'Przesuń kartę na liście lub zakończ tutaj'
                      : selectedState === 'paused' ? 'Czas nie jest teraz naliczany'
                        : 'Aktywny czas pracy jest zapisywany automatycznie'
                  }}
                </div>
              </div>
              <div v-if="selectedState === 'running' || selectedState === 'paused'" class="big-timer">
                {{ selectedElapsed }}
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-gray-200 bg-white px-4 pb-6 pt-3">
            <UButton color="neutral" variant="outline" class="flex-1 justify-center" @click="closeTask">Wróć</UButton>
            <UButton
              v-if="selectedState === 'running'"
              color="neutral"
              class="flex-1 justify-center bg-violet-50 text-violet-700 hover:bg-violet-100"
              icon="i-lucide-pause"
              :loading="busyIds.has(selectedTask.id)"
              @click="handleAction(selectedTask, 'pause')"
            >
              Pauza
            </UButton>
            <UButton
              v-else-if="selectedState === 'pending' || selectedState === 'paused'"
              color="error"
              variant="soft"
              class="flex-1 justify-center"
              @click="requestReject(selectedTask)"
            >
              Odrzuć
            </UButton>
            <UButton
              class="flex-[1.4] justify-center"
              :loading="busyIds.has(selectedTask.id)"
              @click="detailPrimaryAction"
            >
              {{
                selectedState === 'running' ? 'Zakończ'
                  : selectedState === 'paused' ? 'Wznów'
                    : selectedState === 'pending' ? 'Rozpocznij'
                      : 'Zamknij'
              }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="rejectOpen">
      <template #content>
        <div class="p-5">
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
              <UIcon name="i-lucide-x" class="size-5" />
            </span>
            <div>
              <h2 class="font-semibold text-gray-900">Odrzuć procedurę</h2>
              <p class="mt-1 text-sm text-gray-500">{{ pendingReject?.procedury?.nazwa }}</p>
            </div>
          </div>
          <UTextarea
            v-model="rejectReason"
            :rows="4"
            class="mt-4 w-full"
            placeholder="Powód odrzucenia (opcjonalnie)"
          />
          <div class="mt-4 flex gap-2 justify-end">
            <UButton color="neutral" variant="outline" @click="rejectOpen = false">Anuluj</UButton>
            <UButton color="error" :loading="pendingReject ? busyIds.has(pendingReject.id) : false" @click="confirmReject">
              Odrzuć
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.mobile-tasks {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  background: #f5f4f1;
}

.task-hero {
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
  padding: max(24px, env(safe-area-inset-top)) 20px 18px;
  background:
    radial-gradient(ellipse 270px 170px at 100% 15%, rgb(197 157 95 / 25%), transparent 70%),
    linear-gradient(160deg, #fff 0%, #fdf6ec 62%, #f5e8cc 100%);
}

.header-action,
.detail-close {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #6b7280;
  background: rgb(255 255 255 / 75%);
}

.progress-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  padding: 14px 20px;
}

.progress-ring {
  position: relative;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
}

.progress-ring svg { transform: rotate(-90deg); }
.ring-track, .ring-value { fill: none; stroke-width: 7; }
.ring-track { stroke: #f0ede6; }
.ring-value {
  stroke: #c59d5f;
  stroke-linecap: round;
  stroke-dasharray: 188.5;
  transition: stroke-dashoffset 500ms ease;
}

.progress-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}

.progress-value strong { font-size: 15px; color: #111827; }
.progress-value span { font-size: 9px; color: #9ca3af; text-transform: uppercase; }

.summary-chip {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
}

.chip-done { color: #15803d; background: #f0fdf4; }
.chip-running { color: #2563eb; background: #eff6ff; }
.chip-paused { color: #7c3aed; background: #f5f3ff; }
.chip-rejected { color: #dc2626; background: #fef2f2; }

.filter-bar {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px 16px;
  scrollbar-width: none;
}

.filter-bar::-webkit-scrollbar { display: none; }

.filter-button {
  flex: 0 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  padding: 5px 12px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
}

.filter-button.active {
  border-color: #c59d5f;
  color: #fff;
  background: #c59d5f;
}

.task-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 8px 14px calc(28px + env(safe-area-inset-bottom));
}

.period-heading {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px 2px 2px;
}

.period-heading span { height: 1px; background: #e5e7eb; }
.period-heading strong {
  color: #9a6d24;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.swipe-help {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px 2px;
  color: #9ca3af;
  font-size: 11px;
}

.swipe-help span { display: flex; align-items: center; gap: 4px; }

.detail-hero {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  padding: 16px 18px;
  background:
    radial-gradient(ellipse 180px 130px at 20% 20%, rgb(197 157 95 / 22%), transparent 70%),
    radial-gradient(ellipse 220px 150px at 90% 80%, rgb(176 136 64 / 16%), transparent 70%),
    #fdf6ec;
}

.detail-norm,
.detail-chip {
  display: inline-flex;
  width: fit-content;
  border: 1px solid rgb(197 157 95 / 35%);
  border-radius: 999px;
  background: #fdf6ec;
  padding: 4px 9px;
  color: #8a6830;
  font-size: 11px;
  font-weight: 700;
}

.detail-chip.green {
  border-color: #dcfce7;
  color: #15803d;
  background: #f0fdf4;
}

.detail-timer {
  display: flex;
  min-height: 82px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-left: 3px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 2px 12px rgb(15 23 42 / 7%);
}

.detail-timer.timer-running { border-left-color: #c59d5f; }
.detail-timer.timer-paused { border-left-color: #7c3aed; }
.detail-timer.timer-done { border-left-color: #16a34a; }
.detail-timer.timer-rejected { border-left-color: #dc2626; }

.big-timer {
  flex: 0 0 auto;
  color: #b08840;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.timer-paused .big-timer { color: #7c3aed; }

@media (min-width: 520px) {
  .mobile-tasks {
    min-height: calc(100dvh - 32px);
    margin: 16px 0;
    overflow: hidden;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgb(82 62 30 / 13%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-value { transition: none; }
}
</style>
