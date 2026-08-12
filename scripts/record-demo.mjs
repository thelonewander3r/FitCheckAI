// Records the full demo flow to video for the README / demo archive.
// Usage: node scripts/record-demo.mjs   (dev server must be running on :3000)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

mkdirSync('docs/videos', { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: 'docs/videos/', size: { width: 1280, height: 800 } },
})
const page = await context.newPage()

// 1. Landing
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

// 2. Load demo -> analysis
await page.getByRole('link', { name: 'Load demo scenario' }).click()
await page.waitForURL(/\/interview\/.+\/analysis/, { timeout: 30_000 })
await page.waitForTimeout(1500)

// 3. Try-on page
await page.getByTestId('continue-to-try-on').click()
await page.waitForURL(/\/try-on$/, { timeout: 15_000 })
await page.waitForTimeout(1500)

// 4. Virtual try-on on the first outfit
await page.getByRole('button', { name: 'Virtual Try On' }).first().click()
await page.waitForTimeout(2500)

// 5. Final plan
await page.getByTestId('continue-to-plan').click()
await page.waitForURL(/\/plan$/, { timeout: 30_000 })
await page.waitForTimeout(2000)

await context.close() // finalizes the video file
await browser.close()
console.log('recording done')
