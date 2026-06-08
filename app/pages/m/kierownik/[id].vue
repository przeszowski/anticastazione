<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import type { PoraDnia } from '~/types/database.types'
import { localDateInput } from '~/utils/date'
import {
  executionElapsedMs,
  executionTimerState,
  formatExecutionTimer
} from '~/utils/executionTimer'
import { formatPoraDnia } from '~/utils/procedureMeta'

definePageMeta({ layout: 'mobile', middleware: 'mobile-auth' })

const route = useRoute()
const toast = useToast()
const stationId = String(route.params.id)
const { can, ensureProfile } = useAuth()
const {
  stanowiska,
  loading: stationsLoading,
  error: stationsError,
  fetch: fetchStanowiska
} = useStanowiska()
const {
  wykonania,
  loading: executionsLoading,
  error: executionsError,
  fetchDzien
} = useWykonania()
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

const loading = computed(() => stationsLoading.value || executionsLoading.value)
const error = computed(() => stationsError.value || executionsError.value)
const station = computed(() => stanowiska.value.find(item => item.id === stationId) ?? null)

const states = computed(() => wykonania.value.map(executionTimerState))
const done = computed(() => states.value.filter(state => state === 'done').length)
const progress = computed(() => wykonania.value.length ? Math.round((done.value / wykonania.value.length) * 100) : 0)

const periods: PoraDnia[] = ['Rano', 'Dzien', 'Wieczor']
const periodGroups = computed(() => periods
  .map(period => ({
    period,
    items: wykonania.value.filter(item => item.procedury?.pora_dnia === period)
  }))
  .filter(group => group.items.length)
)

onMounted(async () => {
  await ensureProfile()
  if (!can('raporty:read')) {
    toast.add({ title: 'Widok dostępny dla kierownika', color: 'warning' })
    await navigateTo('/m')
    return
  }

  await Promise.all([
    fetchStanowiska(),
    fetchDzien(localDateInput(), stationId)
  ])
  clock = setInterval(() => { now.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

function statusMeta(item: WykonanieWithRelations) {
  return {
    pending: { label: 'Czeka', class: 'pending', icon: 'i-lucide-clock-3' },
    running: { label: 'W toku', class: 'running', icon: 'i-lucide-play' },
    paused: { label: 'Pauza', class: 'paused', icon: 'i-lucide-pause' },
    done: { label: 'Wykonane', class: 'done', icon: 'i-lucide-check' },
    rejected: { label: 'Odrzucone', class: 'rejected', icon: 'i-lucide-x' }
  }[executionTimerState(item)]
}

function timeLabel(item: WykonanieWithRelations) {
  const state = executionTimerState(item)
  if (state === 'pending') return `norma ${item.procedury?.norma_min ?? 0} min`
  if (state === 'rejected') return 'bez czasu'
  return `${formatExecutionTimer(executionElapsedMs(item, now.value))} / ${item.procedury?.norma_min ?? 0} min`
}
</script>

<template>
  <div class="station-page">
    <header class="station-header">
      <div class="header-row">
        <button type="button" class="back-button" title="Wróć" @click="navigateTo('/m/kierownik')">
          <UIcon name="i-lucide-arrow-left" class="size-5" />
        </button>
        <div class="min-w-0 flex-1">
          <p>Stanowisko</p>
          <h1>{{ station?.nazwa ?? 'Szczegóły' }}</h1>
        </div>
        <span class="header-progress">{{ progress }}%</span>
      </div>

      <div class="progress-row">
        <div><span :style="{ width: `${progress}%` }" /></div>
        <strong>{{ done }} / {{ wykonania.length }}</strong>
      </div>
    </header>

    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="m-4" />

    <div v-if="loading" class="grid flex-1 place-items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
    </div>

    <main v-else class="procedure-list">
      <template v-for="group in periodGroups" :key="group.period">
        <div class="period-heading">
          <span />
          <strong>{{ formatPoraDnia(group.period) }}</strong>
          <span />
        </div>

        <article v-for="item in group.items" :key="item.id" class="procedure-row">
          <span class="procedure-icon" :class="statusMeta(item).class">
            <UIcon :name="statusMeta(item).icon" class="size-[18px]" />
          </span>
          <div class="min-w-0 flex-1">
            <h2>{{ item.procedury?.nazwa ?? 'Procedura' }}</h2>
            <p>{{ timeLabel(item) }}</p>
          </div>
          <span class="status-badge" :class="statusMeta(item).class">
            {{ statusMeta(item).label }}
          </span>
        </article>
      </template>

      <div v-if="!periodGroups.length" class="py-14 text-center text-sm text-gray-400">
        Brak procedur dla tego stanowiska.
      </div>
    </main>
  </div>
</template>

<style scoped>
.station-page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  background: #f5f4f1;
}

.station-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid #ebe7df;
  padding: max(18px, env(safe-area-inset-top)) 16px 14px;
  background: rgb(255 255 255 / 95%);
  backdrop-filter: blur(16px);
}

.header-row { display: flex; align-items: center; gap: 12px; }
.back-button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border: 1px solid #ebe7df;
  border-radius: 10px;
  color: #4b5563;
  background: #fff;
}

.header-row p {
  color: #9a6d24;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.header-row h1 {
  overflow: hidden;
  margin-top: 2px;
  color: #111827;
  font-size: 18px;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-progress { color: #8a6830; font-size: 17px; font-weight: 750; }

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
}

.progress-row > div {
  height: 6px;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: #f0ede6;
}

.progress-row > div span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #c59d5f;
  transition: width 300ms ease;
}

.progress-row strong { color: #6b7280; font-size: 10px; font-weight: 700; }

.procedure-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 14px calc(28px + env(safe-area-inset-bottom));
}

.period-heading {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 14px 2px 3px;
}

.period-heading span { height: 1px; background: #e5e7eb; }
.period-heading strong {
  color: #9a6d24;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.procedure-row {
  display: flex;
  min-height: 66px;
  align-items: center;
  gap: 11px;
  border: 1px solid #ebe7df;
  border-radius: 8px;
  background: #fff;
  padding: 10px 11px;
}

.procedure-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 10px;
  color: #6b7280;
  background: #f3f4f6;
}

.procedure-icon.running { color: #8a6830; background: #fdf6ec; }
.procedure-icon.paused { color: #7c3aed; background: #f5f3ff; }
.procedure-icon.done { color: #15803d; background: #f0fdf4; }
.procedure-icon.rejected { color: #dc2626; background: #fef2f2; }

.procedure-row h2 {
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.procedure-row p {
  margin-top: 3px;
  color: #9ca3af;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.status-badge {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 7px;
  color: #6b7280;
  background: #f3f4f6;
  font-size: 9px;
  font-weight: 700;
}

.status-badge.running { color: #8a6830; background: #fdf6ec; }
.status-badge.paused { color: #7c3aed; background: #f5f3ff; }
.status-badge.done { color: #15803d; background: #f0fdf4; }
.status-badge.rejected { color: #dc2626; background: #fef2f2; }

@media (prefers-reduced-motion: reduce) {
  .progress-row > div span { transition: none; }
}
</style>
