<script setup lang="ts">
import type { ProceduraWithStanowisko } from '~/composables/useSupabase'
import { ALL_SELECT_VALUE, badgePoryDnia, formatPoraDnia, poraDniaOptions } from '~/utils/procedureMeta'
import { matchesNumberRange, matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { procedury, loading, error, fetch, update } = useProcedury()
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
  { label: 'Wszystkie', value: ALL_SELECT_VALUE },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const periodOptions = [{ label: 'Wszystkie', value: ALL_SELECT_VALUE }, ...poraDniaOptions]
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

const canCreate = computed(() => can('procedury:create'))
const canUpdate = computed(() => can('procedury:update'))

function periodBadge(period: string) {
  if (period === 'Dzien') return 'antica-badge-blue'
  if (period === 'Wieczor') return 'antica-badge-purple'
  return 'antica-badge-brand'
}

// Slideover szczegółów
const slideoverOpen = ref(false)
const selected = ref<ProceduraWithStanowisko | null>(null)

function openDetails(item: ProceduraWithStanowisko) {
  selected.value = item
  slideoverOpen.value = true
}

async function toggleActive(row: ProceduraWithStanowisko) {
  if (!canUpdate.value) return
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
    <div class="antica-topbar">
      <span class="antica-topbar-title flex-1">Procedury</span>
      <UButton v-if="canCreate" color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/procedury/nowa')">
        Nowa procedura
      </UButton>
    </div>

    <div class="antica-content">
      <div class="antica-toolbar">
        <UButton color="neutral" variant="outline" size="xs" icon="i-lucide-columns-3">
          Kolumny
        </UButton>
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

      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <div class="overflow-x-auto">
        <table class="antica-table min-w-[920px]">
          <thead>
            <tr>
              <th>Nazwa procedury</th>
              <th>Stanowisko</th>
              <th>Pora dnia</th>
              <th>Norma</th>
              <th>Status</th>
              <th aria-label="Akcje" />
            </tr>
            <tr class="antica-filter-row">
              <th>
                <div class="antica-search">
                  <UIcon name="i-lucide-search" class="size-3.5" />
                  <input v-model="search" class="antica-filter" placeholder="Szukaj...">
                </div>
              </th>
              <th>
                <select v-model="filterStation" class="antica-filter">
                  <option v-for="option in stationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </th>
              <th>
                <select v-model="filterPeriod" class="antica-filter">
                  <option v-for="option in periodOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </th>
              <th>
                <div class="grid grid-cols-2 gap-1">
                  <input v-model.number="filterNormMin" class="antica-filter" type="number" placeholder="Od">
                  <input v-model.number="filterNormMax" class="antica-filter" type="number" placeholder="Do">
                </div>
              </th>
              <th>
                <select v-model="filterStatus" class="antica-filter">
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="antica-empty">
                <UIcon name="i-lucide-loader-circle" class="mx-auto size-5 animate-spin" />
              </td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="6" class="antica-empty">Brak procedur spełniających filtry.</td>
            </tr>
            <template v-else>
              <tr
                v-for="item in filtered"
                :key="item.id"
                data-clickable="true"
                @click="openDetails(item)"
              >
                <td>
                  <div class="font-semibold">{{ item.nazwa }}</div>
                  <div v-if="item.opis" class="mt-0.5 max-w-xs truncate text-xs text-[#6b7280]">{{ item.opis }}</div>
                </td>
                <td>{{ item.stanowiska?.nazwa ?? '—' }}</td>
                <td><span class="antica-badge" :class="periodBadge(item.pora_dnia)">{{ formatPoraDnia(item.pora_dnia) }}</span></td>
                <td>{{ item.norma_min }} min</td>
                <td>
                  <span class="antica-badge" :class="item.aktywna ? 'antica-badge-green' : 'antica-badge-gray'">
                    {{ item.aktywna ? 'Aktywna' : 'Archiwum' }}
                  </span>
                </td>
                <td class="w-20">
                  <div v-if="canUpdate" class="flex justify-end gap-1">
                    <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" size="xs"
                      @click.stop="navigateTo('/procedury/edytuj/' + item.id)" />
                    <UButton color="neutral" variant="ghost"
                      :icon="item.aktywna ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
                      size="xs" @click.stop="toggleActive(item)" />
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="antica-pagination">
        <span>Wyświetlono {{ filtered.length }} z {{ procedury.length }} procedur</span>
      </div>
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
