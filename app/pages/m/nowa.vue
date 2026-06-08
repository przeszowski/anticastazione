<script setup lang="ts">
import type { PoraDnia } from '~/types/database.types'
import { poraDniaOptions } from '~/utils/procedureMeta'

definePageMeta({ layout: 'mobile', middleware: 'mobile-auth' })

const route = useRoute()
const toast = useToast()
const { can, ensureProfile } = useAuth()
const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { create: createProcedure } = useProcedury()
const { create: createExecution } = useWykonania()
const saving = ref(false)

const form = reactive({
  nazwa: '',
  opis: '',
  stanowisko_id: '',
  pora_dnia: 'Rano' as PoraDnia,
  norma_min: 15
})

const stationOptions = computed(() =>
  stanowiska.value
    .filter(station => station.aktywne)
    .map(station => ({ label: station.nazwa, value: station.id }))
)

onMounted(async () => {
  await ensureProfile()
  if (!can('procedury:create')) {
    toast.add({ title: 'Brak uprawnień do dodawania procedur', color: 'warning' })
    await navigateTo('/m')
    return
  }

  await fetchStanowiska()
  const requestedStation = String(route.query.stanowisko ?? '')
  form.stanowisko_id = stanowiska.value.some(station => station.id === requestedStation)
    ? requestedStation
    : stationOptions.value[0]?.value ?? ''
})

async function save() {
  if (!form.nazwa.trim() || !form.stanowisko_id || form.norma_min < 1) {
    toast.add({ title: 'Uzupełnij wymagane pola', color: 'error' })
    return
  }

  saving.value = true
  try {
    const procedure = await createProcedure({
      nazwa: form.nazwa.trim(),
      opis: form.opis.trim() || null,
      stanowisko_id: form.stanowisko_id,
      pora_dnia: form.pora_dnia,
      norma_min: form.norma_min,
      aktywna: true,
      kolejnosc: 999
    })

    await createExecution({
      procedura_id: procedure.id,
      stanowisko_id: form.stanowisko_id,
      data_dnia: new Date().toISOString().slice(0, 10),
      status: 'do_zrobienia'
    })

    toast.add({ title: 'Procedura dodana do dzisiejszych zadań', color: 'success' })
    await navigateTo({ path: '/m', query: { stanowisko: form.stanowisko_id } })
  } catch (caught) {
    toast.add({
      title: 'Nie udało się dodać procedury',
      description: caught instanceof Error ? caught.message : undefined,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mobile-form-page">
    <header class="form-header">
      <button type="button" class="icon-button" title="Wróć" @click="navigateTo('/m')">
        <UIcon name="i-lucide-arrow-left" class="size-5" />
      </button>
      <div class="min-w-0 flex-1">
        <p>Nowe zadanie</p>
        <h1>Dodaj procedurę</h1>
      </div>
      <button type="button" class="save-button" :disabled="saving" @click="save">
        <UIcon v-if="saving" name="i-lucide-loader-circle" class="size-4 animate-spin" />
        <UIcon v-else name="i-lucide-check" class="size-4" />
        Zapisz
      </button>
    </header>

    <main class="form-content">
      <label class="field">
        <span>Nazwa procedury</span>
        <UInput v-model="form.nazwa" placeholder="np. Kontrola temperatury" size="lg" autofocus />
      </label>

      <label class="field">
        <span>Opis / instrukcja</span>
        <UTextarea v-model="form.opis" placeholder="Kroki do wykonania..." :rows="4" autoresize />
      </label>

      <label class="field">
        <span>Stanowisko</span>
        <USelect
          v-model="form.stanowisko_id"
          :items="stationOptions"
          value-key="value"
          placeholder="Wybierz stanowisko"
          size="lg"
          class="w-full"
        />
      </label>

      <fieldset class="field">
        <legend>Pora dnia</legend>
        <div class="segment-grid">
          <button
            v-for="period in poraDniaOptions"
            :key="period.value"
            type="button"
            :class="{ active: form.pora_dnia === period.value }"
            @click="form.pora_dnia = period.value"
          >
            <UIcon
              :name="period.value === 'Rano'
                ? 'i-lucide-sunrise'
                : period.value === 'Dzien'
                  ? 'i-lucide-sun'
                  : 'i-lucide-moon-star'"
              class="size-4"
            />
            {{ period.label }}
          </button>
        </div>
      </fieldset>

      <label class="field">
        <span>Norma czasu</span>
        <div class="number-field">
          <UInput v-model.number="form.norma_min" type="number" min="1" max="480" size="lg" />
          <span>min</span>
        </div>
      </label>
    </main>
  </div>
</template>

<style scoped>
.mobile-form-page {
  min-height: 100dvh;
  background: #f5f4f1;
}

.form-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  border-bottom: 1px solid #ebe7df;
  padding: max(14px, env(safe-area-inset-top)) 16px 14px;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(16px);
}

.form-header p {
  color: #9a6d24;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.form-header h1 {
  margin-top: 2px;
  color: #111827;
  font-size: 18px;
  font-weight: 700;
}

.icon-button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border: 1px solid #ebe7df;
  border-radius: 10px;
  color: #4b5563;
  background: #fff;
}

.save-button {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  padding: 0 12px;
  color: #fff;
  background: #b08840;
  font-size: 12px;
  font-weight: 700;
}

.save-button:disabled { opacity: 0.55; }

.form-content {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 18px calc(32px + env(safe-area-inset-bottom));
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.field > span,
.field > legend {
  color: #4b5563;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.segment-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.segment-grid button {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #6b7280;
  background: #fff;
  font-size: 11px;
  font-weight: 650;
}

.segment-grid button.active {
  border-color: rgb(176 136 64 / 55%);
  color: #8a6830;
  background: #fdf6ec;
  box-shadow: inset 0 0 0 1px rgb(176 136 64 / 12%);
}

.number-field {
  position: relative;
}

.number-field > span {
  position: absolute;
  top: 50%;
  right: 14px;
  z-index: 2;
  color: #9ca3af;
  font-size: 12px;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
