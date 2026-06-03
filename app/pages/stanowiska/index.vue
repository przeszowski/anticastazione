<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { stanowiska, loading, error, fetch } = useStanowiska()
const { can } = useAuth()

onMounted(fetch)
const canCreate = computed(() => can('stanowiska:create'))

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

    <div class="p-5">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <UTable
        :data="stanowiska"
        :columns="columns"
        :loading="loading"
        @select="(row) => navigateTo('/stanowiska/' + row.original.id)"
        class="border border-muted rounded-xl overflow-hidden cursor-pointer"
      >
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
