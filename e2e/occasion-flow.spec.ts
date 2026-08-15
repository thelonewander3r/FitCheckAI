import { test, expect } from '@playwright/test'

test.describe('Occasion flow', () => {
  test('landing page sells the outfit decision and opens the intake', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Stop staring at your closet/ }),
    ).toBeVisible()
    await expect(page.getByText('One lead outfit you can actually wear', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Get my outfit plan', exact: true }).first().click()
    await expect(page).toHaveURL(/#try-it$/)
    await expect(page.getByTestId('occasion-demo-form')).toHaveAttribute('data-ready', 'true')
    await expect(page.getByTestId('landing-occasion-input')).toBeVisible()
  })

  test('landing page submits an open-ended occasion prompt', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('occasion-demo-form')).toHaveAttribute('data-ready', 'true')
    await expect(page.getByTestId('landing-occasion-input')).toBeVisible()
    await page
      .getByTestId('landing-occasion-input')
      .fill('a rooftop dinner with friends')
    await page.getByRole('button', { name: 'Get my outfit plan', exact: true }).click({ noWaitAfter: true })
    await page.waitForURL(/\/occasion\/[^/]+$/, { timeout: 30_000 })
    await expect(
      page.getByRole('heading', { name: 'Your dinner outfit plan.', exact: true }),
    ).toBeVisible()
  })

  test('landing page opens the deterministic finished plan demo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'See a finished plan', exact: true }).click()
    await page.waitForURL(/\/occasion\/[^/]+$/)
    await expect(page.getByText('Rooftop dinner with friends · Dinner', { exact: true })).toBeVisible()
    await expect(page.getByText('Guided demo', { exact: true })).toBeVisible()
    await expect(page.getByTestId('outfit-plan')).toBeVisible()
    await expect(page.getByText(/Editorial reference for this demo plan/)).toBeVisible()
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
    await expect(page.getByTestId('occasion-intake-form')).toHaveAttribute('data-ready', 'true')
    await expect(
      page.getByRole('heading', { name: 'Plan your event', exact: true }),
    ).toBeVisible()
    await expect(page.getByLabel('Event type')).toHaveCount(0)
    await expect(page.getByLabel('Role title')).toHaveCount(0)
    await expect(page.getByLabel('Company')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Wedding guest', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dinner date', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conference', exact: true })).toBeVisible()

    await page
      .getByLabel('What event are you dressing for? *')
      .fill('rooftop dinner with my team')
    await page.getByRole('button', { name: 'Build my plan' }).click({ noWaitAfter: true })

    await page.waitForURL(/\/occasion\/[^/]+$/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Your dinner outfit plan.', exact: true })).toBeVisible()
    await expect(page.getByText('For rooftop dinner with my team', { exact: true })).toBeVisible()
    await expect(page.getByText('Smart casual', { exact: true })).toBeVisible()
    await expect(page.getByText('Rooftop venues trend upscale-casual — tailored but relaxed.', { exact: true })).toBeVisible()
    await expect(page.getByText('Mock context', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Give FitCheck a few real pieces.', exact: true })).toBeVisible()
  })

  test('asks for useful context when the event prompt is sparse', async ({ page }) => {
    await page.goto('/occasion')
    await expect(page.getByTestId('occasion-intake-form')).toHaveAttribute('data-ready', 'true')
    await page
      .getByLabel('What event are you dressing for? *')
      .fill('a wedding')

    await expect(page.getByRole('button', { name: 'Add useful details' })).toBeVisible()
    await page.getByRole('button', { name: 'Add useful details' }).click({ noWaitAfter: true })

    await expect(page.getByTestId('occasion-follow-up')).toBeVisible()
    await expect(page.getByLabel('Where is it happening? (optional)')).toBeVisible()
    await expect(page.getByLabel('Colors you prefer or want to avoid (optional)')).toBeVisible()
    await expect(page.getByLabel('Skin-tone preference for color guidance (optional)')).toBeVisible()
  })
})
