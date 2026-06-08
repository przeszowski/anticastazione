<script setup lang="ts">
import type { StatusWykonania } from '~/types/database.types'
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import { executionElapsedMs } from '~/utils/executionTimer'
import {
  ALL_SELECT_VALUE,
  badgePoryDnia,
  formatPoraDnia,
  raportTabs,
  statusWykonaniaGroupClass,
  statusWykonaniaLabel
} from '~/utils/procedureMeta'

definePageMeta({ layout: 'default' })

const { wykonania, loading, error, fetchDzien } = useWykonania()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const filterStation = ref(ALL_SELECT_VALUE)

onMounted(async () => {
  await fetchStanowiska()
  await fetchDzien(selectedDate.value)
})

watch([selectedDate, filterStation], async ([date, station]) => {
  await fetchDzien(date, station === ALL_SELECT_VALUE ? undefined : station)
})

const stationOptions = computed(() => [
  { label: 'Wszystkie stanowiska', value: ALL_SELECT_VALUE },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const filtered = computed(() => wykonania.value)

const stats = computed(() => {
  const total = filtered.value.length
  const done = filtered.value.filter(w => w.status === 'wykonane').length
  const running = filtered.value.filter(w => w.status === 'w_trakcie').length
  const todo = filtered.value.filter(w => w.status === 'do_zrobienia').length
  const percent = total ? Math.round((done / total) * 100) : 0
  const time = filtered.value.reduce((sum, w) =>
    sum + (w.status === 'wykonane' ? Math.round(executionElapsedMs(w) / 60_000) : 0), 0)
  const norm = filtered.value.reduce((sum, w) => sum + (w.procedury?.norma_min ?? 0), 0)
  return { total, done, running, todo, percent, time, norm, diff: time - norm }
})

const groups = computed(() =>
  (['w_trakcie', 'do_zrobienia', 'wykonane', 'odrzucone'] as StatusWykonania[])
    .map(status => ({
      status,
      label: statusWykonaniaLabel[status],
      items: filtered.value.filter(w => w.status === status)
    }))
    .filter(group => group.items.length > 0)
)

const dateLabel = computed(() =>
  new Date(selectedDate.value + 'T00:00:00').toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
)

function czasLabel(w: WykonanieWithRelations) {
  if (w.status !== 'wykonane') return '—'
  return `${Math.round(executionElapsedMs(w) / 60_000)} min`
}

function startLabel(w: WykonanieWithRelations) {
  return w.czas_start
    ? new Date(w.czas_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '—'
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="antica-topbar">
      <UIcon name="i-lucide-bar-chart-2" class="size-4 text-[#6b7280]" />
      <span class="antica-topbar-title">Raporty</span>
    </div>

    <div class="antica-content flex flex-col gap-4">
      <div class="flex border-b border-muted gap-4">
        <NuxtLink
          v-for="tab in raportTabs"
          :key="tab.to"
          :to="tab.to"
          class="pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="$route.path === tab.to
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-default'"
        >
          {{ tab.label }}
        </NuxtLink>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <UInput v-model="selectedDate" type="date" size="sm" icon="i-lucide-calendar" class="w-44" />
        <USelect v-model="filterStation" :items="stationOptions" value-key="value" size="sm" class="w-52" />
        <span class="ml-auto text-xs text-muted capitalize">{{ dateLabel }}</span>
      </div>

      <div class="antica-kpi-grid">
        <div class="antica-kpi">
          <div class="antica-kpi-label">Procedur dziś</div>
          <div class="antica-kpi-value">{{ stats.total }}</div>
          <div class="antica-kpi-sub">{{ stats.running }} w trakcie</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">Realizacja</div>
          <div class="antica-kpi-value text-[#b08840]">{{ stats.percent }}%</div>
          <div class="antica-kpi-sub">{{ stats.done }} wykonane</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">Odchylenie od normy</div>
          <div class="antica-kpi-value" :class="stats.diff <= 0 ? 'text-success' : 'text-warning'">
            {{ stats.diff > 0 ? '+' : '' }}{{ stats.diff }}m
          </div>
          <div class="antica-kpi-sub">{{ stats.time }}m / {{ stats.norm }}m</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">Do zrobienia</div>
          <div class="antica-kpi-value">{{ stats.todo }}</div>
          <div class="antica-kpi-sub">pozostałe zadania</div>
        </div>
      </div>

      <div class="rounded-[10px] border border-[#e5e7eb] bg-white p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Postęp dnia</span>
          <span class="text-xs text-muted">{{ stats.done }}/{{ stats.total }} procedur</span>
        </div>
        <div class="h-2.5 rounded-full bg-muted/30 overflow-hidden">
          <div class="h-full bg-success transition-all" :style="{ width: stats.percent + '%' }" />
        </div>
      </div>

      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" />

      <div v-if="loading" class="p-8 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
      </div>

      <div v-else-if="filtered.length === 0" class="antica-empty rounded-[10px] border border-[#e5e7eb] bg-white">
        Brak danych dla wybranego dnia.
      </div>

      <div v-else class="flex flex-col gap-4">
        <div v-for="group in groups" :key="group.status">
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wide mb-2"
            :class="statusWykonaniaGroupClass[group.status]"
          >
            {{ group.label }}
            <span class="font-normal normal-case tracking-normal ml-1">({{ group.items.length }})</span>
          </div>

          <div
            v-for="item in group.items"
            :key="item.id"
            class="mb-1.5 flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 transition-colors hover:bg-[#f9fafb]"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ item.procedury?.nazwa ?? '—' }}</div>
              <div class="text-xs text-muted mt-0.5">{{ item.stanowiska?.nazwa ?? '—' }}</div>
            </div>
            <UBadge :color="badgePoryDnia(item.procedury?.pora_dnia)" variant="subtle" size="sm">
              {{ formatPoraDnia(item.procedury?.pora_dnia) }}
            </UBadge>
            <div class="text-xs text-muted w-12 text-right">{{ startLabel(item) }}</div>
            <div class="text-xs w-16 text-right">{{ czasLabel(item) }}</div>
            <div class="text-xs text-muted w-14 text-right">n: {{ item.procedury?.norma_min ?? '—' }}m</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
