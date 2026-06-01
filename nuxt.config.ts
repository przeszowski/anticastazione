// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxtjs/supabase'],

  supabase: {
    // URL i klucz publiczny (publishable) — bezpiecznie trzymać w configu,
    // bo i tak trafiają do przeglądarki. .env ma pierwszeństwo, gdy jest wczytany.
    url: process.env.SUPABASE_URL || 'https://unqqhgcnvzntasazitdr.supabase.co',
    key: process.env.SUPABASE_KEY || 'sb_publishable_oEGS-DkRpxOG-ZkD71iWTw_xsMQmPpz',
    // Auto-przekierowanie niezalogowanych na /login.
    // Strony w "exclude" są publiczne (dostępne bez logowania).
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm']
    }
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: "L'Antica Stazione — Procedury",
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
