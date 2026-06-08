<script setup lang="ts">
import { executionTimerState } from '~/utils/executionTimer'
import { localDateInput } from '~/utils/date'

definePageMeta({ layout: 'mobile', middleware: 'mobile-auth' })

const toast = useToast()
const { can, logout, ensureProfile } = useAuth()
const {
  stanowiska,
  loading: stationsLoading,
  error: stationsError,
  fetch: fetchStanowiska
} = useStanowiska()
const {
  wykonania,
  loading: executionsLoading,
  error: executionsError,
  fetchDzien
} = useWykonania()

const today = localDateInput()
const dateLabel = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
}).format(new Date())

const loading = computed(() => stationsLoading.value || executionsLoading.value)
const error = computed(() => stationsError.value || executionsError.value)

const stationSummaries = computed(() =>
  stanowiska.value
    .filter(station => station.aktywne)
    .map(station => {
      const items = wykonania.value.filter(item => item.stanowisko_id === station.id)
      const states = items.map(executionTimerState)
      const done = states.filter(state => state === 'done').length
      const running = states.filter(state => state === 'running').length
      const paused = states.filter(state => state === 'paused').length
      const rejected = states.filter(state => state === 'rejected').length
      const pending = states.filter(state => state === 'pending').length
      return {
        ...station,
        total: items.length,
        done,
        running,
        paused,
        rejected,
        pending,
        progress: items.length ? Math.round((done / items.length) * 100) : 0
      }
    })
)

const totals = computed(() => stationSummaries.value.reduce(
  (result, station) => ({
    total: result.total + station.total,
    done: result.done + station.done,
    active: result.active + station.running + station.paused,
    pending: result.pending + station.pending,
    rejected: result.rejected + station.rejected
  }),
  { total: 0, done: 0, active: 0, pending: 0, rejected: 0 }
))

onMounted(async () => {
  await ensureProfile()
  if (!can('raporty:read')) {
    toast.add({ title: 'Widok dostępny dla kierownika', color: 'warning' })
    await navigateTo('/m')
    return
  }
  await Promise.all([fetchStanowiska(), fetchDzien(today)])
})

const canCreate = computed(() => can('procedury:create'))
</script>

<template>
  <div class="manager-page">
    <header class="manager-hero">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p>Panel kierownika</p>
          <h1>Przegląd</h1>
          <span>{{ dateLabel }}</span>
        </div>
        <div class="flex gap-2">
          <button type="button" class="hero-action" title="Lista zadań" @click="navigateTo('/m')">
            <UIcon name="i-lucide-list-checks" class="size-[18px]" />
          </button>
          <button type="button" class="hero-action" title="Wyloguj" @click="logout('/m/login')">
            <UIcon name="i-lucide-log-out" class="size-[18px]" />
          </button>
        </div>
      </div>

      <div class="summary-grid">
        <div><strong>{{ totals.done }}</strong><span>Wykonane</span></div>
        <div><strong class="text-amber-700">{{ totals.active }}</strong><span>Aktywne</span></div>
        <div><strong class="text-slate-700">{{ totals.pending }}</strong><span>Czekają</span></div>
        <div><strong>{{ totals.total }}</strong><span>Łącznie</span></div>
      </div>
    </header>

    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :description="error" class="m-4" />

    <div v-if="loading" class="grid flex-1 place-items-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-primary" />
    </div>

    <main v-else class="station-list">
      <div class="section-heading">
        <div>
          <h2>Stanowiska</h2>
          <p>Bieżący stan realizacji procedur</p>
        </div>
        <span>{{ stationSummaries.length }}</span>
      </div>

      <button
        v-for="station in stationSummaries"
        :key="station.id"
        type="button"
        class="station-card"
        @click="navigateTo(`/m/kierownik/${station.id}`)"
      >
        <div class="station-card-top">
          <span class="station-icon">
            <UIcon name="i-lucide-building-2" class="size-5" />
          </span>
          <span class="min-w-0 flex-1 text-left">
            <strong>{{ station.nazwa }}</strong>
            <small>{{ station.done }} z {{ station.total }} procedur</small>
          </span>
          <span class="progress-number">{{ station.progress }}%</span>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-gray-300" />
        </div>

        <div class="progress-track">
          <span :class="{ complete: station.progress === 100 }" :style="{ width: `${station.progress}%` }" />
        </div>

        <div class="station-meta">
          <span class="done"><i />{{ station.done }} wyk.</span>
          <span v-if="station.running" class="running"><i />{{ station.running }} w toku</span>
          <span v-if="station.paused" class="paused"><i />{{ station.paused }} pauza</span>
          <span v-if="station.pending"><i />{{ station.pending }} czeka</span>
          <span v-if="station.rejected" class="rejected"><i />{{ station.rejected }} odrz.</span>
        </div>
      </button>

      <div v-if="!stationSummaries.length" class="py-14 text-center text-sm text-gray-400">
        Brak aktywnych stanowisk.
      </div>
    </main>

    <button v-if="canCreate" type="button" class="manager-fab" title="Nowa procedura" @click="navigateTo('/m/nowa')">
      <UIcon name="i-lucide-plus" class="size-6" />
    </button>
  </div>
