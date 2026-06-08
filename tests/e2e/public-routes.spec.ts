import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test('desktop route redirects to a working light login form', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Witaj ponownie!' })).toBeVisible()

  const email = page.getByPlaceholder('Wprowadź email…')
  const password = page.getByPlaceholder('Wprowadź hasło…')
  await expect(email).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(password).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Pokaż hasło' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page.getByText('Podaj email i hasło.')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('mobile route redirects to the mobile login and remains responsive', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/m')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/m\/login$/)
  await expect(page.getByText('SYSTEM ZARZĄDZANIA PROCEDURAMI')).toBeVisible()

  const password = page.getByPlaceholder('PIN / hasło')
  await expect(password).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.getByRole('button', { name: 'Pokaż hasło' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page.getByText('Podaj email i hasło.')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('legacy mobile route keeps the mobile authentication flow', async ({ page }) => {
  await page.goto('/mobile')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/m\/login$/)
})

test('user creation endpoint rejects anonymous requests', async ({ request }) => {
  const response = await request.post('/api/users/create', {
    data: { email: 'test@example.com', haslo: 'secret123' }
  })
  expect(response.status()).toBe(401)
})
