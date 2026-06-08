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
  <div class="login-page">
    <div class="text-center">
      <div class="brand-script">L’Antica</div>
      <div class="brand-name">STAZIONE</div>
      <div class="brand-sub">CUCINA ITALIANA</div>
      <div class="system-name">SYSTEM ZARZĄDZANIA PROCEDURAMI</div>
      <div class="gold-line" />
    </div>

    <div class="login-card">
      <h1 class="text-lg font-semibold text-default">Witaj z powrotem!</h1>
      <p class="mt-0.5 mb-5 text-[13px] text-muted">Zaloguj się, aby zobaczyć zadania</p>

      <form class="flex flex-col gap-2.5" @submit.prevent="zaloguj">
        <UInput v-model="email" type="email" placeholder="Login" size="xl" class="login-input w-full" autocomplete="email" />

        <UInput v-model="haslo" :type="pokazHaslo ? 'text' : 'password'" placeholder="PIN / hasło" size="xl" class="login-input w-full" autocomplete="current-password">
          <template #trailing>
            <button type="button" class="text-muted" @click="pokazHaslo = !pokazHaslo">
              <UIcon :name="pokazHaslo ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
            </button>
          </template>
        </UInput>

        <UAlert v-if="blad" color="error" variant="subtle" :title="blad" icon="i-lucide-alert-circle" />

        <button type="submit" class="login-submit" :disabled="ladowanie">
          <UIcon v-if="ladowanie" name="i-lucide-loader-circle" class="size-4 animate-spin" />
          <span>Zaloguj się</span>
        </button>
      </form>
    </div>

    <p class="text-center text-xs text-muted mt-6">
      Problem z logowaniem? Skontaktuj się z kierownikiem.
    </p>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  min-height: 100dvh;
  flex: 1;
  flex-direction: column;
  padding: 72px 28px 36px;
  background:
    radial-gradient(ellipse 320px 280px at 20% 10%, rgb(197 157 95 / 22%), transparent 60%),
    radial-gradient(ellipse 280px 320px at 85% 90%, rgb(197 157 95 / 18%), transparent 60%),
    #fff;
}

.brand-script,
.brand-name {
  color: #c59d5f;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 400;
  line-height: .95;
}

.brand-script { font-size: 31px; }
.brand-name { margin-top: 4px; font-size: 38px; letter-spacing: .02em; }
.brand-sub { margin-top: 7px; color: #b08840; font-size: 7px; letter-spacing: .35em; }
.system-name { margin-top: 20px; color: #9ca3af; font-size: 10px; letter-spacing: .18em; }
.gold-line { width: 32px; height: 2px; margin: 20px auto 28px; border-radius: 2px; background: #c59d5f; }

.login-card {
  width: 100%;
  border: 1px solid rgb(197 157 95 / 35%);
  border-radius: 20px;
  padding: 24px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 8px 40px rgb(197 157 95 / 20%), 0 2px 12px rgb(0 0 0 / 5%);
  backdrop-filter: blur(20px);
}

.login-input :deep(input) {
  min-height: 48px;
  border-radius: 12px;
  color: #111827;
  background: #fff;
}

.login-submit {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #c59d5f, #b08840);
  box-shadow: 0 4px 16px rgb(197 157 95 / 30%);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.login-submit:disabled { opacity: .65; }
</style>
