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

  // Pobierz profil zalogowanego użytkownika wraz z rolą i uprawnieniami
  async function odswiezProfil() {
    if (!supaUser.value) {
      profil.value = null
      uprawnienia.value = []
      return
    }
    const { data, error } = await client
      .from('profiles')
      .select('*, roles(nazwa, permissions)')
      .eq('id', supaUser.value.id)
      .single()
    if (!error && data) {
      profil.value = data as any
      uprawnienia.value = (data as any).roles?.permissions ?? []
    }
  }

  async function login(email: string, haslo: string) {
    const { error } = await client.auth.signInWithPassword({ email, password: haslo })
    if (error) throw error
    await odswiezProfil()
  }

  async function logout() {
    await client.auth.signOut()
    profil.value = null
    uprawnienia.value = []
    await navigateTo('/login')
  }

  return {
    user: supaUser,
    profil,
    uprawnienia,
    zalogowany,
    rola,
    imieNazwisko,
    can,
    login,
    logout,
    odswiezProfil
  }
}
