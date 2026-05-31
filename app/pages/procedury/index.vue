<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { procedury, loading, error, fetch } = useProcedury()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const toast = useToast()

const search = ref('')
const filterStation = ref('')
const filterPeriod = ref('')

// Pobierz dane przy montowaniu
onMounted(async () => {
  await Promise.all([fetch(), fetchStanowiska()])
})

const stationOptions = computed(() => [
  { label: 'Wszystkie stanowiska', value: '' },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const periodOptions = [
  { label: 'Wszystkie pory', value: '' },
  { label: 'Rano', value: 'Rano' },
  { label: 'Dzień', value: 'Dzień' },
  { label: 'Wieczór', value: 'Wieczór' }
]

const filtered = computed(() =>
  procedury.value.filter(p => {
    const matchSearch = p.nazwa.toLowerCase().includes(search.value.toLowerCase())
    const matchStation = !filterStation.value || p.stanowisko_id === filterStation.value
    const matchPeriod = !filterPeriod.value || p.pora_dnia === filterPeriod.value
    return matchSearch && matchStation && matchPeriod
  })
)

const periodColor: Record<string, any> = {
  'Rano': 'primary',
  'Dzień': 'info',
  'Wieczór': 'violet'
}

const columns = [
  { accessorKey: 'nazwa', header: 'Procedura' },
  { accessorKey: 'stanowiska', header: 'Stanowisko' },
  { accessorKey: 'pora_dnia', header: 'Pora dnia' },
  { accessorKey: 'norma_min', header: 'Norma' },
  { accessorKey: 'aktywna', header: 'Status' },
  { id: 'actions', header: '' }
]

// Slideover szczegółów
const slideoverOpen = ref(false)
const selected = ref<any>(null)

function openDetails(row: any) {
  selected.value = row.original
  slideoverOpen.value = true
}

async function toggleActive(row: any) {
  const { update } = useProcedury()
  try {
    await update(row.id, { aktywna: !row.aktywna })
    await fetch()
    toast.add({ title: row.aktywna ? 'Procedura zarchiwizowana' : 'Procedura aktywowana', color: 'success' })
  } catch {
    toast.add({ title: 'Błąd', description: 'Nie udało się zmienić statusu', color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Procedury</span>
      <UButton color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/procedury/nowa')">
        Nowa procedura
      </UButton>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <!-- Filtry -->
      <div class="flex items-center gap-2 flex-wrap">
        <UInput v-model="search" placeholder="Szukaj procedury…" icon="i-lucide-search" size="sm" class="w-56" />
        <USelect v-model="filterStation" :options="stationOptions" option-attribute="label" value-attribute="value" size="sm" />
        <USelect v-model="filterPeriod" :options="periodOptions" option-attribute="label" value-attribute="value" size="sm" />
        <span class="ml-auto text-xs text-muted">
          {{ loading ? 'Ładowanie…' : `${filtered.length} procedur` }}
        </span>
      </div>

      <!-- Error -->
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" />

      <!-- Tabela -->
      <UTable
        :data="filtered"
        :columns="columns"
        :loading="loading"
        @select="openDetails"
        class="border border-muted rounded-xl overflow-hidden cursor-pointer"
      >
        <template #nazwa-cell="{ row }">
          <div class="font-medium">{{ row.nazwa }}</div>
          <div v-if="row.opis" class="text-xs text-muted mt-0.5 truncate max-w-xs">{{ row.opis }}</div>
        </template>
        <template #stanowiska-cell="{ row }">
          <UBadge color="primary" variant="subtle" size="sm">
            {{ row.original.stanowiska?.nazwa ?? '—' }}
          </UBadge>
        </template>
        <template #pora_dnia-cell="{ row }">
          <UBadge :color="periodColor[row.original.pora_dnia]" variant="subtle" size="sm">{{ row.original.pora_dnia }}</UBadge>
        </template>
        <template #norma_min-cell="{ row }">
          {{ row.original.norma_min }} min
        </template>
        <template #aktywna-cell="{ row }">
          <UBadge :color="row.original.aktywna ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ row.original.aktywna ? 'Aktywna' : 'Archiwum' }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" size="xs"
              @click.stop="navigateTo('/procedury/edytuj/' + row.original.id)" />
            <UButton color="neutral" variant="ghost"
              :icon="row.original.aktywna ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
              size="xs" @click.stop="toggleActive(row.original)" />
          </div>
        </template>
      </UTable>
    </div>

    <!-- Slideover szczegółów -->
    <USlideover v-model:open="slideoverOpen" side="right">
      <template #content>
        <div v-if="selected" class="p-6 flex flex-col gap-4 h-full">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">{{ selected.nazwa }}</h2>
              <p class="text-sm text-muted mt-1">{{ selected.stanowiska?.nazwa }}</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" size="sm" @click="slideoverOpen = false" />
          </div>
          <USeparator />
          <div v-if="selected.opis" class="text-sm text-muted">{{ selected.opis }}</div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div class="text-muted text-xs mb-1">Pora dnia</div>
              <UBadge :color="periodColor[selected.pora_dnia]" variant="subtle">{{ selected.pora_dnia }}</UBadge>
            </div>
            <div>
              <div class="text-muted text-xs mb-1">Norma czasu</div>
              <div class="font-medium">{{ selected.norma_min }} min</div>
            </div>
            <div>
              <div class="text-muted text-xs mb-1">Status</div>
              <UBadge :color="selected.aktywna ? 'success' : 'neutral'" variant="subtle">
                {{ selected.aktywna ? 'Aktywna' : 'Archiwum' }}
              </UBadge>
            </div>
          </div>
          <USeparator />
          <div class="flex gap-2 mt-auto">
            <UButton color="primary" class="flex-1 justify-center"
              @click="navigateTo('/procedury/edytuj/' + selected.id); slideoverOpen = false">
              Edytuj procedurę
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
