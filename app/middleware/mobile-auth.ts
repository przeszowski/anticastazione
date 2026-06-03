// Ochrona widoku mobilnego: niezalogowanych kieruje na mobilne logowanie /m/login.
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/m/login')
  }
})
