// Composable opakowujący @nuxtjs/supabase z typami naszej bazy
import type { Database, StatusWykonania } from '~/types/database.types'
import type { ExecutionTimerAction } from '~/utils/executionTimer'
import { buildTimerMutation } from '~/utils/executionTimer'

type Stanowisko = Database['public']['Tables']['stanowiska']['Row']
type Procedura = Database['public']['Tables']['procedury']['Row']
export type ProceduraWithStanowisko = Procedura & {
  stanowiska: Pick<Stanowisko, 'nazwa' | 'dzial'> | null
}
export type WykonanieWithRelations = Database['public']['Tables']['wykonania']['Row'] & {
  procedury: Pick<Procedura, 'nazwa' | 'opis' | 'pora_dnia' | 'norma_min'> | null
  stanowiska: Pick<Stanowisko, 'nazwa'> | null
}

export const useDb = () => {
  const client = useSupabaseClient<Database>()
  return client
}

// Stanowiska
export const useStanowiska = () => {
  const db = useDb()

  const stanowiska = ref<Stanowisko[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await db
        .from('stanowiska')
        .select('*')
        .order('kolejnosc')
      if (err) error.value = err.message
      else stanowiska.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Database['public']['Tables']['stanowiska']['Insert']) {
    const { data, error: err } = await db.from('stanowiska').insert(payload).select().single()
    if (err) throw err
    return data
  }

  async function update(id: string, payload: Database['public']['Tables']['stanowiska']['Update']) {
    const { data, error: err } = await db.from('stanowiska').update(payload).eq('id', id).select().single()
    if (err) throw err
    return data
  }

  async function remove(id: string) {
    const { error: err } = await db.from('stanowiska').delete().eq('id', id)
    if (err) throw err
  }

  async function fetchOne(id: string) {
    const { data, error: err } = await db.from('stanowiska').select('*').eq('id', id).single()
    if (err) throw err
    return data
  }

  return { stanowiska, loading, error, fetch, fetchOne, create, update, remove }
}

// Procedury
export const useProcedury = () => {
  const db = useDb()

  const procedury = ref<ProceduraWithStanowisko[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch(stanowiskoId?: string) {
    loading.value = true
    error.value = null
    try {
      let q = db.from('procedury').select('*, stanowiska(nazwa, dzial)').order('kolejnosc')
      if (stanowiskoId) q = q.eq('stanowisko_id', stanowiskoId)
      const { data, error: err } = await q
      if (err) error.value = err.message
      else procedury.value = (data ?? []) as ProceduraWithStanowisko[]
    } finally {
      loading.value = false
    }
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

  async function fetchOne(id: string) {
    const { data, error: err } = await db
      .from('procedury')
      .select('*, stanowiska(nazwa, dzial)')
      .eq('id', id)
      .single()
    if (err) throw err
    return data as ProceduraWithStanowisko
  }

  return { procedury, loading, error, fetch, fetchOne, create, update, remove }
}

// Wykonania (raporty)
export const useWykonania = () => {
  const db = useDb()

  const wykonania = ref<WykonanieWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDzien(data_dnia: string, stanowiskoId?: string) {
    loading.value = true
    error.value = null
    try {
      let q = db
        .from('wykonania')
        .select('*, procedury(nazwa, opis, pora_dnia, norma_min), stanowiska(nazwa)')
        .eq('data_dnia', data_dnia)
        .order('created_at', { ascending: false })
      if (stanowiskoId) q = q.eq('stanowisko_id', stanowiskoId)
      const { data, error: err } = await q
      if (err) error.value = err.message
      else wykonania.value = (data ?? []) as WykonanieWithRelations[]
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Database['public']['Tables']['wykonania']['Insert']) {
    const { data, error: err } = await db.from('wykonania').insert(payload).select().single()
    if (err) throw err
    return data
  }

  async function updateOne(
    id: string,
    payload: Database['public']['Tables']['wykonania']['Update']
  ) {
    const { data, error: err } = await db.from('wykonania').update(payload).eq('id', id).select().single()
    if (err) throw err

    const index = wykonania.value.findIndex(item => item.id === id)
    const current = wykonania.value[index]
    if (current) {
      wykonania.value[index] = {
        ...current,
        ...data,
        procedury: current.procedury,
        stanowiska: current.stanowiska
      }
    }
    return data
  }

  async function applyTimerAction(
    execution: WykonanieWithRelations,
    action: ExecutionTimerAction,
    note?: string
  ) {
    const mutation = buildTimerMutation(execution, action, new Date(), note)
    await updateOne(execution.id, mutation.payload)
  }

  return { wykonania, loading, error, fetchDzien, create, applyTimerAction }
}
