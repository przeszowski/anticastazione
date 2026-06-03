<script setup lang="ts">
import { poraDniaOptions } from '~/utils/procedureMeta'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string
const { fetchOne, update, remove } = useProcedury()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { can } = useAuth()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const canUpdate = computed(() => can('procedury:update'))
const canDelete = computed(() => can('procedury:delete'))

const form = reactive({
  nazwa: '',
  opis: '',
  stanowisko_id: '',
  pora_dnia: 'Rano' as 'Rano' | 'Dzien' | 'Wieczor',
  norma_min: 20,
  aktywna: true,
  kolejnosc: 1
})

const stationOptions = computed(() => [
  { label: 'Bez stanowiska', value: '' },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

onMounted(async () => {
  await fetchStanowiska()
  try {
    const data = await fetchOne(id)
    form.nazwa = data.nazwa
    form.opis = data.opis ?? ''
    form.stanowisko_id = data.stanowisko_id ?? ''
    form.pora_dnia = data.pora_dnia
    form.norma_min = data.norma_min
    form.aktywna = data.aktywna
    form.kolejnosc = data.kolejnosc
  } catch (e: any) {
    toast.add({ title: 'Błąd ładowania', description: e.message, color: 'error' })
    navigateTo('/procedury')
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!form.nazwa.trim()) {
    toast.add({ title: 'Podaj nazwę procedury', color: 'error' })
    return
  }
  saving.value = true
  try {
    await update(id, {
      nazwa: form.nazwa.trim(),
      opis: form.opis.trim() || null,
      stanowisko_id: form.stanowisko_id || null,
      pora_dnia: form.pora_dnia,
      norma_min: form.norma_min,
      aktywna: form.aktywna,
      kolejnosc: form.kolejnosc
    })
    toast.add({ title: 'Zapisano zmiany', color: 'success' })
    navigateTo('/procedury')
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
    toast.add({ title: 'Procedura usunięta', color: 'success' })
    navigateTo('/procedury')
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
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="navigateTo('/procedury')" />
      <span class="text-sm font-semibold flex-1">Edycja procedury</span>
      <UButton v-if="!loading && canDelete" color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" @click="confirmDelete = true" />
      <UButton v-if="!loading && canUpdate" color="primary" size="sm" :loading="saving" @click="save">Zapisz</UButton>
    </div>

    <div v-if="loading" class="p-5 flex justify-center">
      <UIcon name="i-lucide-loader-circle" class="w-5 h-5 text-muted animate-spin" />
    </div>

    <div v-else class="p-5 max-w-lg flex flex-col gap-4">
      <div class="bg-elevated border border-muted rounded-xl p-5 flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Nazwa procedury *</label>
          <UInput v-model="form.nazwa" placeholder="np. Dezynfekcja powierzchni roboczych" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Opis</label>
          <UTextarea v-model="form.opis" placeholder="Krótki opis procedury…" :rows="3" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Stanowisko</label>
          <USelect
            v-model="form.stanowisko_id"
            :items="stationOptions"
            value-key="value"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Pora dnia</label>
            <USelect
              v-model="form.pora_dnia"
              :items="poraDniaOptions"
              value-key="value"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Norma czasu (min)</label>
            <UInput v-model.number="form.norma_min" type="number" min="1" max="480" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-muted">Kolejność wyświetlania</label>
          <UInput v-model.number="form.kolejnosc" type="number" min="1" />
        </div>

        <div class="flex items-center gap-2">
          <USwitch v-model="form.aktywna" />
          <span class="text-sm">Procedura aktywna</span>
        </div>
      </div>
    </div>

    <UModal v-model:open="confirmDelete">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error mt-0.5 shrink-0" />
            <div>
              <div class="font-semibold">Usuń procedurę</div>
              <p class="text-sm text-muted mt-1">Tej operacji nie można cofnąć. Procedura zostanie trwale usunięta.</p>
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
