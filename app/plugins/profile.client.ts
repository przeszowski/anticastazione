// Ładuje profil + uprawnienia użytkownika niezawodnie — przez nasłuch Supabase Auth.
// Działa po stronie klienta (.client), bo zależy od sesji w przeglądarce.
export default defineNuxtPlugin(() => {
  const client = useSupabaseClient()
  const { odswiezProfil } = useAuth()

  // 1. Istniejąca sesja przy wejściu na stronę (np. po odświeżeniu)
  client.auth.getSession().then(({ data }) => {
    if (data.session?.user) odswiezProfil(data.session.user.id)
  })

  // 2. Każda zmiana stanu logowania (logowanie, odświeżenie tokenu, wylogowanie)
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) odswiezProfil(session.user.id)
  })
})
