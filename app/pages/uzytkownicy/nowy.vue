<script setup lang="ts">
import { NO_STATION_VALUE } from '~/utils/procedureMeta'
import { errorMessage } from '~/utils/errors'

definePageMeta({ layout: 'default' })

const { roles, fetch: fetchRoles } = useRoles()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const toast = useToast()
const saving = ref(false)

onMounted(async () => {
  await Promise.all([fetchRoles(), fetchStanowiska()])
})

const form = reactive({
  imie: '',
  nazwisko: '',
  email: '',
  telefon: '',
  haslo: '',
  rola: 'PRACOWNIK',
  stanowisko_id: NO_STATION_VALUE
})

const roleOptions = computed(() => roles.value.map(r => ({ label: r.nazwa, value: r.nazwa })))
const stationOptions = computed(() => [
  { label: 'Bez stanowiska', value: NO_STATION_VALUE },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

async function save() {
  if (!form.email.trim() || !form.haslo.trim()) {
    toast.add({ title: 'Podaj email i hasło', color: 'error' })
    return
  }
  saving.value = true
  try {
    await $fetch('/api/users/create', {
      method: 'POST',
      body: {
        imie: form.imie.trim(),
        nazwisko: form.nazwisko.trim(),
        email: form.email.trim(),
        telefon: form.telefon.trim() || null,
        haslo: form.haslo,
        rola: form.rola,
        stanowisko_id: form.stanowisko_id === NO_STATION_VALUE ? null : form.stanowisko_id
      }
    })
    toast.add({ title: 'Użytkownik utworzony', color: 'success' })
    navigateTo('/uzytkownicy')
  } catch (caught) {
    toast.add({
      title: 'Nie udało się utworzyć użytkownika',
      description: errorMessage(caught),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="navigateTo('/uzytkownicy')" />
      <span class="text-sm font-semibold flex-1">Nowy użytkownik</span>
      <UButton color="primary" size="sm" :loading="saving" @click="save">Utwórz konto</UButton>
    </div>

    <div class="p-5 max-w-lg flex flex-col gap-4">
      <div class="flex flex-col gap-4 rounded-[10px] border border-[#e5e7eb] bg-white p-5">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Imię</label>
            <UInput v-model="form.imie" placeholder="np. Anna" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Nazwisko</label>
            <UInput v-model="form.nazwisko" placeholder="np. Kowalska" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Email *</label>
          <UInput v-model="form.email" type="email" placeholder="adres@email.pl" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Telefon</label>
          <UInput v-model="form.telefon" placeholder="np. 600 100 200" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Hasło początkowe *</label>
          <UInput v-model="form.haslo" type="text" placeholder="Hasło dla nowego konta" />
          <span class="text-xs text-muted">Pracownik może je później zmienić.</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Rola</label>
            <USelect v-model="form.rola" :items="roleOptions" value-key="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Stanowisko</label>
            <USelect v-model="form.stanowisko_id" :items="stationOptions" value-key="value" class="w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
