<script setup lang="ts">
import { ALL_SELECT_VALUE, badgePoryDnia, formatPoraDnia, poraDniaOptions } from '~/utils/procedureMeta'
import { matchesNumberRange, matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { procedury, loading, error, fetch } = useProcedury()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { can } = useAuth()
const toast = useToast()

const search = ref('')
const filterStation = ref(ALL_SELECT_VALUE)
const filterPeriod = ref(ALL_SELECT_VALUE)
const filterStatus = ref(ALL_SELECT_VALUE)
const filterNormMin = ref<number | null>(null)
const filterNormMax = ref<number | null>(null)

// Pobierz dane przy montowaniu
onMounted(async () => {
  await Promise.all([fetch(), fetchStanowiska()])
})

const stationOptions = computed(() => [
  { label: 'Wszystkie stanowiska', value: ALL_SELECT_VALUE },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const periodOptions = [{ label: 'Wszystkie pory', value: ALL_SELECT_VALUE }, ...poraDniaOptions]
const statusOptions = [
  { label: 'Wszystkie statusy', value: ALL_SELECT_VALUE },
  { label: 'Aktywne', value: 'active' },
  { label: 'Archiwum', value: 'archive' }
]

const filtered = computed(() =>
  procedury.value.filter(p => {
    const status = p.aktywna ? 'active' : 'archive'
    return matchesText(`${p.nazwa} ${p.opis ?? ''}`, search.value)
      && matchesOption(p.stanowisko_id, filterStation.value)
      && matchesOption(p.pora_dnia, filterPeriod.value)
      && matchesOption(status, filterStatus.value)
      && matchesNumberRange(p.norma_min, filterNormMin.value, filterNormMax.value)
  })
)

const hasFilters = computed(() =>
  Boolean(search.value.trim())
  || filterStation.value !== ALL_SELECT_VALUE
  || filterPeriod.value !== ALL_SELECT_VALUE
  || filterStatus.value !== ALL_SELECT_VALUE
  || filterNormMin.value != null
  || filterNormMax.value != null
)

function resetFilters() {
  search.value = ''
  filterStation.value = ALL_SELECT_VALUE
  filterPeriod.value = ALL_SELECT_VALUE
  filterStatus.value = ALL_SELECT_VALUE
  filterNormMin.value = null
  filterNormMax.value = null
}

const columns = [
  { accessorKey: 'nazwa', header: 'Procedura' },
  { accessorKey: 'stanowiska', header: 'Stanowisko' },
  { accessorKey: 'pora_dnia', header: 'Pora dnia' },
  { accessorKey: 'norma_min', header: 'Norma' },
  { accessorKey: 'aktywna', header: 'Status' },
  { id: 'actions', header: '' }
]
const canCreate = computed(() => can('procedury:create'))
const canUpdate = computed(() => can('procedury:update'))

// Slideover szczegółów
const slideoverOpen = ref(false)
const selected = ref<any>(null)

function openDetails(row: any) {
  selected.value = row.original
  slideoverOpen.value = true
}

async function toggleActive(row: any) {
  if (!canUpdate.value) return
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
      <UButton v-if="canCreate" color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/procedury/nowa')">
        Nowa procedura
      </UButton>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <span class="ml-auto text-xs text-muted">
          {{ loading ? 'Ładowanie...' : `${filtered.length} z ${procedury.length} procedur` }}
        </span>
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
        <template #nazwa-header>
          <TableFilterHeader label="Procedura">
            <UInput v-model="search" placeholder="Szukaj..." icon="i-lucide-search" size="xs" class="w-52" />
          </TableFilterHeader>
        </template>
        <template #stanowiska-header>
          <TableFilterHeader label="Stanowisko">
            <USelect v-model="filterStation" :items="stationOptions" value-key="value" size="xs" class="w-44" />
          </TableFilterHeader>
        </template>
        <template #pora_dnia-header>
          <TableFilterHeader label="Pora dnia">
            <USelect v-model="filterPeriod" :items="periodOptions" value-key="value" size="xs" class="w-40" />
          </TableFilterHeader>
        </template>
        <template #norma_min-header>
          <TableFilterHeader label="Norma" align="right">
            <div class="grid w-36 grid-cols-2 gap-1">
              <UInput v-model.number="filterNormMin" type="number" placeholder="Od" size="xs" />
              <UInput v-model.number="filterNormMax" type="number" placeholder="Do" size="xs" />
            </div>
          </TableFilterHeader>
        </template>
        <template #aktywna-header>
          <TableFilterHeader label="Status">
            <USelect v-model="filterStatus" :items="statusOptions" value-key="value" size="xs" class="w-36" />
          </TableFilterHeader>
        </template>
        <template #actions-header>
          <span class="sr-only">Akcje</span>
        </template>

        <template #nazwa-cell="{ row }">
          <div class="font-medium">{{ row.original.nazwa }}</div>
          <div v-if="row.original.opis" class="text-xs text-muted mt-0.5 truncate max-w-xs">{{ row.original.opis }}</div>
        </template>
        <template #stanowiska-cell="{ row }">
          <UBadge color="primary" variant="subtle" size="sm">
            {{ row.original.stanowiska?.nazwa ?? '—' }}
          </UBadge>
        </template>
        <template #pora_dnia-cell="{ row }">
          <UBadge :color="badgePoryDnia(row.original.pora_dnia)" variant="subtle" size="sm">{{ formatPoraDnia(row.original.pora_dnia) }}</UBadge>
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
          <div v-if="canUpdate" class="flex justify-end gap-1">
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
              <UBadge :color="badgePoryDnia(selected.pora_dnia)" variant="subtle">{{ formatPoraDnia(selected.pora_dnia) }}</UBadge>
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
