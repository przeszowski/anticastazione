<script setup lang="ts">
definePageMeta({ layout: 'mobile' })

const { login } = useAuth()
const user = useSupabaseUser()

const email = ref('')
const haslo = ref('')
const pokazHaslo = ref(false)
const ladowanie = ref(false)
const blad = ref<string | null>(null)

watchEffect(() => {
  if (user.value) navigateTo('/m')
})

async function zaloguj() {
  blad.value = null
  if (!email.value || !haslo.value) {
    blad.value = 'Podaj email i hasło.'
    return
  }
  ladowanie.value = true
  try {
    await login(email.value, haslo.value)
    await navigateTo('/m')
  } catch (e: any) {
    blad.value = e?.message === 'Invalid login credentials'
      ? 'Nieprawidłowy email lub hasło.'
      : (e?.message || 'Błąd logowania.')
  } finally {
    ladowanie.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col px-6 pt-16 pb-8" style="background:linear-gradient(180deg,#fdf8f1 0%,#f6ead7 100%);">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="text-xs font-medium tracking-[0.25em] mb-1" style="color:#b08840;">L'ANTICA</div>
      <div class="text-2xl font-semibold" style="color:#1a1008;">STAZIONE</div>
      <div class="text-[11px] tracking-[0.2em] text-muted mt-2">SYSTEM ZARZĄDZANIA PROCEDURAMI</div>
    </div>

    <!-- Karta -->
    <div class="rounded-3xl p-6 bg-default border" style="border-color:rgba(197,157,95,.35);box-shadow:0 8px 40px rgba(197,157,95,.18);">
      <h1 class="text-lg font-semibold text-default">Witaj z powrotem!</h1>
      <p class="text-sm text-muted mt-0.5 mb-5">Zaloguj się, aby zobaczyć swoje zadania.</p>

      <form class="flex flex-col gap-4" @submit.prevent="zaloguj">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-default">Email</label>
          <UInput v-model="email" type="email" placeholder="adres@email.pl" size="lg" class="w-full" autocomplete="email" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-default">Hasło</label>
          <UInput v-model="haslo" :type="pokazHaslo ? 'text' : 'password'" placeholder="Wprowadź hasło…" size="lg" class="w-full" autocomplete="current-password">
            <template #trailing>
              <button type="button" class="text-muted" @click="pokazHaslo = !pokazHaslo">
                <UIcon :name="pokazHaslo ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
              </button>
            </template>
          </UInput>
        </div>

        <UAlert v-if="blad" color="error" variant="subtle" :title="blad" icon="i-lucide-alert-circle" />

        <UButton type="submit" size="lg" block :loading="ladowanie" label="Zaloguj się" />
      </form>
    </div>

    <p class="text-center text-xs text-muted mt-6">
      Problem z logowaniem? Skontaktuj się z kierownikiem.
    </p>
  </div>
</template>
