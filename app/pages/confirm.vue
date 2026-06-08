<script setup lang="ts">
// Strona docelowa po potwierdzeniu logowania (callback Supabase).
definePageMeta({ layout: false })

const { odswiezProfil } = useAuth()
const user = useSupabaseUser()

watch(user, async (u) => {
  if (u) {
    await odswiezProfil()
    await navigateTo('/raporty')
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#f9fafb]">
    <div class="text-muted text-sm">Logowanie…</div>
  </div>
</template>
