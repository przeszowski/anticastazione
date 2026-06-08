import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test('authenticated desktop navigation and procedure filtering', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated checks.')

  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Wprowadź email…').fill(email!)
  await page.getByPlaceholder('Wprowadź hasło…').fill(password!)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page).toHaveURL(/\/raporty$/)

  await page.getByRole('link', { name: 'Procedury' }).click()
  await expect(page).toHaveURL(/\/procedury$/)
  await expect(page.getByText(/\d+ z \d+ procedur/)).toBeVisible()

  const search = page.getByPlaceholder('Szukaj...')
  await search.fill('tekst bez wyników e2e')
  await expect(page.getByText('Brak procedur spełniających filtry.')).toBeVisible()
  await page.getByRole('button', { name: 'Wyczyść' }).click()
})

test('authenticated mobile task list opens task details', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated checks.')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/m/login')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Login').fill(email!)
  await page.getByPlaceholder('PIN / hasło').fill(password!)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page).toHaveURL(/\/m$/)

  const cards = page.locator('.procedure-card')
  if (await cards.count()) {
    await cards.first().click()
    await expect(page.getByText('Opis procedury')).toBeVisible()
  }
})

test('authenticated administration shell uses a mobile drawer', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated checks.')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  await page.getByPlaceholder('Wprowadź email…').fill(email!)
  await page.getByPlaceholder('Wprowadź hasło…').fill(password!)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page).toHaveURL(/\/raporty$/)

  const menuButton = page.getByRole('button', { name: 'Otwórz menu' })
  await expect(menuButton).toBeVisible()
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

  await menuButton.click()
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#app-sidebar')).toHaveClass(/is-open/)

  await page.keyboard.press('Escape')
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
})
