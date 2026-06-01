<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()
const user = useSupabaseUser()

const email = ref('')
const haslo = ref('')
const ladowanie = ref(false)
const blad = ref<string | null>(null)

// Jeśli już zalogowany — przejdź do panelu
watchEffect(() => {
  if (user.value) navigateTo('/raporty')
})

async function zaloguj() {
  blad.value = null
  ladowanie.value = true
  try {
    await login(email.value, haslo.value)
    await navigateTo('/raporty')
  } catch (e: any) {
    blad.value = e?.message === 'Invalid login credentials'
      ? 'Nieprawidłowy email lub hasło.'
      : (e?.message || 'Błąd logowania. Spróbuj ponownie.')
  } finally {
    ladowanie.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-elevated px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="text-lg font-semibold tracking-[0.2em]" style="color: #c59d5f;">
          L'ANTICA STAZIONE
        </div>
        <div class="text-sm text-muted mt-1">Panel zarządzania — Procedury</div>
      </div>

      <!-- Karta logowania -->
      <UCard>
        <form class="flex flex-col gap-4" @submit.prevent="zaloguj">
          <h1 class="text-base font-medium text-default">Zaloguj się</h1>

          <UFormField label="Email">
            <UInput
              v-model="email"
              type="email"
              placeholder="adres@email.pl"
              autocomplete="email"
              size="lg"
              class="w-full"
              required
            />
          </UFormField>

          <UFormField label="Hasło">
            <UInput
              v-model="haslo"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              size="lg"
              class="w-full"
              required
            />
          </UFormField>

          <UAlert
            v-if="blad"
            color="error"
            variant="subtle"
            :title="blad"
            icon="i-lucide-alert-circle"
          />

          <UButton
            type="submit"
            size="lg"
            block
            :loading="ladowanie"
            label="Zaloguj się"
          />
        </form>
      </UCard>

      <p class="text-center text-xs text-muted mt-6">
        Nie masz konta? Skontaktuj się z administratorem.
      </p>
    </div>
  </div>
</template>
