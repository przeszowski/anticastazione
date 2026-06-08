<script setup lang="ts">
import { ALL_SELECT_VALUE } from '~/utils/procedureMeta'
import { matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { stanowiska, loading, error, fetch } = useStanowiska()
const { procedury, fetch: fetchProcedury } = useProcedury()
const { can } = useAuth()

onMounted(() => Promise.all([fetch(), fetchProcedury()]))
const canCreate = computed(() => can('stanowiska:create'))

const search = ref('')
const filterDepartment = ref(ALL_SELECT_VALUE)
const filterOpenFrom = ref('')
const filterOpenTo = ref('')
const filterStatus = ref(ALL_SELECT_VALUE)

const departmentOptions = computed(() => [
  { label: 'Wszystkie działy', value: ALL_SELECT_VALUE },
  ...[...new Set(stanowiska.value.map(item => item.dzial))]
    .sort()
    .map(value => ({ label: value, value }))
])

const statusOptions = [
  { label: 'Wszystkie statusy', value: ALL_SELECT_VALUE },
  { label: 'Aktywne', value: 'active' },
  { label: 'Nieaktywne', value: 'inactive' }
]

const filtered = computed(() => stanowiska.value.filter(item => {
  const opensAt = item.godziny_od?.slice(0, 5) ?? ''
  const closesAt = item.godziny_do?.slice(0, 5) ?? ''
  return matchesText(`${item.nazwa} ${item.opis ?? ''}`, search.value)
    && matchesOption(item.dzial, filterDepartment.value)
    && matchesOption(item.aktywne ? 'active' : 'inactive', filterStatus.value)
    && (!filterOpenFrom.value || opensAt >= filterOpenFrom.value)
    && (!filterOpenTo.value || closesAt <= filterOpenTo.value)
}))

const hasFilters = computed(() =>
  Boolean(search.value.trim() || filterOpenFrom.value || filterOpenTo.value)
  || filterDepartment.value !== ALL_SELECT_VALUE
  || filterStatus.value !== ALL_SELECT_VALUE
)

function resetFilters() {
  search.value = ''
  filterDepartment.value = ALL_SELECT_VALUE
  filterOpenFrom.value = ''
  filterOpenTo.value = ''
  filterStatus.value = ALL_SELECT_VALUE
}

function procedureCount(stationId: string, activeOnly = false) {
  return procedury.value.filter(item =>
    item.stanowisko_id === stationId && (!activeOnly || item.aktywna)
  ).length
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="antica-topbar">
      <UIcon name="i-lucide-building-2" class="size-4 text-[#6b7280]" />
      <span class="antica-topbar-title flex-1">Stanowiska</span>
      <UButton v-if="canCreate" color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/stanowiska/nowe')">
        Nowe stanowisko
      </UButton>
    </div>

    <div class="antica-content">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <div class="antica-toolbar flex-wrap">
        <div class="antica-search w-[280px]">
          <UIcon name="i-lucide-search" class="size-3.5" />
          <input v-model="search" class="antica-filter" placeholder="Szukaj stanowiska...">
        </div>
        <select v-model="filterDepartment" class="antica-filter w-44">
          <option v-for="option in departmentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="filterStatus" class="antica-filter w-44">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <input v-model="filterOpenFrom" type="time" class="antica-filter w-32" title="Otwarte od">
        <input v-model="filterOpenTo" type="time" class="antica-filter w-32" title="Otwarte do">
        <span class="ml-auto text-xs text-muted">
          {{ loading ? 'Ładowanie...' : `${filtered.length} z ${stanowiska.length} stanowisk` }}
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

      <div class="antica-table-frame mt-3">
        <table class="antica-table min-w-[800px]">
          <thead>
            <tr>
              <th>Stanowisko</th>
              <th>Dział</th>
              <th>Procedury</th>
              <th>Godziny otwarcia</th>
              <th>Status</th>
              <th aria-label="Akcje" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="6" class="antica-empty">Ładowanie stanowisk...</td></tr>
            <tr v-else-if="!filtered.length"><td colspan="6" class="antica-empty">Brak stanowisk spełniających filtry.</td></tr>
            <template v-else>
              <tr
                v-for="item in filtered"
                :key="item.id"
                data-clickable="true"
                :class="{ 'opacity-60': !item.aktywne }"
                @click="navigateTo('/stanowiska/' + item.id)"
              >
                <td>
                  <div class="flex items-center gap-2.5">
                    <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fdf6ec] text-[#c59d5f]">
                      <UIcon name="i-lucide-building-2" class="size-4" />
                    </span>
                    <span class="min-w-0">
                      <strong class="block font-semibold">{{ item.nazwa }}</strong>
                      <small v-if="item.opis" class="mt-0.5 block max-w-sm truncate text-xs text-[#6b7280]">{{ item.opis }}</small>
                    </span>
                  </div>
                </td>
                <td><span class="antica-badge antica-badge-brand">{{ item.dzial }}</span></td>
                <td>
                  <strong class="block font-semibold">{{ procedureCount(item.id) }}</strong>
                  <small class="text-xs text-[#6b7280]">{{ procedureCount(item.id, true) }} aktywnych</small>
                </td>
                <td class="text-[#6b7280]">{{ item.godziny_od?.slice(0,5) }} – {{ item.godziny_do?.slice(0,5) }}</td>
                <td>
                  <span class="antica-badge" :class="item.aktywne ? 'antica-badge-green' : 'antica-badge-gray'">
                    {{ item.aktywne ? 'Aktywne' : 'Archiwalne' }}
                  </span>
                </td>
                <td class="w-12">
                  <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis" size="xs" @click.stop />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="antica-pagination">
        <span>Wyświetlono {{ filtered.length }} z {{ stanowiska.length }} stanowisk</span>
      </div>
    </div>
  </div>
</template>
