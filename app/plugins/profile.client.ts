// Ładuje profil + uprawnienia użytkownika niezawodnie — przez nasłuch Supabase Auth.
// Działa po stronie klienta (.client), bo zależy od sesji w przeglądarce.
export default defineNuxtPlugin(() => {
  const client = useSupabaseClient()
  const { clearProfile, odswiezProfil } = useAuth()

  // INITIAL_SESSION obsługuje istniejącą sesję, kolejne zdarzenia jej zmiany.
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) void odswiezProfil(session.user.id)
    else clearProfile()
  })
})
