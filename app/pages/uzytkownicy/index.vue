<script setup lang="ts">
import { ALL_SELECT_VALUE } from '~/utils/procedureMeta'
import { errorMessage } from '~/utils/errors'
import { matchesOption, matchesText } from '~/utils/tableFilters'

definePageMeta({ layout: 'default' })

const { users, loading, error, fetch, setRole, setActive } = useUsers()
const { roles, fetch: fetchRoles } = useRoles()
const { can } = useAuth()

const toast = useToast()
const zapisywanie = ref<string | null>(null)
const filterName = ref('')
const filterEmail = ref('')
const filterPhone = ref('')
const filterVerified = ref(ALL_SELECT_VALUE)
const filterRole = ref(ALL_SELECT_VALUE)
const filterActive = ref(ALL_SELECT_VALUE)

onMounted(async () => {
  await Promise.all([fetch(), fetchRoles()])
})

const roleOptions = computed(() => roles.value.map(r => ({ label: r.nazwa, value: r.id })))
const roleFilterOptions = computed(() => [
  { label: 'Wszystkie role', value: ALL_SELECT_VALUE },
  ...roleOptions.value
])
const yesNoOptions = [
  { label: 'Wszystkie', value: ALL_SELECT_VALUE },
  { label: 'Tak', value: 'yes' },
  { label: 'Nie', value: 'no' }
]
const activeOptions = [
  { label: 'Wszystkie', value: ALL_SELECT_VALUE },
  { label: 'Aktywni', value: 'active' },
  { label: 'Nieaktywni', value: 'inactive' }
]

const filtered = computed(() => users.value.filter(user =>
  matchesText(`${user.imie ?? ''} ${user.nazwisko ?? ''} ${user.stanowiska?.nazwa ?? ''}`, filterName.value)
  && matchesText(user.email, filterEmail.value)
  && matchesText(user.telefon, filterPhone.value)
  && matchesOption(user.email_zweryfikowany ? 'yes' : 'no', filterVerified.value)
  && matchesOption(user.role_id, filterRole.value)
  && matchesOption(user.aktywny ? 'active' : 'inactive', filterActive.value)
))

const hasFilters = computed(() =>
  Boolean(filterName.value.trim() || filterEmail.value.trim() || filterPhone.value.trim())
  || filterVerified.value !== ALL_SELECT_VALUE
  || filterRole.value !== ALL_SELECT_VALUE
  || filterActive.value !== ALL_SELECT_VALUE
)

function resetFilters() {
  filterName.value = ''
  filterEmail.value = ''
  filterPhone.value = ''
  filterVerified.value = ALL_SELECT_VALUE
  filterRole.value = ALL_SELECT_VALUE
  filterActive.value = ALL_SELECT_VALUE
}

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
  } catch (caught) {
    toast.add({ title: 'Błąd zapisu', description: errorMessage(caught), color: 'error' })
  } finally {
    zapisywanie.value = null
  }
}

async function przelaczAktywny(userId: string, val: boolean) {
  zapisywanie.value = userId
  try {
    await setActive(userId, val)
  } catch (caught) {
    toast.add({ title: 'Błąd zapisu', description: errorMessage(caught), color: 'error' })
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

    <div class="p-5 flex flex-col gap-4">
      <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="mb-4" />

      <div class="flex items-center gap-2">
        <span class="ml-auto text-xs text-muted">
          {{ loading ? 'Ładowanie...' : `${filtered.length} z ${users.length} użytkowników` }}
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
        class="overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white"
      >
        <template #imie-header>
          <TableFilterHeader label="Imię i nazwisko">
            <UInput v-model="filterName" placeholder="Osoba lub stanowisko" icon="i-lucide-search" size="xs" class="w-52" />
          </TableFilterHeader>
        </template>
        <template #email-header>
          <TableFilterHeader label="Email">
            <UInput v-model="filterEmail" placeholder="Email" size="xs" class="w-44" />
          </TableFilterHeader>
        </template>
        <template #telefon-header>
          <TableFilterHeader label="Telefon">
            <UInput v-model="filterPhone" placeholder="Telefon" size="xs" class="w-36" />
          </TableFilterHeader>
        </template>
        <template #email_zweryfikowany-header>
          <TableFilterHeader label="Email zweryf.">
            <USelect v-model="filterVerified" :items="yesNoOptions" value-key="value" size="xs" class="w-32" />
          </TableFilterHeader>
        </template>
        <template #role_id-header>
          <TableFilterHeader label="Rola">
            <USelect v-model="filterRole" :items="roleFilterOptions" value-key="value" size="xs" class="w-36" />
          </TableFilterHeader>
        </template>
        <template #aktywny-header>
          <TableFilterHeader label="Aktywny">
            <USelect v-model="filterActive" :items="activeOptions" value-key="value" size="xs" class="w-32" />
          </TableFilterHeader>
        </template>

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

      <p v-if="!loading && filtered.length === 0" class="text-sm text-muted text-center py-8">
        Brak użytkowników spełniających filtry.
      </p>
    </div>
  </div>
</template>
