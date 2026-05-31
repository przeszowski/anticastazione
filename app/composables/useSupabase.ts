// Composable opakowujący @nuxtjs/supabase z typami naszej bazy
import type { Database } from '~/types/database.types'

export const useDb = () => {
  const client = useSupabaseClient<Database>()
  return client
}

// Stanowiska
export const useStanowiska = () => {
  const db = useDb()

  const stanowiska = ref<Database['public']['Tables']['stanowiska']['Row'][]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    const { data, error: err } = await db
      .from('stanowiska')
      .select('*')
      .order('kolejnosc')
    if (err) error.value = err.message
    else stanowiska.value = data ?? []
    loading.value = false
  }

  return { stanowiska, loading, error, fetch }
}

// Procedury
export const useProcedury = () => {
  const db = useDb()

  const procedury = ref<Database['public']['Tables']['procedury']['Row'][]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(stanowiskoId?: string) {
    loading.value = true
    error.value = null
    let q = db.from('procedury').select('*, stanowiska(nazwa, dzial)').order('kolejnosc')
    if (stanowiskoId) q = q.eq('stanowisko_id', stanowiskoId)
    const { data, error: err } = await q
    if (err) error.value = err.message
    else procedury.value = (data as any) ?? []
    loading.value = false
  }

  async function create(payload: Database['public']['Tables']['procedury']['Insert']) {
    const { data, error: err } = await db.from('procedury').insert(payload).select().single()
    if (err) throw err
    return data
  }

  async function update(id: string, payload: Database['public']['Tables']['procedury']['Update']) {
    const { data, error: err } = await db.from('procedury').update(payload).eq('id', id).select().single()
    if (err) throw err
    return data
  }

  async function remove(id: string) {
    const { error: err } = await db.from('procedury').delete().eq('id', id)
    if (err) throw err
  }

  return { procedury, loading, error, fetch, create, update, remove }
}

// Wykonania (raporty)
export const useWykonania = () => {
  const db = useDb()

  const wykonania = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDzien(data_dnia: string) {
    loading.value = true
    error.value = null
    const { data, error: err } = await db
      .from('wykonania')
      .select('*, procedury(nazwa, pora_dnia, norma_min), stanowiska(nazwa)')
      .eq('data_dnia', data_dnia)
      .order('created_at', { ascending: false })
    if (err) error.value = err.message
    else wykonania.value = data ?? []
    loading.value = false
  }

  async function updateStatus(id: string, status: string, extra?: Record<string, any>) {
    const payload: any = { status, ...extra }
    if (status === 'w_trakcie') payload.czas_start = new Date().toISOString()
    if (status === 'wykonane') payload.czas_koniec = new Date().toISOString()
    const { data, error: err } = await db.from('wykonania').update(payload).eq('id', id).select().single()
    if (err) throw err
    return data
  }

  return { wykonania, loading, error, fetchDzien, updateStatus }
}
