<script setup lang="ts">
import { ALL_SELECT_VALUE } from '~/utils/procedureMeta'
import { matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { stanowiska, loading, error, fetch } = useStanowiska()
const { can } = useAuth()

onMounted(fetch)
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

const columns = [
  { accessorKey: 'nazwa', header: 'Stanowisko' },
  { accessorKey: 'dzial', header: 'Dział' },
  { accessorKey: 'godziny_od', header: 'Godziny otwarcia' },
  { accessorKey: 'aktywne', header: 'Status' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Stanowiska</span>
      <UButton v-if="canCreate" color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/stanowiska/nowe')">
        Nowe stanowisko
      </UButton>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <div class="flex items-center gap-2">
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

      <UTable
        :data="filtered"
        :columns="columns"
        :loading="loading"
        @select="(row) => navigateTo('/stanowiska/' + row.original.id)"
        class="border border-muted rounded-xl overflow-hidden cursor-pointer"
      >
        <template #nazwa-header>
          <TableFilterHeader label="Stanowisko">
            <UInput v-model="search" placeholder="Szukaj..." icon="i-lucide-search" size="xs" class="w-52" />
          </TableFilterHeader>
        </template>
        <template #dzial-header>
          <TableFilterHeader label="Dział">
            <USelect v-model="filterDepartment" :items="departmentOptions" value-key="value" size="xs" class="w-40" />
          </TableFilterHeader>
        </template>
        <template #godziny_od-header>
          <TableFilterHeader label="Godziny otwarcia">
            <div class="grid w-40 grid-cols-2 gap-1">
              <UInput v-model="filterOpenFrom" type="time" size="xs" />
              <UInput v-model="filterOpenTo" type="time" size="xs" />
            </div>
          </TableFilterHeader>
        </template>
        <template #aktywne-header>
          <TableFilterHeader label="Status">
            <USelect v-model="filterStatus" :items="statusOptions" value-key="value" size="xs" class="w-36" />
          </TableFilterHeader>
        </template>
        <template #actions-header>
          <span class="sr-only">Akcje</span>
        </template>

        <template #nazwa-cell="{ row }">
          <div class="font-medium">{{ row.original.nazwa }}</div>
          <div v-if="row.original.opis" class="text-xs text-muted mt-0.5">{{ row.original.opis }}</div>
        </template>
        <template #dzial-cell="{ row }">
          <UBadge color="primary" variant="subtle" size="sm">{{ row.original.dzial }}</UBadge>
        </template>
        <template #godziny_od-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.godziny_od?.slice(0,5) }} – {{ row.original.godziny_do?.slice(0,5) }}</span>
        </template>
        <template #aktywne-cell="{ row }">
          <UBadge :color="row.original.aktywne ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ row.original.aktywne ? 'Aktywne' : 'Nieaktywne' }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis" size="xs" @click.stop />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
