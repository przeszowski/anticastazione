<script setup lang="ts">
const route = useRoute()
const { imieNazwisko, rola, can, logout, odswiezProfil, profil } = useAuth()

// Załaduj profil użytkownika przy wejściu (jeśli jeszcze nie wczytany)
onMounted(() => {
  if (!profil.value) odswiezProfil()
})

// Pozycje menu z wymaganym uprawnieniem; jeśli brak — pozycja ukryta
const navItems = computed(() => [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard', perm: 'raporty:read' },
  { label: 'Procedury', to: '/procedury', icon: 'i-lucide-clipboard-list', perm: 'procedury:read' },
  { label: 'Stanowiska', to: '/stanowiska', icon: 'i-lucide-building-2', perm: 'stanowiska:read' },
  { label: 'Raporty', to: '/raporty', icon: 'i-lucide-bar-chart-2', perm: 'raporty:read' },
  { label: 'Widok mobilny', to: '/m', icon: 'i-lucide-smartphone', perm: 'wykonania:read' },
  { label: 'Użytkownicy', to: '/uzytkownicy', icon: 'i-lucide-users', perm: 'users:read' },
  { label: 'Role', to: '/role', icon: 'i-lucide-shield-check', perm: 'roles:read' }
].filter(item => can(item.perm)))

const isActive = (to: string) => to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>

<template>
  <aside
    class="fixed top-0 left-0 bottom-0 z-20 flex flex-col overflow-y-auto border-r bg-white"
    style="width: 220px; border-color: var(--antica-border);"
  >
    <!-- Logo -->
    <div class="border-b px-5 pb-4 pt-5" style="border-color: var(--antica-border);">
      <div class="text-[13px] font-semibold tracking-[.04em]" style="color: var(--antica-brand);">
        L'ANTICA STAZIONE
      </div>
      <div class="mt-0.5 text-[11px]" style="color: var(--antica-tertiary);">Panel zarządzania</div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2.5 py-3">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-[#fdf6ec] text-[#b08840]'
          : 'text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827]'"
      >
        <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Footer -->
    <div class="border-t px-4 py-3.5" style="border-color: var(--antica-border);">
      <div class="px-2 mb-2">
        <div class="text-xs font-medium text-default truncate">{{ imieNazwisko || '—' }}</div>
        <div class="text-xs text-muted mt-0.5">{{ rola || '—' }}</div>
      </div>
      <UButton
        block
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-log-out"
        label="Wyloguj"
        @click="logout"
      />
    </div>
  </aside>
</template>
