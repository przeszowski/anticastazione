// Zarządzanie użytkownikami i rolami (panel administracyjny).
import type { Database } from '~/types/database.types'

type ProfilRow = Database['public']['Tables']['profiles']['Row'] & {
  roles?: { id: string; nazwa: string } | null
  stanowiska?: { nazwa: string } | null
}

export const useUsers = () => {
  const db = useSupabaseClient<Database>()

  const users = ref<ProfilRow[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('profiles')
        .select('*, roles(id, nazwa), stanowiska(nazwa)')
        .order('created_at', { ascending: false })
      if (err) error.value = err.message
      else users.value = (data ?? []) as ProfilRow[]
    } finally {
      loading.value = false
    }
  }

  async function setRole(userId: string, roleId: string) {
    const { error: err } = await db.from('profiles').update({ role_id: roleId }).eq('id', userId)
    if (err) throw err
    await fetch()
  }

  async function setActive(userId: string, aktywny: boolean) {
    const { error: err } = await db.from('profiles').update({ aktywny }).eq('id', userId)
    if (err) throw err
    await fetch()
  }

  return { users, loading, error, fetch, setRole, setActive }
}

export const useRoles = () => {
  const db = useSupabaseClient<Database>()

  const roles = ref<Database['public']['Tables']['roles']['Row'][]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db.from('roles').select('*').order('nazwa')
      if (err) error.value = err.message
      else roles.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  return { roles, loading, error, fetch }
}
