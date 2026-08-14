import { test, expect } from '@playwright/test'

test.describe('Occasion flow', () => {
  test('plans a mock dinner occasion with an empty local wardrobe', async ({ page }) => {
    await page.route('**/api/occasions/*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }

      const response = await route.fetch()
      const occasion = (await response.json()) as { outfits?: unknown[] }
      await route.fulfill({
        response,
        body: JSON.stringify({ ...occasion, outfits: [] }),
      })
    })

    await page.route('**/api/wardrobe', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
        return
      }

      await route.continue()
    })

    await page.goto('/occasion')
    await expect(
      page.getByRole('heading', { name: 'Plan an occasion' }),
    ).toBeVisible()
    await expect(page.getByLabel('Event type')).toHaveValue('dinner')

    await page.getByLabel('Venue / company name *').fill('Skyline Rooftop Bar')
    await page.getByLabel('Location (optional)').fill('Downtown')
    await page.getByLabel('Theme (optional)').fill('team celebration')
    await page.getByRole('button', { name: 'Compose outfits' }).click()

    await page.waitForURL(/\/occasion\/[^/]+$/, { timeout: 30_000 })

    await expect(
      page.getByRole('heading', { name: 'Your occasion outfits' }),
    ).toBeVisible()
    await expect(
      page.getByText('Skyline Rooftop Bar · Dinner', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Smart Casual', { exact: true })).toBeVisible()
    await expect(
      page.getByText(
        'Rooftop venues trend upscale-casual — tailored but relaxed.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(page.getByText('Mock venue lookup', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Dinner · team celebration · Downtown', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Add your pieces first', exact: true }),
    ).toBeVisible()
  })
})
