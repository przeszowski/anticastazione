<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import { executionElapsedMs, executionTimerState } from '~/utils/executionTimer'
import { formatPoraDnia } from '~/utils/procedureMeta'

definePageMeta({ layout: 'default' })

const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { wykonania, loading, error, fetchDzien } = useWykonania()
const today = new Date().toISOString().slice(0, 10)

onMounted(() => Promise.all([fetchStanowiska(), fetchDzien(today)]))

const dateLabel = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date())

const stationSummaries = computed(() => stanowiska.value
  .filter(station => station.aktywne)
  .map(station => {
    const items = wykonania.value.filter(item => item.stanowisko_id === station.id)
    const done = items.filter(item => executionTimerState(item) === 'done').length
    return {
      ...station,
      items,
      done,
      progress: items.length ? Math.round((done / items.length) * 100) : 0
    }
  }))

const stats = computed(() => {
  const total = wykonania.value.length
  const done = wykonania.value.filter(item => executionTimerState(item) === 'done').length
  const active = wykonania.value.filter(item => ['running', 'paused'].includes(executionTimerState(item))).length
  const pending = wykonania.value.filter(item => executionTimerState(item) === 'pending').length
  return {
    total,
    done,
    active,
    pending,
    percent: total ? Math.round((done / total) * 100) : 0,
    online: stationSummaries.value.filter(station => station.items.length > 0).length
  }
})

const recentActivity = computed(() => wykonania.value
  .filter(item => item.status === 'wykonane')
  .sort((a, b) => new Date(b.czas_koniec ?? b.created_at).getTime() - new Date(a.czas_koniec ?? a.created_at).getTime())
  .slice(0, 5))

function groupedItems(items: WykonanieWithRelations[]) {
  return [
    { label: 'Do zrobienia', state: 'pending', items: items.filter(item => executionTimerState(item) === 'pending') },
    { label: 'W trakcie', state: 'running', items: items.filter(item => ['running', 'paused'].includes(executionTimerState(item))) },
    { label: 'Wykonane', state: 'done', items: items.filter(item => executionTimerState(item) === 'done') }
  ].filter(group => group.items.length)
}

