<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { users, loading, error, fetch, setRole, setActive } = useUsers()
const { roles, fetch: fetchRoles } = useRoles()
const { can } = useAuth()

const toast = useToast()
const zapisywanie = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([fetch(), fetchRoles()])
})

const roleOptions = computed(() =>
  roles.value.map(r => ({ label: r.nazwa, value: r.id }))
)

const columns = [
  { accessorKey: 'imie', header: 'Imię i nazwisko' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'telefon', header: 'Telefon' },
  { accessorKey: 'email_zweryfikowany', header: 'Email zweryf.' },
  { accessorKey: 'role_id', header: 'Rola' },
  { accessorKey: 'aktywny', header: 'Aktywny' }
]

const mozeEdytowac = computed(() => can('users:update'))

async function zmienRole(userId: string, roleId: string) {
  zapisywanie.value = userId
  try {
    await setRole(userId, roleId)
    toast.add({ title: 'Rola zaktualizowana', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Błąd zapisu', description: e?.message, color: 'error' })
  } finally {
    zapisywanie.value = null
  }
}

async function przelaczAktywny(userId: string, val: boolean) {
  zapisywanie.value = userId
  try {
    await setActive(userId, val)
  } catch (e: any) {
    toast.add({ title: 'Błąd zapisu', description: e?.message, color: 'error' })
  } finally {
    zapisywanie.value = null
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <span class="text-sm font-semibold flex-1">Użytkownicy</span>
      <UButton
        v-if="can('users:create')"
        color="primary"
        size="sm"
        icon="i-lucide-plus"
        @click="navigateTo('/uzytkownicy/nowy')"
      >
        Nowy użytkownik
      </UButton>
    </div>

    <div class="p-5">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <UTable
        :data="users"
        :columns="columns"
        :loading="loading"
        class="border border-muted rounded-xl overflow-hidden"
      >
        <template #imie-cell="{ row }">
          <div class="font-medium">
            {{ [row.original.imie, row.original.nazwisko].filter(Boolean).join(' ') || '—' }}
          </div>
          <div v-if="row.original.stanowiska?.nazwa" class="text-xs text-muted mt-0.5">
            {{ row.original.stanowiska.nazwa }}
          </div>
        </template>

        <template #email-cell="{ row }">
          <span class="text-sm">{{ row.original.email ?? '—' }}</span>
        </template>

        <template #telefon-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.telefon ?? '—' }}</span>
        </template>

        <template #email_zweryfikowany-cell="{ row }">
          <UBadge :color="row.original.email_zweryfikowany ? 'success' : 'neutral'" variant="subtle" size="sm">
            {{ row.original.email_zweryfikowany ? 'Tak' : 'Nie' }}
          </UBadge>
        </template>

        <template #role_id-cell="{ row }">
          <USelect
            v-if="mozeEdytowac"
            :model-value="row.original.role_id ?? undefined"
            :items="roleOptions"
            value-key="value"
            size="sm"
            class="w-36"
            :loading="zapisywanie === row.original.id"
            @update:model-value="(val: string) => zmienRole(row.original.id, val)"
          />
          <UBadge v-else color="primary" variant="subtle" size="sm">
            {{ row.original.roles?.nazwa ?? '—' }}
          </UBadge>
        </template>

        <template #aktywny-cell="{ row }">
          <USwitch
            :model-value="row.original.aktywny"
            :disabled="!mozeEdytowac || zapisywanie === row.original.id"
            @update:model-value="(val: boolean) => przelaczAktywny(row.original.id, val)"
          />
        </template>
      </UTable>

      <p v-if="!loading && users.length === 0" class="text-sm text-muted text-center py-8">
        Brak użytkowników.
      </p>
    </div>
  </div>
</template>
