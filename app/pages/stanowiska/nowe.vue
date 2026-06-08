<script setup lang="ts">
import { dzialOptions } from '~/utils/procedureMeta'

definePageMeta({ layout: 'default' })

const { create } = useStanowiska()
const toast = useToast()
const saving = ref(false)

const form = reactive({
  nazwa: '',
  dzial: '',
  opis: '',
  godziny_od: '06:00',
  godziny_do: '23:00',
  aktywne: true,
  kolejnosc: 1
})

async function save() {
  if (!form.nazwa.trim() || !form.dzial) {
    toast.add({ title: 'Wypełnij wymagane pola', color: 'error' })
    return
  }
  saving.value = true
  try {
    await create({
      nazwa: form.nazwa.trim(),
      dzial: form.dzial,
      opis: form.opis.trim() || null,
      godziny_od: form.godziny_od + ':00',
      godziny_do: form.godziny_do + ':00',
      aktywne: form.aktywne,
      kolejnosc: form.kolejnosc
    })
    toast.add({ title: 'Stanowisko utworzone', color: 'success' })
    navigateTo('/stanowiska')
  } catch (e: any) {
    toast.add({ title: 'Błąd', description: e.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col flex-1">
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-3 bg-default sticky top-0 z-10">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="navigateTo('/stanowiska')" />
      <span class="text-sm font-semibold flex-1">Nowe stanowisko</span>
      <UButton color="primary" size="sm" :loading="saving" @click="save">Zapisz</UButton>
    </div>

    <div class="p-5 max-w-lg flex flex-col gap-4">
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
  </div>
</template>
