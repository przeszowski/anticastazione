// Autoryzacja i uprawnienia — opakowanie nad Supabase Auth.
import type { Database } from '~/types/database.types'

type Profil = Database['public']['Tables']['profiles']['Row'] & {
  roles?: { nazwa: string; permissions: string[] } | null
}

export const useAuth = () => {
  const supaUser = useSupabaseUser()
  const client = useSupabaseClient<Database>()

  // Profil + uprawnienia trzymamy w stanie współdzielonym (cache na czas sesji)
  const profil = useState<Profil | null>('profil', () => null)
  const uprawnienia = useState<string[]>('uprawnienia', () => [])

  const zalogowany = computed(() => !!supaUser.value)
  const rola = computed(() => profil.value?.roles?.nazwa ?? null)
  const imieNazwisko = computed(() => {
    const p = profil.value
    if (!p) return ''
    return [p.imie, p.nazwisko].filter(Boolean).join(' ') || p.email || ''
  })

  // Czy użytkownik ma dane uprawnienie (np. 'users:create')
  function can(permission: string) {
    return uprawnienia.value.includes(permission)
  }

  function clearProfile() {
    profil.value = null
    uprawnienia.value = []
  }

  // Pobierz profil zalogowanego użytkownika wraz z rolą i uprawnieniami
  async function odswiezProfil(uidArg?: string) {
    const uid = uidArg || supaUser.value?.id
    if (!uid) {
      clearProfile()
      return null
    }
    const { data, error } = await client
      .from('profiles')
      .select('*, roles(nazwa, permissions)')
      .eq('id', uid)
      .single()
    if (error) {
      console.warn('[useAuth] Nie udało się wczytać profilu:', error.message)
      clearProfile()
      return null
    }
    const nextProfil = data as Profil
    if (!nextProfil.aktywny) {
      profil.value = nextProfil
      uprawnienia.value = []
      return nextProfil
    }
    profil.value = nextProfil
    uprawnienia.value = nextProfil.roles?.permissions ?? []
    return nextProfil
  }

  async function ensureProfile() {
    if (profil.value) return profil.value
    const { data } = await client.auth.getUser()
    return data.user ? odswiezProfil(data.user.id) : null
  }

  async function login(email: string, haslo: string) {
    const { data, error } = await client.auth.signInWithPassword({ email, password: haslo })
    if (error) throw error
    // przekazujemy id z odpowiedzi — ref użytkownika może nie być jeszcze gotowy
    const userProfile = await odswiezProfil(data.user?.id)
    if (userProfile && !userProfile.aktywny) {
      await client.auth.signOut()
      clearProfile()
      throw new Error('Konto jest nieaktywne. Skontaktuj się z administratorem.')
    }
  }

  async function logout(redirectTo: string | Event = '/login') {
    const target = typeof redirectTo === 'string' ? redirectTo : '/login'
    await client.auth.signOut()
    clearProfile()
    await navigateTo(target)
  }

  return {
    user: supaUser,
    profil,
    uprawnienia,
    zalogowany,
    rola,
    imieNazwisko,
    can,
    clearProfile,
    login,
    logout,
    odswiezProfil,
    ensureProfile
  }
}
