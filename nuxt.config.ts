// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2025-01-01',
  // DevTools wyłączone — w dev dokłada zauważalny narzut.
  devtools: { enabled: false },

  modules: ['@nuxt/ui', '@nuxtjs/supabase'],

  // Ikony lokalnie (pakiet @iconify-json/lucide) — bez pobierania z sieci przy renderze.
  icon: {
    serverBundle: 'local'
  },

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
      // /m to osobna aplikacja mobilna z własnym logowaniem i ochroną (middleware mobile-auth)
      exclude: ['/login', '/confirm', '/m', '/m/login']
    }
  },

  css: ['~/assets/css/main.css'],

  // Wymusza prebundling pakietu "cookie" przez Vite — naprawia błąd
  // "@supabase/ssr ... does not provide an export named 'parse'" w trybie dev.
  vite: {
    optimizeDeps: {
      include: ['cookie']
    }
  },

  app: {
    head: {
      title: "L'Antica Stazione — Procedury",
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
