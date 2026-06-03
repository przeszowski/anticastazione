<script setup lang="ts">
import type { StatusWykonania } from '~/types/database.types'
import type { WykonanieWithRelations } from '~/composables/useSupabase'
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
  const time = filtered.value.reduce((sum, w) => sum + (w.czas_min ?? czasMin(w) ?? 0), 0)
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

function czasMin(w: WykonanieWithRelations) {
  if (!w.czas_start || !w.czas_koniec) return null
  const start = new Date(w.czas_start).getTime()
  const end = new Date(w.czas_koniec).getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}

function czasLabel(w: WykonanieWithRelations) {
  const minutes = w.czas_min ?? czasMin(w)
  return minutes == null ? '—' : `${minutes} min`
}

function startLabel(w: WykonanieWithRelations) {
  return w.czas_start
    ? new Date(w.czas_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '—'
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-2 bg-default sticky top-0 z-10">
      <UIcon name="i-lucide-bar-chart-2" class="w-4 h-4 text-muted" />
      <span class="text-sm font-semibold">Raporty</span>
    </div>

    <div class="p-5 flex flex-col gap-4">
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

      <div class="grid grid-cols-4 gap-3">
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Procedur dziś</div>
          <div class="text-2xl font-semibold">{{ stats.total }}</div>
          <div class="text-xs text-muted mt-0.5">{{ stats.running }} w trakcie</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Realizacja</div>
          <div class="text-2xl font-semibold text-primary">{{ stats.percent }}%</div>
          <div class="text-xs text-muted mt-0.5">{{ stats.done }} wykonane</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Odchylenie od normy</div>
          <div class="text-2xl font-semibold" :class="stats.diff <= 0 ? 'text-success' : 'text-warning'">
            {{ stats.diff > 0 ? '+' : '' }}{{ stats.diff }}m
          </div>
          <div class="text-xs text-muted mt-0.5">{{ stats.time }}m / {{ stats.norm }}m</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Do zrobienia</div>
          <div class="text-2xl font-semibold">{{ stats.todo }}</div>
          <div class="text-xs text-muted mt-0.5">pozostałe zadania</div>
        </div>
      </div>

      <div class="bg-elevated border border-muted rounded-xl p-4">
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

      <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-muted border border-muted rounded-xl">
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
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-muted bg-default mb-1.5 hover:bg-elevated transition-colors"
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
