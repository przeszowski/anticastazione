<script setup lang="ts">
import type { WykonanieWithRelations } from '~/composables/useSupabase'
import { localDateInput } from '~/utils/date'
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

const selectedDate = ref(localDateInput())
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
  const finished = filtered.value.filter(w => w.status === 'wykonane')
  const sumaCzas = finished.reduce((sum, w) => sum + (durationMinutes(w) ?? 0), 0)
  const sumaNorma = finished.reduce((sum, w) => sum + (w.procedury?.norma_min ?? 0), 0)
  const odchylenieTotal = sumaCzas - sumaNorma

  return { total, done, running, todo, odrzucone, sumaCzas, sumaNorma, odchylenieTotal }
})
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="antica-topbar">
      <UIcon name="i-lucide-bar-chart-2" class="size-4 text-[#6b7280]" />
      <span class="antica-topbar-title">Raporty</span>
    </div>

    <div class="antica-content flex flex-col gap-4">
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
      <div class="antica-kpi-grid">
        <div class="antica-kpi">
          <div class="antica-kpi-label">Wykonane</div>
          <div class="antica-kpi-value text-success">{{ stats.done }}</div>
          <div class="antica-kpi-sub">z {{ stats.total }} łącznie</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">W trakcie</div>
          <div class="antica-kpi-value text-[#b08840]">{{ stats.running }}</div>
          <div class="antica-kpi-sub">aktualnie</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">Sumaryczny czas</div>
          <div class="antica-kpi-value">{{ stats.sumaCzas }} min</div>
          <div class="antica-kpi-sub">norma: {{ stats.sumaNorma }} min</div>
        </div>
        <div class="antica-kpi">
          <div class="antica-kpi-label">Odchylenie łączne</div>
          <div
            class="antica-kpi-value"
            :class="stats.odchylenieTotal <= 0 ? 'text-success' : stats.odchylenieTotal <= 15 ? 'text-warning' : 'text-error'"
          >
            {{ stats.odchylenieTotal > 0 ? '+' : '' }}{{ stats.odchylenieTotal }} min
          </div>
          <div class="antica-kpi-sub">vs norma</div>
        </div>
      </div>

      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" />

      <!-- Tabela -->
      <div class="antica-table-frame">
        <div v-if="loading" class="p-8 flex justify-center">
          <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
        </div>

        <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-muted">
          Brak danych spełniających filtry
        </div>

        <table v-else class="antica-table min-w-[1480px]">
          <thead>
            <tr>
              <th>Procedura</th>
              <th>Stanowisko</th>
              <th>Pora</th>
              <th>Status</th>
              <th>Start</th>
              <th class="text-right">Czas</th>
              <th class="text-right">Norma</th>
              <th class="text-right">Odchylenie</th>
              <th>Uwagi</th>
            </tr>
            <tr class="antica-filter-row">
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
              class="border-b border-[#e5e7eb] transition-colors last:border-0 hover:bg-[#f9fafb]"
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
