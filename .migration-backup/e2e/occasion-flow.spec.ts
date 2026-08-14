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
      page.getByRole('heading', { name: 'Check your whole outfit' }),
    ).toBeVisible()
    await expect(page.getByLabel('Event type')).toHaveCount(0)
    await expect(page.getByLabel('Presentation')).toHaveCount(0)

    await page
      .getByLabel('What are you dressing for? *')
      .fill('rooftop dinner with my team')
    await page.getByRole('button', { name: 'Check my outfit' }).click()

    await page.waitForURL(/\/occasion\/[^/]+$/, { timeout: 30_000 })

    await expect(
      page.getByRole('heading', { name: 'Check your whole outfit' }),
    ).toBeVisible()
    await expect(
      page.getByText('rooftop dinner with my team · Dinner', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Smart Casual', { exact: true })).toBeVisible()
    await expect(
      page.getByText(
        'Rooftop venues trend upscale-casual — tailored but relaxed.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(
      page.getByText('Mock situation inference', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Add your pieces first', exact: true }),
    ).toBeVisible()
  })
})
