<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { wykonania, loading, error, fetchDzien } = useWykonania()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const filterStation = ref('')

onMounted(async () => {
  await fetchStanowiska()
  await fetchDzien(selectedDate.value)
})

watch(selectedDate, (val) => fetchDzien(val))

const stationOptions = computed(() => [
  { label: 'Wszystkie stanowiska', value: '' },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const filtered = computed(() =>
  wykonania.value.filter(w =>
    !filterStation.value || w.stanowisko_id === filterStation.value
  )
)

const tabs = [
  { label: 'Przegląd dzienny', to: '/raporty' },
  { label: 'Tabela zbiorcza', to: '/raporty/tabela' }
]

const statusColor: Record<string, any> = {
  do_zrobienia: 'neutral',
  w_trakcie: 'primary',
  wykonane: 'success',
  odrzucone: 'error'
}

const statusLabel: Record<string, string> = {
  do_zrobienia: 'Do zrobienia',
  w_trakcie: 'W trakcie',
  wykonane: 'Wykonane',
  odrzucone: 'Odrzucone'
}

const poraBadge: Record<string, any> = {
  Rano: 'primary',
  'Dzień': 'info',
  Wieczór: 'violet'
}

function odchylenie(w: any): string {
  if (!w.czas_start || !w.czas_koniec) return '—'
  const start = new Date(w.czas_start)
  const koniec = new Date(w.czas_koniec)
  const min = Math.round((koniec.getTime() - start.getTime()) / 60000)
  const diff = min - (w.procedury?.norma_min ?? 0)
  if (diff === 0) return '±0 min'
  return diff > 0 ? `+${diff} min` : `${diff} min`
}

function odchylenieClass(w: any): string {
  if (!w.czas_start || !w.czas_koniec) return 'text-muted'
  const start = new Date(w.czas_start)
  const koniec = new Date(w.czas_koniec)
  const min = Math.round((koniec.getTime() - start.getTime()) / 60000)
  const diff = min - (w.procedury?.norma_min ?? 0)
  if (diff <= 0) return 'text-success font-medium'
  if (diff <= 5) return 'text-warning font-medium'
  return 'text-error font-medium'
}

function czasTrwania(w: any): string {
  if (!w.czas_start || !w.czas_koniec) return '—'
  const start = new Date(w.czas_start)
  const koniec = new Date(w.czas_koniec)
  return Math.round((koniec.getTime() - start.getTime()) / 60000) + ' min'
}

const columns = [
  { accessorKey: 'procedury', header: 'Procedura' },
  { accessorKey: 'stanowiska', header: 'Stanowisko' },
  { accessorKey: 'pora_dnia', header: 'Pora' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'czas_start', header: 'Start' },
  { accessorKey: 'czas_trwania', header: 'Czas' },
  { accessorKey: 'odchylenie', header: 'Odchylenie' },
  { accessorKey: 'uwagi', header: 'Uwagi' }
]

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
          v-for="tab in tabs"
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

      <!-- Filtry -->
      <div class="flex items-center gap-3 flex-wrap">
        <UInput v-model="selectedDate" type="date" size="sm" icon="i-lucide-calendar" class="w-44" />
        <USelect
          v-model="filterStation"
          :options="stationOptions"
          option-attribute="label"
          value-attribute="value"
          size="sm"
        />
        <span class="ml-auto text-xs text-muted">{{ filtered.length }} wykonań</span>
      </div>

      <!-- Podsumowanie KPI -->
      <div class="grid grid-cols-4 gap-3">
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
      <div class="border border-muted rounded-xl overflow-hidden">
        <div v-if="loading" class="p-8 flex justify-center">
          <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
        </div>

        <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-muted">
          Brak danych dla wybranego dnia
        </div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-muted bg-elevated">
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
                <UBadge :color="poraBadge[w.procedury?.pora_dnia] ?? 'neutral'" variant="subtle" size="sm">
                  {{ w.procedury?.pora_dnia ?? '—' }}
                </UBadge>
              </td>
              <td class="px-4 py-2.5">
                <UBadge :color="statusColor[w.status]" variant="subtle" size="sm">
                  {{ statusLabel[w.status] ?? w.status }}
                </UBadge>
              </td>
              <td class="px-4 py-2.5 text-muted text-xs">
                {{ w.czas_start ? new Date(w.czas_start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—' }}
              </td>
              <td class="px-4 py-2.5 text-right text-xs">{{ czasTrwania(w) }}</td>
              <td class="px-4 py-2.5 text-right text-xs text-muted">{{ w.procedury?.norma_min ?? '—' }} min</td>
              <td class="px-4 py-2.5 text-right text-xs" :class="odchylenieClass(w)">{{ odchylenie(w) }}</td>
              <td class="px-4 py-2.5 text-xs text-muted max-w-[160px] truncate">{{ w.uwagi ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
