// Serwerowy endpoint: tworzenie konta użytkownika przez admina.
// Wymaga klucza serwisowego Supabase (SUPABASE_SERVICE_KEY w .env) —
// klucz NIGDY nie trafia do przeglądarki, używany tylko po stronie serwera.
import { createClient } from '@supabase/supabase-js'
import { serverSupabaseUser } from '#supabase/server'

interface CreateUserBody {
  imie?: string
  nazwisko?: string
  email?: string
  telefon?: string | null
  haslo?: string
  rola?: string
  stanowisko_id?: string | null
}

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function permissionsFromProfile(profile: unknown) {
  if (!profile || typeof profile !== 'object' || !('roles' in profile)) return []
  const roles = (profile as { roles?: unknown }).roles
  const role = Array.isArray(roles) ? roles[0] : roles
  if (!role || typeof role !== 'object' || !('permissions' in role)) return []
  const permissions = (role as { permissions?: unknown }).permissions
  return Array.isArray(permissions)
    ? permissions.filter((permission): permission is string => typeof permission === 'string')
    : []
}

export default defineEventHandler(async (event) => {
  const caller = await serverSupabaseUser(event)
  if (!caller) {
    throw createError({ statusCode: 401, statusMessage: 'Nie jesteś zalogowany.' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Brak konfiguracji: ustaw SUPABASE_SERVICE_KEY w pliku .env (klucz serwisowy z Supabase → Project Settings → API).'
    })
  }

  // Klient serwisowy (omija RLS) — tylko po stronie serwera
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 2. Sprawdź uprawnienie wołającego: users:create
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('roles(permissions)')
    .eq('id', caller.id)
    .single()
  if (profileError) {
    throw createError({ statusCode: 403, statusMessage: 'Nie udało się potwierdzić uprawnień.' })
  }
  const callerPerms = permissionsFromProfile(callerProfile)
  if (!callerPerms.includes('users:create')) {
    throw createError({ statusCode: 403, statusMessage: 'Brak uprawnień do tworzenia użytkowników.' })
  }

  // 3. Dane nowego użytkownika
  const body = await readBody<CreateUserBody>(event)
  const email = optionalText(body?.email).toLowerCase()
  const haslo = typeof body?.haslo === 'string' ? body.haslo : ''

  if (!email || !haslo) {
    throw createError({ statusCode: 400, statusMessage: 'Email i hasło są wymagane.' })
  }
  if (!email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Podaj poprawny adres email.' })
  }
  if (haslo.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Hasło musi mieć co najmniej 6 znaków.' })
  }

  const roleName = optionalText(body.rola) || 'PRACOWNIK'
  const { data: role } = await admin.from('roles').select('nazwa').eq('nazwa', roleName).maybeSingle()
  if (!role) {
    throw createError({ statusCode: 400, statusMessage: 'Wybrana rola nie istnieje.' })
  }

  const stationId = optionalText(body.stanowisko_id) || null
  if (stationId) {
    const { data: station } = await admin.from('stanowiska').select('id').eq('id', stationId).maybeSingle()
    if (!station) {
      throw createError({ statusCode: 400, statusMessage: 'Wybrane stanowisko nie istnieje.' })
    }
  }

  // 4. Utwórz konto — trigger handle_new_user założy profil z metadanych
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: haslo,
    email_confirm: true,
    user_metadata: {
      imie: optionalText(body.imie),
      nazwisko: optionalText(body.nazwisko),
      telefon: optionalText(body.telefon) || null,
      rola: roleName,
      stanowisko_id: stationId
    }
  })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { ok: true, id: data.user?.id }
})
