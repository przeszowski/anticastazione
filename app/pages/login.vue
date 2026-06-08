<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()
const user = useSupabaseUser()
const toast = useToast()

const email = ref('')
const haslo = ref('')
const pokazHaslo = ref(false)
const ladowanie = ref(false)
const blad = ref<string | null>(null)

// Jeśli już zalogowany — przejdź do panelu
watchEffect(() => {
  if (user.value) navigateTo('/raporty')
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
    await navigateTo('/raporty')
  } catch (e: any) {
    blad.value = e?.message === 'Invalid login credentials'
      ? 'Nieprawidłowy email lub hasło.'
      : (e?.message || 'Błąd logowania. Spróbuj ponownie.')
  } finally {
    ladowanie.value = false
  }
}

function przypomnienieHasla() {
  toast.add({
    title: 'Reset hasła',
    description: 'Skontaktuj się z administratorem, aby zresetować hasło.',
    color: 'info'
  })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
    <div class="w-full max-w-md">
      <!-- Logo nad kartą -->
      <div class="text-center mb-6">
        <div class="text-lg font-semibold tracking-[0.25em]" style="color: #c59d5f;">
          L'ANTICA STAZIONE
        </div>
        <div class="text-sm text-muted mt-1">Panel zarządzania — Procedury</div>
      </div>

      <!-- Karta logowania -->
      <div class="rounded-[10px] border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <!-- Ikona + nagłówek -->
        <div class="flex flex-col items-center text-center mb-7">
          <div class="mb-3 flex size-12 items-center justify-center rounded-full bg-[#fdf6ec]">
            <UIcon name="i-lucide-user" class="w-6 h-6 text-muted" />
          </div>
          <h1 class="text-xl font-bold text-default">Witaj ponownie!</h1>
          <p class="text-sm text-muted mt-1">
            Nie masz konta? Skontaktuj się z administratorem.
          </p>
        </div>

        <form class="flex flex-col gap-5" @submit.prevent="zaloguj">
          <!-- Email -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-default">
              Email <span style="color: #c59d5f;">*</span>
            </label>
            <UInput
              v-model="email"
              type="email"
              placeholder="Wprowadź email…"
              autocomplete="email"
              size="lg"
              class="w-full"
            />
          </div>

          <!-- Hasło -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-default">
                Hasło <span style="color: #c59d5f;">*</span>
              </label>
              <button
                type="button"
                class="text-sm hover:underline"
                style="color: #c59d5f;"
                @click="przypomnienieHasla"
              >
                Zapomniałeś hasła?
              </button>
            </div>
            <UInput
              v-model="haslo"
              :type="pokazHaslo ? 'text' : 'password'"
              placeholder="Wprowadź hasło…"
              autocomplete="current-password"
              size="lg"
              class="w-full"
            >
              <template #trailing>
                <button type="button" class="text-muted hover:text-default" @click="pokazHaslo = !pokazHaslo">
                  <UIcon :name="pokazHaslo ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
                </button>
              </template>
            </UInput>
          </div>

          <!-- Błąd -->
          <UAlert
            v-if="blad"
            color="error"
            variant="subtle"
            :title="blad"
            icon="i-lucide-alert-circle"
          />

          <!-- Przycisk -->
          <UButton
            type="submit"
            size="lg"
            block
            :loading="ladowanie"
            label="Zaloguj się"
          />
        </form>
      </div>
    </div>
  </div>
</template>