</template>

<style scoped>
.manager-page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  background: #f5f4f1;
}

.manager-hero {
  padding: max(24px, env(safe-area-inset-top)) 18px 18px;
  background:
    radial-gradient(ellipse 250px 150px at 100% 0%, rgb(197 157 95 / 26%), transparent 72%),
    linear-gradient(160deg, #fff 0%, #fdf6ec 100%);
}

.manager-hero p {
  color: #9a6d24;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.manager-hero h1 {
  margin-top: 3px;
  color: #111827;
  font-size: 24px;
  font-weight: 720;
}

.manager-hero > div > div > span {
  display: block;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 11px;
  text-transform: capitalize;
}

.hero-action {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgb(197 157 95 / 16%);
  border-radius: 11px;
  color: #6b7280;
  background: rgb(255 255 255 / 78%);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid rgb(197 157 95 / 18%);
  border-radius: 12px;
  background: rgb(255 255 255 / 76%);
}

.summary-grid div {
  min-width: 0;
  border-right: 1px solid #eee8dc;
  padding: 10px 4px;
  text-align: center;
}

.summary-grid div:last-child { border-right: 0; }
.summary-grid strong { display: block; color: #15803d; font-size: 18px; font-weight: 750; }
.summary-grid span { display: block; margin-top: 2px; color: #9ca3af; font-size: 8px; text-transform: uppercase; }

.station-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 18px 14px calc(86px + env(safe-area-inset-bottom));
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 5px;
}

.section-heading h2 { color: #111827; font-size: 15px; font-weight: 700; }
.section-heading p { margin-top: 2px; color: #9ca3af; font-size: 11px; }
.section-heading > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  color: #8a6830;
  background: #f8e9cc;
  font-size: 11px;
  font-weight: 700;
}

.station-card {
  width: 100%;
  border: 0;
  border-radius: 18px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 1px 6px rgb(15 23 42 / 6%);
}

.station-card-top { display: flex; align-items: center; gap: 10px; }
.station-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border-radius: 13px;
  color: #8a6830;
  background: #fdf6ec;
}

.station-card strong { display: block; color: #111827; font-size: 14px; font-weight: 700; }
.station-card small { display: block; margin-top: 2px; color: #9ca3af; font-size: 10px; }
.progress-number { color: #8a6830; font-size: 12px; font-weight: 750; }

.progress-track {
  height: 5px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #f0ede6;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #c59d5f;
}

.progress-track span.complete { background: #16a34a; }

.station-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 9px; }
.station-meta span { display: flex; align-items: center; gap: 4px; color: #6b7280; font-size: 9px; font-weight: 650; }
.station-meta i { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; }
.station-meta .done i { background: #16a34a; }
.station-meta .running i { background: #c59d5f; }
.station-meta .paused i { background: #7c3aed; }
.station-meta .rejected i { background: #dc2626; }

.manager-fab {
  position: fixed;
  right: max(18px, calc((100vw - 430px) / 2 + 18px));
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 20;
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #b08840;
  box-shadow: 0 12px 30px rgb(82 62 30 / 28%);
}
</style>
