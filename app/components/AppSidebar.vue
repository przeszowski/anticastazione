<script setup lang="ts">
const route = useRoute()

const navItems = [
  {
    label: 'Procedury',
    to: '/procedury',
    icon: 'i-lucide-clipboard-list'
  },
  {
    label: 'Stanowiska',
    to: '/stanowiska',
    icon: 'i-lucide-building-2'
  },
  {
    label: 'Raporty',
    to: '/raporty',
    icon: 'i-lucide-bar-chart-2'
  },
  {
    label: 'Widok mobilny',
    to: '/mobile',
    icon: 'i-lucide-smartphone'
  }
]

const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <aside
    class="fixed top-0 left-0 bottom-0 z-20 flex flex-col bg-default border-r border-muted overflow-y-auto"
    style="width: 220px;"
  >
    <!-- Logo -->
    <div class="px-5 py-5 border-b border-muted">
      <div class="text-xs font-semibold tracking-widest text-primary">
        L'ANTICA STAZIONE
      </div>
      <div class="text-xs text-muted mt-0.5">Panel zarządzania</div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 p-2.5">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5"
        :class="isActive(item.to)
          ? 'bg-primary/10 text-primary'
          : 'text-muted hover:bg-elevated hover:text-default'"
      >
        <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Footer -->
    <div class="px-5 py-3.5 border-t border-muted text-xs text-muted">
      <div class="font-medium text-default">Anna Kowalska</div>
      <div class="mt-0.5">Administrator</div>
    </div>
  </aside>
</template>
