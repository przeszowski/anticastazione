<script setup lang="ts">
definePageMeta({ layout: 'default' })

const search = ref('')
const filterStation = ref('Wszystkie')
const filterPeriod = ref('Wszystkie')

// Mock data
const procedures = ref([
  { id: 1, name: 'Otwieranie kuchni — przygotowanie stanowiska', station: 'Kuchnia', period: 'Rano', norm: '25 min', active: true },
  { id: 2, name: 'Kontrola temperatur urządzeń chłodniczych', station: 'Kuchnia', period: 'Rano', norm: '15 min', active: true },
  { id: 3, name: 'Przygotowanie mise en place na lunch', station: 'Kuchnia', period: 'Rano', norm: '40 min', active: true },
  { id: 4, name: 'Dezynfekcja powierzchni roboczych', station: 'Kuchnia', period: 'Dzień', norm: '20 min', active: true },
  { id: 5, name: 'Uzupełnienie stanów magazynowych', station: 'Bar', period: 'Dzień', norm: '30 min', active: true },
  { id: 6, name: 'Przygotowanie mise en place na kolację', station: 'Sala', period: 'Dzień', norm: '35 min', active: true },
  { id: 7, name: 'Porządkowanie i mycie urządzeń kuchennych', station: 'Kuchnia', period: 'Wieczór', norm: '45 min', active: true },
  { id: 8, name: 'Zamknięcie kuchni — checklist końcowy', station: 'Kuchnia', period: 'Wieczór', norm: '20 min', active: false }
])

const filtered = computed(() =>
  procedures.value.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.value.toLowerCase())
    const matchStation = filterStation.value === 'Wszystkie' || p.station === filterStation.value
    const matchPeriod = filterPeriod.value === 'Wszystkie' || p.period === filterPeriod.value
    return matchSearch && matchStation && matchPeriod
  })
)

const stationOptions = ['Wszystkie', 'Kuchnia', 'Bar', 'Sala', 'Obsługa gości']
const periodOptions = ['Wszystkie', 'Rano', 'Dzień', 'Wieczór']

const periodColor: Record<string, any> = { Rano: 'primary', Dzień: 'info', Wieczór: 'violet' }

const columns = [
  { key: 'name', label: 'Procedura' },
  { key: 'station', label: 'Stanowisko' },
  { key: 'period', label: 'Pora dnia' },
  { key: 'norm', label: 'Norma' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' }
]

const slideoverOpen = ref(false)
const selected = ref<typeof procedures.value[0] | null>(null)

function openDetails(row: typeof procedures.value[0]) {
  selected.value = row
  slideoverOpen.value = true
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <!-- Topbar -->
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Procedury</span>
      <UButton color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/procedury/nowa')">
        Nowa procedura
      </UButton>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <!-- Filters -->
      <div class="flex items-center gap-2 flex-wrap">
        <UInput v-model="search" placeholder="Szukaj procedury…" icon="i-lucide-search" size="sm" class="w-56" />
        <USelect v-model="filterStation" :options="stationOptions" size="sm" />
        <USelect v-model="filterPeriod" :options="periodOptions" size="sm" />
        <span class="ml-auto text-xs text-muted">{{ filtered.length }} procedur</span>
      </div>

      <!-- Table -->
      <UTable
        :rows="filtered"
        :columns="columns"
        @select="openDetails"
        class="border border-muted rounded-xl overflow-hidden"
      >
        <template #period-data="{ row }">
          <UBadge :color="periodColor[row.period]" variant="subtle" size="sm">{{ row.period }}</UBadge>
        </template>
        <template #active-data="{ row }">
          <UBadge :color="row.active ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ row.active ? 'Aktywna' : 'Archiwum' }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex justify-end gap-1">
            <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" size="xs" @click.stop="navigateTo('/procedury/edytuj/' + row.id)" />
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" size="xs" @click.stop />
          </div>
        </template>
      </UTable>
    </div>

    <!-- Slideover: szczegóły procedury -->
    <USlideover v-model:open="slideoverOpen" side="right" class="w-[480px]">
      <template #content>
        <div v-if="selected" class="p-6 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">{{ selected.name }}</h2>
              <p class="text-sm text-muted mt-1">{{ selected.station }}</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" size="sm" @click="slideoverOpen = false" />
          </div>
          <USeparator />
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-muted text-xs mb-1">Pora dnia</div>
              <UBadge :color="periodColor[selected.period]" variant="subtle">{{ selected.period }}</UBadge>
            </div>
            <div>
              <div class="text-muted text-xs mb-1">Norma czasu</div>
              <div class="font-medium">{{ selected.norm }}</div>
            </div>
            <div>
              <div class="text-muted text-xs mb-1">Status</div>
              <UBadge :color="selected.active ? 'success' : 'neutral'" variant="subtle">
                {{ selected.active ? 'Aktywna' : 'Archiwum' }}
              </UBadge>
            </div>
          </div>
          <USeparator />
          <div class="flex gap-2 mt-auto pt-2">
            <UButton color="primary" class="flex-1 justify-center" @click="navigateTo('/raporty')">
              Przejdź do raportów
            </UButton>
            <UButton color="neutral" variant="outline" class="flex-1 justify-center" @click="slideoverOpen = false">
              Zamknij
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