function taskMeta(item: WykonanieWithRelations) {
  const state = executionTimerState(item)
  if (state === 'done') return `${Math.round(executionElapsedMs(item) / 60_000)}m`
  if (state === 'running' || state === 'paused') {
    return item.czas_start
      ? `od ${new Date(item.czas_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
      : 'aktywna'
  }
  return `norma ${item.procedury?.norma_min ?? 0}m`
}

function completionTone(item: WykonanieWithRelations) {
  const duration = Math.round(executionElapsedMs(item) / 60_000)
  const norm = item.procedury?.norma_min ?? 0
  if (duration <= norm) return 'fast'
  if (duration <= norm + 5) return 'ok'
  return 'slow'
}

function activityTime(item: WykonanieWithRelations) {
  return new Date(item.czas_koniec ?? item.created_at).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="antica-topbar">
      <h1 class="text-base font-semibold">Dashboard</h1>
      <span class="ml-auto text-[13px] capitalize text-[#6b7280]">{{ dateLabel }}</span>
    </header>

    <main class="antica-dashboard-content">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <div class="antica-kpi-grid">
        <section class="antica-kpi">
          <div class="antica-kpi-label">Wykonanie dziś</div>
          <div class="antica-kpi-value">{{ stats.percent }}%</div>
          <div class="antica-kpi-sub">{{ stats.done }} z {{ stats.total }} procedur</div>
          <div class="antica-progress"><span :style="{ width: `${stats.percent}%` }" /></div>
        </section>
        <section class="antica-kpi">
          <div class="antica-kpi-label">Aktywne procedury</div>
          <div class="antica-kpi-value">{{ stats.active }}</div>
          <div class="antica-kpi-sub">W trakcie wykonania</div>
        </section>
        <section class="antica-kpi">
          <div class="antica-kpi-label">Stanowiska online</div>
          <div class="antica-kpi-value">
            {{ stats.online }}<span class="text-base font-normal text-[#9ca3af]">/{{ stationSummaries.length }}</span>
          </div>
          <div class="antica-kpi-sub">{{ stationSummaries.length - stats.online }} offline</div>
        </section>
        <section class="antica-kpi">
          <div class="antica-kpi-label">Do zrobienia</div>
          <div class="antica-kpi-value text-[#d97706]">{{ stats.pending }}</div>
          <div class="antica-kpi-sub">Nierozpoczęte procedury</div>
        </section>
      </div>

      <div class="antica-section-label mb-2.5 mt-6">Stanowiska — stan bieżący</div>
      <div v-if="loading" class="grid min-h-56 place-items-center">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-[#c59d5f]" />
      </div>
      <div v-else class="station-grid">
        <section v-for="station in stationSummaries" :key="station.id" class="station-card">
          <div class="station-head">
            <NuxtLink :to="`/stanowiska/${station.id}`" class="font-semibold hover:text-[#b08840]">
              {{ station.nazwa }}
            </NuxtLink>
            <span :class="{ low: station.progress < 50 }">{{ station.progress }}%</span>
          </div>
          <div class="station-progress">
            <span :class="{ low: station.progress < 50 }" :style="{ width: `${station.progress}%` }" />
          </div>
          <div class="py-2.5">
            <template v-for="group in groupedItems(station.items)" :key="group.state">
              <div class="station-section">{{ group.label }}</div>
              <div v-for="item in group.items.slice(0, 5)" :key="item.id" class="station-task">
                <i :class="`dot-${group.state}`" />
                <span class="min-w-0 flex-1 truncate">{{ item.procedury?.nazwa ?? 'Procedura' }}</span>
                <small :class="group.state === 'done' ? completionTone(item) : ''">{{ taskMeta(item) }}</small>
              </div>
            </template>
            <div v-if="!station.items.length" class="px-4 py-8 text-center text-xs text-[#9ca3af]">
              Brak procedur na dziś
            </div>
          </div>
        </section>
      </div>

      <div class="antica-section-label mb-2.5 mt-6">Ostatnia aktywność</div>
      <section class="activity-feed">
        <div v-if="!recentActivity.length" class="antica-empty">Brak ukończonych procedur.</div>
        <div v-for="item in recentActivity" :key="item.id" class="activity-row">
          <i />
          <div class="min-w-0 flex-1 text-[12.5px]">
            <strong>{{ item.stanowiska?.nazwa ?? 'Stanowisko' }}</strong>
            — {{ item.procedury?.nazwa }} ukończona w {{ Math.round(executionElapsedMs(item) / 60_000) }} min
            <span class="text-[#9ca3af]">· {{ formatPoraDnia(item.procedury?.pora_dnia) }}</span>
          </div>
          <time>{{ activityTime(item) }}</time>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.station-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.station-card,
.activity-feed {
  overflow: hidden;
  border: 1px solid var(--antica-border);
  border-radius: 10px;
  background: #fff;
}

.station-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--antica-border);
  padding: 14px 16px 10px;
  font-size: 14px;
}

.station-head > span { color: #16a34a; font-size: 13px; font-weight: 600; }
.station-head > span.low { color: #d97706; }
.station-progress { height: 3px; background: var(--antica-border); }
.station-progress span { display: block; height: 100%; background: #16a34a; }
.station-progress span.low { background: #d97706; }
.station-section {
  margin-top: 4px;
  padding: 4px 16px;
  color: var(--antica-tertiary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.station-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 16px;
  font-size: 12.5px;
}
.station-task i,
.activity-row > i { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #d1d5db; }
.station-task i.dot-running { background: #f59e0b; }
.station-task i.dot-done,
.activity-row > i { background: #22c55e; }
.station-task small { color: var(--antica-tertiary); font-size: 11px; }
.station-task small.fast { color: #2563eb; }
.station-task small.ok { color: #16a34a; }
.station-task small.slow { color: #d97706; }
.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-bottom: 1px solid var(--antica-background);
  padding: 10px 16px;
}
.activity-row:last-child { border-bottom: 0; }
.activity-row > i { margin-top: 5px; }
.activity-row time { color: var(--antica-tertiary); font-size: 11px; }

@media (max-width: 1100px) {
  .station-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
