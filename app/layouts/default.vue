<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)
const isMobile = ref(false)
let mobileMedia: MediaQueryList | undefined

watch(() => route.fullPath, () => {
  menuOpen.value = false
})

watch(menuOpen, (open) => {
  if (import.meta.client) document.body.classList.toggle('mobile-menu-open', open)
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false
}

function syncBreakpoint(event: MediaQueryList | MediaQueryListEvent) {
  isMobile.value = event.matches
  if (!event.matches) menuOpen.value = false
}

onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 767px)')
  syncBreakpoint(mobileMedia)
  mobileMedia.addEventListener('change', syncBreakpoint)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  mobileMedia?.removeEventListener('change', syncBreakpoint)
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('mobile-menu-open')
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar :open="menuOpen" :mobile="isMobile" @close="menuOpen = false" />

    <button
      v-if="menuOpen && isMobile"
      type="button"
      class="sidebar-backdrop"
      aria-label="Zamknij menu"
      @click="menuOpen = false"
    />

    <div class="app-main">
      <header class="mobile-appbar">
        <button
          type="button"
          class="mobile-menu-button"
          aria-label="Otwórz menu"
          aria-controls="app-sidebar"
          :aria-expanded="menuOpen"
          @click="menuOpen = true"
        >
          <UIcon name="i-lucide-menu" class="size-5" />
        </button>
        <div class="min-w-0">
          <div class="truncate text-[13px] font-semibold text-[#8a6830]">L'ANTICA STAZIONE</div>
          <div class="truncate text-[11px] text-[#9ca3af]">Panel zarządzania</div>
        </div>
      </header>

      <main class="app-page">
        <slot />
      </main>
    </div>
  </div>
</template>
