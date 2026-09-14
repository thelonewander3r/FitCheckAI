import { test, expect } from '@playwright/test'
import zlib from 'node:zlib'

/**
 * Covers the YouCam surfaces on the occasion plan: AI Clothes try-on driven by
 * a wardrobe piece, and Skin AI as the pre-event finishing check.
 */

function chunk(type: string, data: Buffer): Buffer {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(typed) >>> 0)
  return Buffer.concat([length, typed, crc])
}

/** A PNG with enough visual variation to pass the try-on photo gate. */
function png(width: number, height: number, patterned: boolean): Buffer {
  const rows = Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(width * 3 + 1)
    if (patterned) {
      for (let x = 0; x < width; x++) {
        row[1 + x * 3] = (x * 13 + y * 7) & 255
        row[2 + x * 3] = (x * 3 + y * 17) & 255
        row[3 + x * 3] = (x * 29 + y) & 255
      }
    }
    return row
  })
  const raw = Buffer.concat(rows)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const PHOTO = { name: 'photo.png', mimeType: 'image/png', buffer: png(600, 800, true) }
const BLANK = { name: 'blank.png', mimeType: 'image/png', buffer: png(600, 800, false) }

test.describe('YouCam on the occasion plan', () => {
  test('renders a wardrobe piece onto the user photo with AI Clothes', async ({
    page,
  }) => {
    await page.goto('/occasion/demo')
    await page.waitForURL(/\/occasion\/[^/]+$/)

    const tryOn = page.getByTestId('occasion-try-on')
    await expect(tryOn).toBeVisible()
    await expect(tryOn.getByText('YouCam AI Clothes', { exact: true })).toBeVisible()

    // The outer layer is the default garment reference for a composed look.
    await expect(
      tryOn.getByRole('button', { name: 'Red striped overshirt', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')

    await tryOn.getByLabel('Add a full-length photo').setInputFiles(PHOTO)
    await tryOn.getByRole('button', { name: 'See it on me', exact: true }).click()

    const render = tryOn.getByRole('img', { name: /Virtual try-on of/ })
    await expect(render).toBeVisible({ timeout: 30_000 })
    await expect(
      tryOn.getByText(/AI Clothes render · Red striped overshirt/),
    ).toBeVisible()
  })

  test('rejects a blank photo before calling try-on', async ({ page }) => {
    await page.goto('/occasion/demo')
    await page.waitForURL(/\/occasion\/[^/]+$/)

    const tryOn = page.getByTestId('occasion-try-on')
    await tryOn.getByLabel('Add a full-length photo').setInputFiles(BLANK)

    await expect(
      tryOn.getByText(/doesn't look like it has anyone/),
    ).toBeVisible()
    await expect(
      tryOn.getByRole('button', { name: 'See it on me', exact: true }),
    ).toBeDisabled()
  })

  test('lets the user try a different piece of the same look', async ({ page }) => {
    await page.goto('/occasion/demo')
    await page.waitForURL(/\/occasion\/[^/]+$/)

    const tryOn = page.getByTestId('occasion-try-on')
    await tryOn.getByRole('button', { name: 'Navy knit top', exact: true }).click()
    await tryOn.getByLabel('Add a full-length photo').setInputFiles(PHOTO)
    await tryOn.getByRole('button', { name: 'See it on me', exact: true }).click()

    await expect(
      tryOn.getByRole('img', { name: 'Virtual try-on of Navy knit top' }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test('runs Skin AI as the finishing check with a cosmetic-only disclaimer', async ({
    page,
  }) => {
    await page.goto('/occasion/demo')
    await page.waitForURL(/\/occasion\/[^/]+$/)

    const skin = page.getByTestId('skin-ai-next-step')
    await expect(skin.getByText('YouCam Skin AI', { exact: true })).toBeVisible()

    await skin.getByLabel('Add a selfie').setInputFiles(PHOTO)
    await skin.getByRole('button', { name: 'Run the skin check' }).click()

    await expect(skin.getByText('Hydration level', { exact: true })).toBeVisible({
      timeout: 30_000,
    })
    await expect(skin.getByText(/not medical advice/)).toBeVisible()
    // Wardrobe reasoning must never be driven by the skin result.
    await expect(skin.getByText(/no identity, attractiveness, or medical/)).toBeVisible()
  })
})
