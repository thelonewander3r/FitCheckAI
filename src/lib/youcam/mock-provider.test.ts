import { describe, it, expect, beforeEach } from 'vitest'
import { MockYouCamProvider } from './mock-provider'

describe('MockYouCamProvider', () => {
  let provider: MockYouCamProvider

  beforeEach(() => {
    provider = new MockYouCamProvider()
  })

  // -------------------------------------------------------------------------
  // analyzeSkin
  // -------------------------------------------------------------------------
  describe('analyzeSkin', () => {
    it('resolves without throwing', async () => {
      await expect(
        provider.analyzeSkin({ imageBase64: 'dGVzdA==' }),
      ).resolves.toBeDefined()
    })

    it('returns isMock: true', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      expect(result.isMock).toBe(true)
    })

    it('includes a non-empty disclaimer', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      expect(typeof result.disclaimer).toBe('string')
      expect(result.disclaimer.length).toBeGreaterThan(0)
      expect(result.disclaimer.toLowerCase()).toContain('medical advice')
    })

    it('returns at least one observation', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      expect(result.observations.length).toBeGreaterThan(0)
    })

    it('all observations have safe cosmetic-only guidance (no prohibited terms)', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      const prohibited = /diagnos|disease|disorder|rosacea|eczema|attractive|hiring|hired|fitzpatrick|melanin/i
      for (const obs of result.observations) {
        expect(obs.label).not.toMatch(prohibited)
        expect(obs.guidance).not.toMatch(prohibited)
      }
    })

    it('all preparation suggestions contain safe language', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      const prohibited = /diagnos|medical treatment|disease|attractive|hiring/i
      for (const suggestion of result.preparationSuggestions) {
        expect(suggestion).not.toMatch(prohibited)
      }
    })

    it('each observation has the required fields (id, label, severity, guidance)', async () => {
      const result = await provider.analyzeSkin({ imageBase64: 'dGVzdA==' })
      for (const obs of result.observations) {
        expect(typeof obs.id).toBe('string')
        expect(typeof obs.label).toBe('string')
        expect(['low', 'moderate', 'notable']).toContain(obs.severity)
        expect(typeof obs.guidance).toBe('string')
      }
    })
  })

  // -------------------------------------------------------------------------
  // generateApparelTryOn
  // -------------------------------------------------------------------------
  describe('generateApparelTryOn', () => {
    it('resolves without throwing', async () => {
      await expect(
        provider.generateApparelTryOn({
          userImageBase64: 'dGVzdA==',
          garmentAssetId: 'outfit-001',
        }),
      ).resolves.toBeDefined()
    })

    it('returns isMock: true', async () => {
      const result = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: 'outfit-001',
      })
      expect(result.isMock).toBe(true)
    })

    it('returns a data URL in renderedImageUrl', async () => {
      const result = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: 'outfit-001',
      })
      expect(result.renderedImageUrl).toMatch(/^data:/)
    })

    it('returns an SVG data URL', async () => {
      const result = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: 'outfit-002',
      })
      expect(result.renderedImageUrl).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('includes the garmentAssetId in the rendered image content', async () => {
      const garmentId = 'outfit-special-id'
      const result = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: garmentId,
      })
      // The mock encodes the garment ID into the SVG
      const svgContent = Buffer.from(
        result.renderedImageUrl.replace(/^data:image\/svg\+xml;base64,/, ''),
        'base64',
      ).toString('utf-8')
      expect(svgContent).toContain(garmentId)
    })

    it('produces different images for different garment IDs', async () => {
      const result1 = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: 'outfit-001',
      })
      const result2 = await provider.generateApparelTryOn({
        userImageBase64: 'dGVzdA==',
        garmentAssetId: 'outfit-002',
      })
      expect(result1.renderedImageUrl).not.toBe(result2.renderedImageUrl)
    })

    it('embeds the user photo when a valid base64 image is provided', async () => {
      const result = await provider.generateApparelTryOn({
        userImageBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        garmentAssetId: 'outfit-001',
      })
      const svgContent = Buffer.from(
        result.renderedImageUrl.replace(/^data:image\/svg\+xml;base64,/, ''),
        'base64',
      ).toString('utf-8')
      expect(svgContent).toContain('<image href=')
    })

    it('renders the placeholder when no user image is provided', async () => {
      const result = await provider.generateApparelTryOn({
        garmentAssetId: 'outfit-001',
      })
      const svgContent = Buffer.from(
        result.renderedImageUrl.replace(/^data:image\/svg\+xml;base64,/, ''),
        'base64',
      ).toString('utf-8')
      expect(svgContent).not.toContain('<image href=')
      expect(svgContent).toContain('rx="12"')
    })

    it('falls back to the placeholder for invalid base64 input', async () => {
      const result = await provider.generateApparelTryOn({
        userImageBase64: '"><foo bar="',
        garmentAssetId: 'outfit-001',
      })
      const svgContent = Buffer.from(
        result.renderedImageUrl.replace(/^data:image\/svg\+xml;base64,/, ''),
        'base64',
      ).toString('utf-8')
      expect(svgContent).not.toContain('<image href=')
      expect(svgContent).toContain('rx="12"')
    })
  })
})
