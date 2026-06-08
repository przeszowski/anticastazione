import { expect, test } from '@playwright/test'

const supabaseUrl = process.env.SUPABASE_URL || 'https://unqqhgcnvzntasazitdr.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_oEGS-DkRpxOG-ZkD71iWTw_xsMQmPpz'

test('anonymous Supabase REST access cannot read business tables', async ({ request }) => {
  const response = await request.get(`${supabaseUrl}/rest/v1/procedury?select=id&limit=1`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  })

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual([])
})
