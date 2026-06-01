// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxtjs/supabase'],

  supabase: {
    redirect: false  // wyłącz auto-redirect do /login
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
