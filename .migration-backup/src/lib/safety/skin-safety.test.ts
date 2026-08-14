import { describe, it, expect } from 'vitest'
import {
  sanitizeSkinAnalysisText,
  applySkinSafety,
  COSMETIC_DISCLAIMER,
} from './skin-safety'
import type { SkinAnalysisResult } from '@/types/interview'

// ---------------------------------------------------------------------------
// COSMETIC_DISCLAIMER constant
// ---------------------------------------------------------------------------
describe('COSMETIC_DISCLAIMER', () => {
  it('is a non-empty string', () => {
    expect(typeof COSMETIC_DISCLAIMER).toBe('string')
    expect(COSMETIC_DISCLAIMER.length).toBeGreaterThan(0)
  })

  it('explicitly mentions "medical advice"', () => {
    expect(COSMETIC_DISCLAIMER.toLowerCase()).toContain('medical advice')
  })

  it('explicitly mentions "cosmetic"', () => {
    expect(COSMETIC_DISCLAIMER.toLowerCase()).toContain('cosmetic')
  })
})

// ---------------------------------------------------------------------------
// sanitizeSkinAnalysisText — rejects prohibited language
// ---------------------------------------------------------------------------
describe('sanitizeSkinAnalysisText — prohibited terms', () => {
  it('rejects text containing "diagnos" (diagnosis language)', () => {
    const result = sanitizeSkinAnalysisText('This looks like a diagnosis of rosacea.')
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('diagnos')
  })

  it('rejects text containing "rosacea" (skin disease name)', () => {
    const result = sanitizeSkinAnalysisText('Signs of rosacea may be present.')
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('rosacea')
  })

  it('rejects text containing "attractive" (attractiveness language)', () => {
    const result = sanitizeSkinAnalysisText('You have very attractive features.')
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('attractive')
  })

  it('rejects text containing "hiring" language', () => {
    const result = sanitizeSkinAnalysisText('This will improve your hiring prospects.')
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('hiring')
  })

  it('rejects text combining attractiveness and hiring language', () => {
    const result = sanitizeSkinAnalysisText(
      'You have attractive features that hiring managers prefer.',
    )
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('attractive')
    expect(result.rejectedTerms).toContain('hiring')
  })

  it('rejects text containing demographic inference terms', () => {
    const result = sanitizeSkinAnalysisText('Your fitzpatrick skin type suggests...')
    expect(result.ok).toBe(false)
    expect(result.rejectedTerms).toContain('fitzpatrick')
  })

  it('rejects text containing "medical" keyword', () => {
    const result = sanitizeSkinAnalysisText('Seek medical treatment for this condition.')
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sanitizeSkinAnalysisText — allows safe cosmetic language
// ---------------------------------------------------------------------------
describe('sanitizeSkinAnalysisText — allowed cosmetic language', () => {
  it('allows hydration guidance', () => {
    const result = sanitizeSkinAnalysisText(
      'Staying well-hydrated in the days before your interview can help skin appear more even and refreshed.',
    )
    expect(result.ok).toBe(true)
    expect(result.rejectedTerms).toHaveLength(0)
  })

  it('allows mattifying primer tip', () => {
    const result = sanitizeSkinAnalysisText(
      'A light, mattifying primer can help create a smooth, camera-friendly surface if desired.',
    )
    expect(result.ok).toBe(true)
  })

  it('allows lighting setup guidance', () => {
    const result = sanitizeSkinAnalysisText(
      'Warm-toned lighting (3000–4000 K) is generally flattering for most people on camera.',
    )
    expect(result.ok).toBe(true)
  })

  it('returns the original text unchanged', () => {
    const input = 'A gentle cleanser is recommended for the morning of your interview.'
    const result = sanitizeSkinAnalysisText(input)
    expect(result.text).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// applySkinSafety
// ---------------------------------------------------------------------------
describe('applySkinSafety', () => {
  const safeResult: SkinAnalysisResult = {
    isMock: true,
    disclaimer: '',
    observations: [
      {
        id: 'obs-001',
        label: 'Hydration level',
        severity: 'low',
        guidance: 'Staying well-hydrated helps skin appear even.',
      },
    ],
    preparationSuggestions: [
      'Use a gentle cleanser the morning of your interview.',
    ],
    lightingNotes: ['Warm-toned lighting is flattering on camera.'],
  }

  const unsafeResult: SkinAnalysisResult = {
    isMock: false,
    disclaimer: '',
    observations: [
      {
        id: 'obs-bad',
        label: 'Skin condition',
        severity: 'notable',
        guidance: 'Possible diagnosis of rosacea detected. Seek medical treatment.',
      },
      {
        id: 'obs-good',
        label: 'Skin tone',
        severity: 'low',
        guidance: 'A light concealer can help create an even base.',
      },
    ],
    preparationSuggestions: [
      'Consult a dermatologist for your acne vulgaris.',
      'Apply moisturiser 20 minutes before getting dressed.',
    ],
    lightingNotes: ['Avoid harsh fluorescent lighting.'],
  }

  it('always appends COSMETIC_DISCLAIMER', () => {
    const safe = applySkinSafety(safeResult)
    expect(safe.disclaimer).toBe(COSMETIC_DISCLAIMER)

    const unsafe = applySkinSafety(unsafeResult)
    expect(unsafe.disclaimer).toBe(COSMETIC_DISCLAIMER)
  })

  it('keeps safe observations intact', () => {
    const result = applySkinSafety(safeResult)
    expect(result.observations).toHaveLength(1)
    expect(result.observations[0]!.id).toBe('obs-001')
  })

  it('drops observations containing prohibited language', () => {
    const result = applySkinSafety(unsafeResult)
    const ids = result.observations.map((o) => o.id)
    expect(ids).not.toContain('obs-bad')
    expect(ids).toContain('obs-good')
  })

  it('drops preparation suggestions containing prohibited language', () => {
    const result = applySkinSafety(unsafeResult)
    expect(result.preparationSuggestions).toHaveLength(1)
    expect(result.preparationSuggestions[0]).toContain('moisturiser')
  })

  it('preserves safe lighting notes', () => {
    const result = applySkinSafety(safeResult)
    expect(result.lightingNotes).toHaveLength(1)
  })
})
