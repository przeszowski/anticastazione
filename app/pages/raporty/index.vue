<script setup lang="ts">
definePageMeta({ layout: 'default' })

// Mock data — zastąpić API
const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

const kpi = [
  { label: 'Procedur dziś', value: '24', sub: '3 w trakcie', color: 'text-default' },
  { label: 'Realizacja', value: '87%', sub: '+3% vs norma', color: 'text-primary' },
  { label: 'Odchylenie od normy', value: '+14m', sub: '(1g 50m / 2g 4m)', color: 'text-warning' },
  { label: 'Aktywnych stanowisk', value: '4', sub: 'z 5 ogółem', color: 'text-default' }
]

const tabs = [
  { label: 'Przegląd dzienny', to: '/raporty' },
  { label: 'Tabela zbiorcza', to: '/raporty/tabela' }
]

const groups = [
  {
    label: 'W trakcie',
    status: 'running',
    items: [
      { name: 'Dezynfekcja powierzchni roboczych', station: 'Kuchnia', period: 'Dzień', time: '14:22', duration: '23 min', norm: '20 min', status: 'over' },
      { name: 'Przygotowanie mise en place', station: 'Bar', period: 'Dzień', time: '14:35', duration: '18 min', norm: '25 min', status: 'ok' }
    ]
  },
  {
    label: 'Do zrobienia',
    status: 'todo',
    items: [
      { name: 'Porządkowanie strefy zmywaka', station: 'Kuchnia', period: 'Wieczór', time: '22:00', duration: null, norm: '15 min', status: 'pending' },
      { name: 'Zamknięcie baru', station: 'Bar', period: 'Wieczór', time: '23:00', duration: null, norm: '30 min', status: 'pending' }
    ]
  },
  {
    label: 'Wykonane',
    status: 'done',
    items: [
      { name: 'Otwieranie kuchni', station: 'Kuchnia', period: 'Rano', time: '06:15', duration: '28 min', norm: '25 min', status: 'over' },
      { name: 'Kontrola temperatur', station: 'Kuchnia', period: 'Rano', time: '07:00', duration: '12 min', norm: '15 min', status: 'fast' },
      { name: 'Przygotowanie sali', station: 'Sala', period: 'Rano', time: '08:00', duration: '35 min', norm: '30 min', status: 'over' }
    ]
  }
]

const periodBadge: Record<string, { color: string }> = {
  Rano: { color: 'primary' },
  Dzień: { color: 'info' },
  Wieczór: { color: 'violet' }
}

const statusColor: Record<string, string> = {
  fast: 'text-info font-semibold',
  ok: 'text-success font-semibold',
  over: 'text-warning font-semibold',
  pending: 'text-muted'
}

const groupColor: Record<string, string> = {
  running: 'text-info border-info/30 bg-info/5',
  todo: 'text-muted border-muted bg-elevated',
  done: 'text-success border-success/30 bg-success/5'
}

// Progress bar
const progressDone = 14
const progressRunning = 3
const progressTodo = 7
const progressTotal = progressDone + progressRunning + progressTodo
</script>

<template>
  <div class="flex flex-col flex-1">
    <!-- Topbar -->
    <div class="h-[52px] border-b border-muted flex items-center px-5 gap-2 bg-default sticky top-0 z-10">
      <UIcon name="i-lucide-bar-chart-2" class="w-4 h-4 text-muted" />
      <span class="text-sm font-semibold">Raporty</span>
    </div>

    <div class="p-5 flex flex-col gap-4">
      <!-- Sub-tabs -->
      <div class="flex border-b border-muted gap-4">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="$route.path === tab.to
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-default'"
        >
          {{ tab.label }}
        </NuxtLink>
      </div>

      <!-- Date + filters -->
      <div class="flex items-center gap-3 flex-wrap">
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-calendar" trailing-icon="i-lucide-chevron-down">
          Dziś — {{ today }}
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-building-2" trailing-icon="i-lucide-chevron-down">
          Wszystkie stanowiska
        </UButton>
      </div>

      <!-- KPI tiles -->
      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="k in kpi"
          :key="k.label"
          class="bg-elevated border border-muted rounded-xl p-4"
        >
          <div class="text-xs text-muted mb-1">{{ k.label }}</div>
          <div class="text-2xl font-semibold" :class="k.color">{{ k.value }}</div>
          <div class="text-xs text-muted mt-0.5">{{ k.sub }}</div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="bg-elevated border border-muted rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Postęp dnia</span>
          <span class="text-xs text-muted">{{ progressDone }}/{{ progressTotal }} procedur</span>
        </div>
        <div class="h-2.5 rounded-full bg-muted/30 overflow-hidden flex">
          <div
            class="bg-success transition-all"
            :style="`width: ${(progressDone / progressTotal) * 100}%`"
          />
          <div
            class="bg-primary transition-all"
            :style="`width: ${(progressRunning / progressTotal) * 100}%`"
          />
        </div>
        <div class="flex gap-4 mt-2 text-xs text-muted">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-success inline-block" />Wykonane ({{ progressDone }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-primary inline-block" />W trakcie ({{ progressRunning }})</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-muted/50 inline-block" />Do zrobienia ({{ progressTodo }})</span>
        </div>
      </div>

      <!-- Procedure groups -->
      <div v-for="group in groups" :key="group.label">
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wide mb-2"
          :class="groupColor[group.status]"
        >
          {{ group.label }}
          <span class="font-normal normal-case tracking-normal ml-1">({{ group.items.length }})</span>
        </div>

        <div
          v-for="item in group.items"
          :key="item.name"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-muted bg-default mb-1.5 cursor-pointer hover:bg-elevated transition-colors"
          @click="navigateTo('/raporty/' + item.name)"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ item.name }}</div>
            <div class="text-xs text-muted mt-0.5">{{ item.station }}</div>
          </div>
          <UBadge :color="periodBadge[item.period]?.color as any || 'neutral'" variant="subtle" size="sm">
            {{ item.period }}
          </UBadge>
          <div class="text-xs text-muted w-12 text-right">{{ item.time }}</div>
          <div class="text-xs w-16 text-right" :class="statusColor[item.status]">
            {{ item.duration ?? '—' }}
          </div>
          <div class="text-xs text-muted w-14 text-right">n: {{ item.norm }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
