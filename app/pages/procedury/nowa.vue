<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { create } = useProcedury()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const toast = useToast()
const saving = ref(false)

onMounted(fetchStanowiska)

const form = reactive({
  nazwa: '',
  opis: '',
  stanowisko_id: '',
  pora_dnia: 'Rano' as 'Rano' | 'Dzień' | 'Wieczór',
  norma_min: 20,
  aktywna: true,
  kolejnosc: 1
})

const stationOptions = computed(() => [
  { label: 'Bez stanowiska', value: '' },
  ...stanowiska.value.map(s => ({ label: s.nazwa, value: s.id }))
])

const poraDniaOptions = [
  { label: 'Rano', value: 'Rano' },
  { label: 'Dzień', value: 'Dzień' },
  { label: 'Wieczór', value: 'Wieczór' }
]

async function save() {
  if (!form.nazwa.trim()) {
    toast.add({ title: 'Podaj nazwę procedury', color: 'error' })
    return
  }
  saving.value = true
  try {
    await create({
      nazwa: form.nazwa.trim(),
      opis: form.opis.trim() || null,
      stanowisko_id: form.stanowisko_id || null,
      pora_dnia: form.pora_dnia,
      norma_min: form.norma_min,
      aktywna: form.aktywna,
      kolejnosc: form.kolejnosc
    })
    toast.add({ title: 'Procedura utworzona', color: 'success' })
    navigateTo('/procedury')
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
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" size="sm" @click="navigateTo('/procedury')" />
      <span class="text-sm font-semibold flex-1">Nowa procedura</span>
      <UButton color="primary" size="sm" :loading="saving" @click="save">Zapisz</UButton>
    </div>

    <div class="p-5 max-w-lg flex flex-col gap-4">
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
            :options="stationOptions"
            option-attribute="label"
            value-attribute="value"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-muted">Pora dnia</label>
            <USelect
              v-model="form.pora_dnia"
              :options="poraDniaOptions"
              option-attribute="label"
              value-attribute="value"
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
          <UToggle v-model="form.aktywna" />
          <span class="text-sm">Procedura aktywna</span>
        </div>
      </div>
    </div>
  </div>
</template>
