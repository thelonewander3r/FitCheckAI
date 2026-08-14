import { test, expect } from '@playwright/test'

test.describe('Occasion flow', () => {
  test('landing page opens the event intake', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Plan my event outfit', exact: true }).click()
    await page.waitForURL(/\/occasion$/)
    await expect(
      page.getByRole('heading', { name: 'Check your whole outfit' }),
    ).toBeVisible()
  })

  test('landing page opens the event demo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Try event demo', exact: true }).click()
    await page.waitForURL(/\/occasion\/[^/]+$/)
    await expect(
      page.getByText('Skyline Rooftop Bar · Dinner', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('Mock event inference', { exact: true }),
    ).toBeVisible()
  })

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
    await expect(page.getByLabel('Role title')).toHaveCount(0)
    await expect(page.getByLabel('Company')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Wedding guest', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Dinner date', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Conference', exact: true }),
    ).toBeVisible()

    await page
      .getByLabel('What event are you dressing for? *')
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
      page.getByText('Mock event inference', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Add your pieces first', exact: true }),
    ).toBeVisible()
  })

  test('asks for useful context when the event prompt is sparse', async ({ page }) => {
    await page.goto('/occasion')
    await page
      .getByLabel('What event are you dressing for? *')
      .fill('a wedding')

    await page.getByRole('button', { name: 'Add useful details' }).click()

    await expect(page.getByTestId('occasion-follow-up')).toBeVisible()
    await expect(
      page.getByLabel('Where is it happening? (optional)'),
    ).toBeVisible()
    await expect(
      page.getByLabel('Colors you prefer or want to avoid (optional)'),
    ).toBeVisible()
    await expect(
      page.getByLabel('Skin-tone preference for color guidance (optional)'),
    ).toBeVisible()
  })
})
