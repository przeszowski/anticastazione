<script setup lang="ts">
definePageMeta({ layout: 'default' })

const stations = [
  { id: 1, name: 'Kuchnia', dept: 'Kuchnia', procedures: 8, hours: '06:00 – 23:00', active: true },
  { id: 2, name: 'Bar', dept: 'Bar', procedures: 5, hours: '14:00 – 02:00', active: true },
  { id: 3, name: 'Sala', dept: 'Sala', procedures: 6, hours: '11:00 – 23:30', active: true },
  { id: 4, name: 'Obsługa gości', dept: 'Obsługa', procedures: 4, hours: '10:00 – 22:00', active: true },
  { id: 5, name: 'Zarządzanie', dept: 'Zarządzanie', procedures: 3, hours: '08:00 – 20:00', active: false }
]

const columns = [
  { key: 'name', label: 'Stanowisko' },
  { key: 'dept', label: 'Dział' },
  { key: 'procedures', label: 'Procedury' },
  { key: 'hours', label: 'Godziny otwarcia' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: '' }
]
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Stanowiska</span>
      <UButton color="primary" size="sm" icon="i-lucide-plus" @click="navigateTo('/stanowiska/nowe')">
        Nowe stanowisko
      </UButton>
    </div>

    <div class="p-5">
      <UTable
        :rows="stations"
        :columns="columns"
        @select="(row) => navigateTo('/stanowiska/' + row.id)"
        class="border border-muted rounded-xl overflow-hidden cursor-pointer"
      >
        <template #name-data="{ row }">
          <div class="font-medium">{{ row.name }}</div>
        </template>
        <template #dept-data="{ row }">
          <UBadge color="primary" variant="subtle" size="sm">{{ row.dept }}</UBadge>
        </template>
        <template #procedures-data="{ row }">
          <span class="text-sm">{{ row.procedures }} procedur</span>
        </template>
        <template #active-data="{ row }">
          <UBadge :color="row.active ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ row.active ? 'Aktywne' : 'Nieaktywne' }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex justify-end">
            <UButton
              color="neutral" variant="ghost" icon="i-lucide-ellipsis" size="xs"
              @click.stop
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
