<script setup lang="ts">
import type { StatusWykonania } from '~/types/database.types'
import { formatPoraDnia } from '~/utils/procedureMeta'

definePageMeta({ layout: 'mobile', middleware: 'mobile-auth' })

const { stanowiska, fetch: fetchStanowiska } = useStanowiska()
const { wykonania, loading, fetchDzien, updateStatus } = useWykonania()
const { imieNazwisko, logout } = useAuth()
const toast = useToast()

const dzis = new Date().toISOString().slice(0, 10)
const wybraneStanowisko = ref<string>('')
const aktualizowane = ref<string | null>(null)
const pomijajPierwszeOdswiezenie = ref(false)

const dataLabel = computed(() =>
  new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
)

onMounted(async () => {
  await fetchStanowiska()
  const pierwszeStanowisko = stanowiska.value[0]
  pomijajPierwszeOdswiezenie.value = true
  if (pierwszeStanowisko) wybraneStanowisko.value = pierwszeStanowisko.id
  await fetchDzien(dzis, wybraneStanowisko.value)
  pomijajPierwszeOdswiezenie.value = false
})

watch(wybraneStanowisko, async (stanowiskoId) => {
  if (pomijajPierwszeOdswiezenie.value) return
  await fetchDzien(dzis, stanowiskoId)
}, { flush: 'sync' })

const stationOptions = computed(() => stanowiska.value.map(s => ({ label: s.nazwa, value: s.id })))

const zadania = computed(() =>
  wykonania.value.filter(w => !wybraneStanowisko.value || w.stanowisko_id === wybraneStanowisko.value)
)
const doZrobienia = computed(() => zadania.value.filter(z => z.status === 'do_zrobienia'))
const wTrakcie = computed(() => zadania.value.filter(z => z.status === 'w_trakcie'))
const wykonane = computed(() => zadania.value.filter(z => z.status === 'wykonane'))
const procentPostepu = computed(() => {
  const all = zadania.value.length
  return all ? Math.round((wykonane.value.length / all) * 100) : 0
})

async function zmienStatus(id: string, status: StatusWykonania) {
  aktualizowane.value = id
  try {
    await updateStatus(id, status)
    await fetchDzien(dzis, wybraneStanowisko.value)
  } catch (e: any) {
    toast.add({ title: 'Błąd', description: e?.message, color: 'error' })
  } finally {
    aktualizowane.value = null
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col">
    <!-- Hero header -->
    <div class="px-5 pt-6 pb-5 text-white" style="background:linear-gradient(135deg,#c59d5f 0%,#b08840 100%);">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs opacity-80 capitalize">{{ dataLabel }}</div>
          <div class="text-lg font-semibold">Cześć, {{ imieNazwisko || 'pracowniku' }}</div>
        </div>
        <button class="text-white/80 hover:text-white" @click="logout">
          <UIcon name="i-lucide-log-out" class="w-5 h-5" />
        </button>
      </div>

      <!-- Postęp -->
      <div class="mt-4 bg-white/15 rounded-2xl p-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span>Postęp dnia</span>
          <span class="font-semibold">{{ procentPostepu }}%</span>
        </div>
        <div class="h-2 rounded-full bg-white/25 overflow-hidden">
          <div class="h-full rounded-full bg-white transition-all" :style="{ width: procentPostepu + '%' }" />
        </div>
        <div class="flex gap-4 mt-3 text-xs opacity-90">
          <span>✓ {{ wykonane.length }} wykonane</span>
          <span>• {{ wTrakcie.length }} w trakcie</span>
          <span>• {{ doZrobienia.length }} do zrobienia</span>
        </div>
      </div>
    </div>

    <!-- Wybór stanowiska -->
    <div class="px-5 py-4">
      <USelect v-model="wybraneStanowisko" :items="stationOptions" value-key="value" size="lg" icon="i-lucide-building-2" class="w-full" />
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 text-muted animate-spin" />
    </div>

    <div v-else class="px-5 pb-8 flex flex-col gap-5">
      <!-- W trakcie -->
      <div v-if="wTrakcie.length" class="flex flex-col gap-2">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide">W trakcie</div>
        <div v-for="z in wTrakcie" :key="z.id" class="border border-muted rounded-2xl p-4">
          <div class="font-medium">{{ z.procedury?.nazwa }}</div>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted">
            <UBadge color="primary" variant="subtle" size="sm">{{ formatPoraDnia(z.procedury?.pora_dnia) }}</UBadge>
            <span>norma: {{ z.procedury?.norma_min }} min</span>
          </div>
          <UButton block color="primary" class="mt-3 justify-center" :loading="aktualizowane === z.id" icon="i-lucide-check" @click="zmienStatus(z.id, 'wykonane')">Zakończ</UButton>
        </div>
      </div>

      <!-- Do zrobienia -->
      <div v-if="doZrobienia.length" class="flex flex-col gap-2">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide">Do zrobienia</div>
        <div v-for="z in doZrobienia" :key="z.id" class="border border-muted rounded-2xl p-4">
          <div class="font-medium">{{ z.procedury?.nazwa }}</div>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted">
            <UBadge color="neutral" variant="subtle" size="sm">{{ formatPoraDnia(z.procedury?.pora_dnia) }}</UBadge>
            <span>norma: {{ z.procedury?.norma_min }} min</span>
          </div>
          <UButton block color="neutral" variant="outline" class="mt-3 justify-center" :loading="aktualizowane === z.id" icon="i-lucide-play" @click="zmienStatus(z.id, 'w_trakcie')">Rozpocznij</UButton>
        </div>
      </div>

      <!-- Wykonane -->
      <div v-if="wykonane.length" class="flex flex-col gap-2">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide">Wykonane</div>
        <div v-for="z in wykonane" :key="z.id" class="border border-muted rounded-2xl p-4 opacity-60">
          <div class="font-medium line-through">{{ z.procedury?.nazwa }}</div>
          <div class="flex items-center gap-2 mt-1 text-xs text-success">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4" /> Zakończone
          </div>
        </div>
      </div>

      <p v-if="zadania.length === 0" class="text-sm text-muted text-center py-10">
        Brak zadań na dziś dla tego stanowiska.
      </p>
    </div>
  </div>
</template>
