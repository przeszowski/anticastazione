import { config as loadEnv } from 'dotenv'

loadEnv()

export default {
  compatibilityDate: '2026-06-01',
  modules: ['@nuxt/ui', '@nuxtjs/supabase'],
  css: ['@/assets/css/main.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {}
    }
  },
  runtimeConfig: {
    public: {
      supabase: {
        url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
      }
    }
  },
  nitro: {
    preset: 'node-server'
  }
}
