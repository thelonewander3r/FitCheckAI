import { test, expect } from '@playwright/test'

/**
 * Demo flow E2E — exercises the full happy path:
 *   /demo → analysis → try-on → plan
 *
 * The test uses the pre-built DEMO_SCENARIO (Alex / Data Analytics /
 * Meridian Financial Group) which is created synchronously via POST /api/demo.
 */
test.describe('Demo flow', () => {
  test('load demo → analysis → try-on → plan', async ({ page }) => {
    // -----------------------------------------------------------------------
    // 1. Navigate to /demo
    // -----------------------------------------------------------------------
    await page.goto('/demo')

    // The demo page POSTs to /api/demo, receives a sessionId, then calls
    // router.replace('/interview/{sessionId}/analysis').
    await page.waitForURL(/\/interview\/.+\/analysis/, { timeout: 30_000 })

    // -----------------------------------------------------------------------
    // 2. Analysis page
    // -----------------------------------------------------------------------
    await expect(page.getByText('Interview analysis')).toBeVisible({ timeout: 10_000 })

    // Dress code card should show Business Professional for this scenario
    await expect(
      page.getByText('Business Professional'),
    ).toBeVisible({ timeout: 5_000 })

    // Recommended colours should appear
    await expect(page.getByText('navy')).toBeVisible()

    // -----------------------------------------------------------------------
    // 3. Continue to Virtual Try-On
    // -----------------------------------------------------------------------
    const tryOnLink = page.getByTestId('continue-to-try-on')
    await expect(tryOnLink).toBeVisible({ timeout: 5_000 })
    await tryOnLink.click()

    await page.waitForURL(/\/interview\/.+\/try-on/, { timeout: 15_000 })

    // -----------------------------------------------------------------------
    // 4. Try-On page
    // -----------------------------------------------------------------------
    await expect(page.getByText('Virtual Try-On')).toBeVisible({ timeout: 10_000 })

    // Outfit cards must load (the client fetches the session on mount)
    await expect(
      page.getByText('Top 3 outfit recommendations', { exact: false }),
    ).toBeVisible({ timeout: 15_000 })

    // -----------------------------------------------------------------------
    // 5. Continue to Final Plan
    // -----------------------------------------------------------------------
    const continueBtn = page.getByTestId('continue-to-plan')
    await expect(continueBtn).toBeVisible({ timeout: 10_000 })
    await continueBtn.click()

    await page.waitForURL(/\/interview\/.+\/plan/, { timeout: 30_000 })

    // -----------------------------------------------------------------------
    // 6. Plan page
    // -----------------------------------------------------------------------
    await expect(page.getByText('Your preparation plan')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('5-day countdown checklist')).toBeVisible()
    await expect(page.getByText('Night before checklist')).toBeVisible()
  })

  test('demo page shows loading spinner before redirecting', async ({ page }) => {
    // Intercept the /api/demo request to delay it so we can observe the spinner
    await page.route('/api/demo', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      await route.continue()
    })

    await page.goto('/demo')

    // Spinner text should be visible while the API call is in-flight
    await expect(page.getByText('Preparing demo')).toBeVisible({ timeout: 5_000 })

    // Then it redirects
    await page.waitForURL(/\/interview\/.+\/analysis/, { timeout: 30_000 })
  })
})
