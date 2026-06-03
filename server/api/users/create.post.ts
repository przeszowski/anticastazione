// Serwerowy endpoint: tworzenie konta użytkownika przez admina.
// Wymaga klucza serwisowego Supabase (SUPABASE_SERVICE_KEY w .env) —
// klucz NIGDY nie trafia do przeglądarki, używany tylko po stronie serwera.
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Brak konfiguracji: ustaw SUPABASE_SERVICE_KEY w pliku .env (klucz serwisowy z Supabase → Project Settings → API).'
    })
  }

  // 1. Sprawdź, kto woła — musi być zalogowany
  const caller = await serverSupabaseUser(event)
  if (!caller) {
    throw createError({ statusCode: 401, statusMessage: 'Nie jesteś zalogowany.' })
  }

  // Klient serwisowy (omija RLS) — tylko po stronie serwera
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 2. Sprawdź uprawnienie wołającego: users:create
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('roles(permissions)')
    .eq('id', caller.id)
    .single()
  const callerPerms: string[] = (callerProfile as any)?.roles?.permissions ?? []
  if (!callerPerms.includes('users:create')) {
    throw createError({ statusCode: 403, statusMessage: 'Brak uprawnień do tworzenia użytkowników.' })
  }

  // 3. Dane nowego użytkownika
  const body = await readBody(event)
  const { imie, nazwisko, email, telefon, haslo, rola, stanowisko_id } = body || {}

  if (!email || !haslo) {
    throw createError({ statusCode: 400, statusMessage: 'Email i hasło są wymagane.' })
  }

  // 4. Utwórz konto — trigger handle_new_user założy profil z metadanych
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: haslo,
    email_confirm: true,
    user_metadata: {
      imie: imie ?? '',
      nazwisko: nazwisko ?? '',
      telefon: telefon ?? null,
      rola: rola ?? 'PRACOWNIK',
      stanowisko_id: stanowisko_id || null
    }
  })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { ok: true, id: data.user?.id }
})
