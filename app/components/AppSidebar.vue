<script setup lang="ts">
const route = useRoute()
const { imieNazwisko, rola, can, logout, odswiezProfil, profil } = useAuth()

// Załaduj profil użytkownika przy wejściu (jeśli jeszcze nie wczytany)
onMounted(() => {
  if (!profil.value) odswiezProfil()
})

// Pozycje menu z wymaganym uprawnieniem; jeśli brak — pozycja ukryta
const navItems = computed(() => [
  { label: 'Procedury', to: '/procedury', icon: 'i-lucide-clipboard-list', perm: 'procedury:read' },
  { label: 'Stanowiska', to: '/stanowiska', icon: 'i-lucide-building-2', perm: 'stanowiska:read' },
  { label: 'Raporty', to: '/raporty', icon: 'i-lucide-bar-chart-2', perm: 'raporty:read' },
  { label: 'Widok mobilny', to: '/m', icon: 'i-lucide-smartphone', perm: 'wykonania:read' },
  { label: 'Użytkownicy', to: '/uzytkownicy', icon: 'i-lucide-users', perm: 'users:read' },
  { label: 'Role', to: '/role', icon: 'i-lucide-shield-check', perm: 'roles:read' }
].filter(item => can(item.perm)))

const isActive = (to: string) => route.path.startsWith(to)
</script>

<template>
  <aside
    class="fixed top-0 left-0 bottom-0 z-20 flex flex-col bg-default border-r border-muted overflow-y-auto"
    style="width: 220px;"
  >
    <!-- Logo -->
    <div class="px-5 py-5 border-b border-muted">
      <div class="text-xs font-semibold tracking-widest" style="color: #c59d5f;">
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
    <div class="px-3 py-3.5 border-t border-muted">
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
