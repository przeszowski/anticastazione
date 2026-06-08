<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import { executionElapsedMs, executionNote, executionTimerState } from '~/utils/executionTimer'
import {
  ALL_SELECT_VALUE,
  badgePoryDnia,
  formatPoraDnia,
  poraDniaOptions,
  raportTabs,
  statusWykonaniaBadge,
  statusWykonaniaLabel
} from '~/utils/procedureMeta'
import { matchesNumberRange, matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { wykonania, loading, error, fetchDzien } = useWykonania()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const filterStation = ref(ALL_SELECT_VALUE)
const filterProcedure = ref('')
const filterPeriod = ref(ALL_SELECT_VALUE)
const filterStatus = ref(ALL_SELECT_VALUE)
const filterStart = ref('')
const filterDurationMin = ref<number | null>(null)
const filterDurationMax = ref<number | null>(null)
const filterNormMin = ref<number | null>(null)
const filterNormMax = ref<number | null>(null)
const filterDeviationMin = ref<number | null>(null)
const filterDeviationMax = ref<number | null>(null)
const filterNote = ref('')

onMounted(async () => {
  await fetchStanowiska()
  await fetchDzien(selectedDate.value)
})

watch([selectedDate, filterStation], ([date, station]) => fetchDzien(date, station === ALL_SELECT_VALUE ? undefined : station))

const stationOptions = computed(() => [
  { label: 'Wszystkie stanowiska', value: ALL_SELECT_VALUE },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])
const periodOptions = [{ label: 'Wszystkie pory', value: ALL_SELECT_VALUE }, ...poraDniaOptions]
const statusOptions = [
  { label: 'Wszystkie statusy', value: ALL_SELECT_VALUE },
  { label: 'Do zrobienia', value: 'do_zrobienia' },
  { label: 'W trakcie', value: 'w_trakcie' },
  { label: 'Wstrzymane', value: 'paused' },
  { label: 'Wykonane', value: 'wykonane' },
  { label: 'Odrzucone', value: 'odrzucone' }
]

function durationMinutes(w: WykonanieWithRelations) {
  return w.status === 'wykonane' ? Math.round(executionElapsedMs(w) / 60_000) : null
}

function deviationMinutes(w: WykonanieWithRelations) {
  const duration = durationMinutes(w)
  return duration == null ? null : duration - (w.procedury?.norma_min ?? 0)
}

function startTime(w: WykonanieWithRelations) {
  return w.czas_start
    ? new Date(w.czas_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : ''
}

function statusFilterValue(w: WykonanieWithRelations) {
  return executionTimerState(w) === 'paused' ? 'paused' : w.status
}

const filtered = computed(() => wykonania.value.filter(w =>
  matchesText(w.procedury?.nazwa, filterProcedure.value)
  && matchesOption(w.procedury?.pora_dnia, filterPeriod.value)
  && matchesOption(statusFilterValue(w), filterStatus.value)
  && (!filterStart.value || startTime(w) === filterStart.value)
  && matchesNumberRange(durationMinutes(w), filterDurationMin.value, filterDurationMax.value)
  && matchesNumberRange(w.procedury?.norma_min, filterNormMin.value, filterNormMax.value)
  && matchesNumberRange(deviationMinutes(w), filterDeviationMin.value, filterDeviationMax.value)
  && matchesText(executionNote(w), filterNote.value)
))

const hasFilters = computed(() =>
  filterStation.value !== ALL_SELECT_VALUE
  || filterPeriod.value !== ALL_SELECT_VALUE
  || filterStatus.value !== ALL_SELECT_VALUE
  || Boolean(filterProcedure.value.trim() || filterStart.value || filterNote.value.trim())
  || [
    filterDurationMin.value,
    filterDurationMax.value,
    filterNormMin.value,
    filterNormMax.value,
    filterDeviationMin.value,
    filterDeviationMax.value
  ].some(value => value != null)
)

function resetFilters() {
  filterStation.value = ALL_SELECT_VALUE
  filterProcedure.value = ''
  filterPeriod.value = ALL_SELECT_VALUE
  filterStatus.value = ALL_SELECT_VALUE
  filterStart.value = ''
  filterDurationMin.value = null
  filterDurationMax.value = null
  filterNormMin.value = null
  filterNormMax.value = null
  filterDeviationMin.value = null
  filterDeviationMax.value = null
  filterNote.value = ''
}

function odchylenie(w: WykonanieWithRelations): string {
  const diff = deviationMinutes(w)
  if (diff == null) return '—'
  if (diff === 0) return '±0 min'
  return diff > 0 ? `+${diff} min` : `${diff} min`
}

function odchylenieClass(w: WykonanieWithRelations): string {
  const diff = deviationMinutes(w)
  if (diff == null) return 'text-muted'
  if (diff <= 0) return 'text-success font-medium'
  if (diff <= 5) return 'text-warning font-medium'
  return 'text-error font-medium'
}

function czasTrwania(w: WykonanieWithRelations): string {
  const duration = durationMinutes(w)
  return duration == null ? '—' : `${duration} min`
}

function statusLabel(w: WykonanieWithRelations) {
  return executionTimerState(w) === 'paused' ? 'Wstrzymane' : statusWykonaniaLabel[w.status]
}

function statusColor(w: WykonanieWithRelations) {
  return executionTimerState(w) === 'paused' ? 'warning' : statusWykonaniaBadge[w.status]
}

// Statystyki podsumowujące
const stats = computed(() => {
  const total = filtered.value.length
  const done = filtered.value.filter(w => w.status === 'wykonane').length
  const running = filtered.value.filter(w => w.status === 'w_trakcie').length
  const todo = filtered.value.filter(w => w.status === 'do_zrobienia').length
  const odrzucone = filtered.value.filter(w => w.status === 'odrzucone').length

  const czasy = filtered.value
    .filter(w => w.czas_start && w.czas_koniec)
    .map(w => {
      if (!w.czas_start || !w.czas_koniec) return 0
      const start = new Date(w.czas_start)
      const koniec = new Date(w.czas_koniec)
      return Math.round((koniec.getTime() - start.getTime()) / 60000)
    })

  const normy = filtered.value
    .filter(w => w.czas_start && w.czas_koniec)
    .map(w => w.procedury?.norma_min ?? 0)

  const sumaCzas = czasy.reduce((a, b) => a + b, 0)
  const sumaNorma = normy.reduce((a, b) => a + b, 0)
  const odchylenieTotal = sumaCzas - sumaNorma

  return { total, done, running, todo, odrzucone, sumaCzas, sumaNorma, odchylenieTotal }
})
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-2 bg-default sticky top-0 z-10">
      <UIcon name="i-lucide-bar-chart-2" class="w-4 h-4 text-muted" />
      <span class="text-sm font-semibold">Raporty</span>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <!-- Sub-tabs -->
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
        <span class="ml-auto text-xs text-muted">{{ filtered.length }} z {{ wykonania.length }} wykonań</span>
        <UButton
          v-if="hasFilters"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-filter-x"
          @click="resetFilters"
        >
          Wyczyść
        </UButton>
      </div>

      <!-- Podsumowanie KPI -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Wykonane</div>
          <div class="text-2xl font-semibold text-success">{{ stats.done }}</div>
          <div class="text-xs text-muted mt-0.5">z {{ stats.total }} łącznie</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">W trakcie</div>
          <div class="text-2xl font-semibold text-primary">{{ stats.running }}</div>
          <div class="text-xs text-muted mt-0.5">aktualnie</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Sumaryczny czas</div>
          <div class="text-2xl font-semibold">{{ stats.sumaCzas }} min</div>
          <div class="text-xs text-muted mt-0.5">norma: {{ stats.sumaNorma }} min</div>
        </div>
        <div class="bg-elevated border border-muted rounded-xl p-4">
          <div class="text-xs text-muted mb-1">Odchylenie łączne</div>
          <div
            class="text-2xl font-semibold"
            :class="stats.odchylenieTotal <= 0 ? 'text-success' : stats.odchylenieTotal <= 15 ? 'text-warning' : 'text-error'"
          >
            {{ stats.odchylenieTotal > 0 ? '+' : '' }}{{ stats.odchylenieTotal }} min
          </div>
          <div class="text-xs text-muted mt-0.5">vs norma</div>
        </div>
      </div>

      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" />

      <!-- Tabela -->
      <div class="border border-muted rounded-xl overflow-x-auto">
        <div v-if="loading" class="p-8 flex justify-center">
          <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
        </div>

        <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-muted">
          Brak danych spełniających filtry
        </div>

        <table v-else class="w-full min-w-[1480px] text-sm">
          <thead>
            <tr class="bg-elevated">
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Procedura</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Stanowisko</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Pora</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Status</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Start</th>
              <th class="text-right px-4 py-2.5 text-xs font-medium text-muted">Czas</th>
              <th class="text-right px-4 py-2.5 text-xs font-medium text-muted">Norma</th>
              <th class="text-right px-4 py-2.5 text-xs font-medium text-muted">Odchylenie</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-muted">Uwagi</th>
            </tr>
            <tr class="border-b border-muted bg-elevated">
              <th class="px-2 pb-2 text-left">
                <UInput v-model="filterProcedure" placeholder="Szukaj..." icon="i-lucide-search" size="xs" class="w-48" />
              </th>
              <th class="px-2 pb-2 text-left">
                <USelect v-model="filterStation" :items="stationOptions" value-key="value" size="xs" class="w-44" />
              </th>
              <th class="px-2 pb-2 text-left">
                <USelect v-model="filterPeriod" :items="periodOptions" value-key="value" size="xs" class="w-36" />
              </th>
              <th class="px-2 pb-2 text-left">
                <USelect v-model="filterStatus" :items="statusOptions" value-key="value" size="xs" class="w-40" />
              </th>
              <th class="px-2 pb-2 text-left">
                <UInput v-model="filterStart" type="time" size="xs" class="w-28" />
              </th>
              <th class="px-2 pb-2">
                <div class="flex justify-end gap-1">
                  <UInput v-model.number="filterDurationMin" type="number" placeholder="Od" size="xs" class="w-20" />
                  <UInput v-model.number="filterDurationMax" type="number" placeholder="Do" size="xs" class="w-20" />
                </div>
              </th>
              <th class="px-2 pb-2">
                <div class="flex justify-end gap-1">
                  <UInput v-model.number="filterNormMin" type="number" placeholder="Od" size="xs" class="w-20" />
                  <UInput v-model.number="filterNormMax" type="number" placeholder="Do" size="xs" class="w-20" />
                </div>
              </th>
              <th class="px-2 pb-2">
                <div class="flex justify-end gap-1">
                  <UInput v-model.number="filterDeviationMin" type="number" placeholder="Od" size="xs" class="w-20" />
                  <UInput v-model.number="filterDeviationMax" type="number" placeholder="Do" size="xs" class="w-20" />
                </div>
              </th>
              <th class="px-2 pb-2 text-left">
                <UInput v-model="filterNote" placeholder="Szukaj..." size="xs" class="w-40" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="w in filtered"
              :key="w.id"
              class="border-b border-muted last:border-0 hover:bg-elevated/50 transition-colors"
            >
              <td class="px-4 py-2.5 font-medium">{{ w.procedury?.nazwa ?? '—' }}</td>
              <td class="px-4 py-2.5 text-muted">{{ w.stanowiska?.nazwa ?? '—' }}</td>
              <td class="px-4 py-2.5">
                <UBadge :color="badgePoryDnia(w.procedury?.pora_dnia)" variant="subtle" size="sm">
                  {{ formatPoraDnia(w.procedury?.pora_dnia) }}
                </UBadge>
              </td>
              <td class="px-4 py-2.5">
                <UBadge :color="statusColor(w)" variant="subtle" size="sm">
                  {{ statusLabel(w) }}
                </UBadge>
              </td>
              <td class="px-4 py-2.5 text-muted text-xs">
                {{ startTime(w) || '—' }}
              </td>
              <td class="px-4 py-2.5 text-right text-xs">{{ czasTrwania(w) }}</td>
              <td class="px-4 py-2.5 text-right text-xs text-muted">{{ w.procedury?.norma_min ?? '—' }} min</td>
              <td class="px-4 py-2.5 text-right text-xs" :class="odchylenieClass(w)">{{ odchylenie(w) }}</td>
              <td class="px-4 py-2.5 text-xs text-muted max-w-[160px] truncate">{{ executionNote(w) ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
