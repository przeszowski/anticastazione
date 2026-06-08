<script setup lang="ts">
import { dzialOptions } from '~/utils/procedureMeta'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string
const { fetchOne, update, remove } = useStanowiska()
const { can } = useAuth()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const canUpdate = computed(() => can('stanowiska:update'))
const canDelete = computed(() => can('stanowiska:delete'))

const form = reactive({
  nazwa: '',
  dzial: '',
  opis: '',
  godziny_od: '06:00',
  godziny_do: '23:00',
  aktywne: true,
  kolejnosc: 1
})

onMounted(async () => {
  try {
    const data = await fetchOne(id)
    form.nazwa = data.nazwa
    form.dzial = data.dzial
    form.opis = data.opis ?? ''
    form.godziny_od = data.godziny_od?.slice(0, 5) ?? '06:00'
    form.godziny_do = data.godziny_do?.slice(0, 5) ?? '23:00'
    form.aktywne = data.aktywne
    form.kolejnosc = data.kolejnosc
  } catch (e: any) {
    toast.add({ title: 'Błąd ładowania', description: e.message, color: 'error' })
    navigateTo('/stanowiska')
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!form.nazwa.trim() || !form.dzial) {
    toast.add({ title: 'Wypełnij wymagane pola', color: 'error' })
    return
  }
  saving.value = true
  try {
    await update(id, {
      nazwa: form.nazwa.trim(),
      dzial: form.dzial,
      opis: form.opis.trim() || null,
      godziny_od: form.godziny_od + ':00',
      godziny_do: form.godziny_do + ':00',
      aktywne: form.aktywne,
      kolejnosc: form.kolejnosc
    })
    toast.add({ title: 'Zapisano zmiany', color: 'success' })
    navigateTo('/stanowiska')
  } catch (e: any) {
    toast.add({ title: 'Błąd', description: e.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  deleting.value = true
  try {
    await remove(id)
    toast.add({ title: 'Stanowisko usunięte', color: 'success' })
    navigateTo('/stanowiska')
  } catch (e: any) {
    toast.add({ title: 'Błąd', description: e.message, color: 'error' })
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="navigateTo('/stanowiska')" />
      <span class="text-sm font-semibold flex-1">Edycja stanowiska</span>
      <UButton v-if="!loading && canDelete" color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="confirmDelete = true" />
      <UButton v-if="!loading && canUpdate" color="primary" size="sm" :loading="saving" @click="save">Zapisz</UButton>
    </div>

    <div v-if="loading" class="p-5 flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
    </div>

    <div v-else class="p-5 max-w-lg flex flex-col gap-4">
      <div class="flex flex-col gap-4 rounded-[10px] border border-[#e5e7eb] bg-white p-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Nazwa stanowiska *</label>
          <UInput v-model="form.nazwa" placeholder="np. Kuchnia główna" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Dział *</label>
          <USelect
            v-model="form.dzial"
            :items="dzialOptions"
            value-key="value"
            placeholder="Wybierz dział"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Opis</label>
          <UTextarea v-model="form.opis" placeholder="Opcjonalny opis stanowiska…" :rows="3" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Godziny od</label>
            <UInput v-model="form.godziny_od" type="time" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Godziny do</label>
            <UInput v-model="form.godziny_do" type="time" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Kolejność wyświetlania</label>
          <UInput v-model.number="form.kolejnosc" type="number" min="1" />
        </div>

        <div class="flex items-center gap-2">
          <USwitch v-model="form.aktywne" />
          <span class="text-sm">Stanowisko aktywne</span>
        </div>
      </div>
    </div>

    <!-- Modal potwierdzenia usunięcia -->
    <UModal v-model:open="confirmDelete">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error mt-0.5 shrink-0" />
            <div>
              <div class="font-semibold">Usuń stanowisko</div>
              <p class="text-sm text-muted mt-1">Tej operacji nie można cofnąć. Stanowisko zostanie trwale usunięte.</p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton color="neutral" variant="outline" @click="confirmDelete = false">Anuluj</UButton>
            <UButton color="error" :loading="deleting" @click="doDelete">Usuń</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
