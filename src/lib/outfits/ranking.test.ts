import { describe, it, expect } from 'vitest'
import { scoreBudgetFit, rankOutfits, selectTopOutfits } from './ranking'
import { OUTFIT_TEMPLATES } from './templates'
import type { InterviewContext, OutfitTemplate } from '@/types/interview'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const businessProfessionalContext: InterviewContext = {
  inferredIndustry: 'Finance',
  dressCode: 'business-professional',
  confidence: 0.8,
  recommendedColors: ['navy', 'charcoal', 'white'],
  avoidPatterns: [],
  jacketRecommended: true,
  rationale: [],
}

const businessCasualContext: InterviewContext = {
  inferredIndustry: 'Tech',
  dressCode: 'business-casual',
  confidence: 0.7,
  recommendedColors: ['navy', 'gray', 'white'],
  avoidPatterns: [],
  jacketRecommended: false,
  rationale: [],
}

const minimalTemplate: OutfitTemplate = {
  id: 'test-001',
  name: 'Test Blazer',
  description: 'A test outfit',
  garments: ['Blazer', 'Trousers'],
  estimatedPrice: 150,
  formality: 7,
  baseRoleFit: 80,
  baseCameraReadiness: 75,
  baseVersatility: 70,
  colors: ['navy'],
  hasJacket: true,
}

// ---------------------------------------------------------------------------
// scoreBudgetFit
// ---------------------------------------------------------------------------
describe('scoreBudgetFit', () => {
  it('returns 100 when price equals the budget', () => {
    expect(scoreBudgetFit(200, 200)).toBe(100)
  })

  it('returns 100 when price is under the budget', () => {
    expect(scoreBudgetFit(100, 200)).toBe(100)
    expect(scoreBudgetFit(1, 200)).toBe(100)
  })

  it('returns 0 when price is exactly 2× the budget', () => {
    expect(scoreBudgetFit(400, 200)).toBe(0)
  })

  it('returns 50 when price is 1.5× the budget', () => {
    // overRatio = (300-200)/200 = 0.5 → round(100 * (1-0.5)) = 50
    expect(scoreBudgetFit(300, 200)).toBe(50)
  })

  it('returns 0 for any price above 2× the budget', () => {
    expect(scoreBudgetFit(500, 200)).toBe(0)
    expect(scoreBudgetFit(1000, 200)).toBe(0)
  })

  it('returns 0 when budget is 0', () => {
    expect(scoreBudgetFit(100, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Overall score weights
// ---------------------------------------------------------------------------
describe('rankOutfits — overall score', () => {
  it('overall = 35% role + 20% format + 20% budget + 15% versatility + 10% camera', () => {
    const [ranked] = rankOutfits([minimalTemplate], businessProfessionalContext, 200, 'onsite')
    const { scores } = ranked
    const expected = Math.round(
      scores.roleAppropriateness * 0.35 +
        scores.interviewFormatSuitability * 0.2 +
        scores.budgetFit * 0.2 +
        scores.versatility * 0.15 +
        scores.cameraReadiness * 0.1,
    )
    expect(scores.overall).toBe(expected)
  })

  it('budgetFit score of 100 when outfit is within budget', () => {
    const cheapTemplate = { ...minimalTemplate, estimatedPrice: 50 }
    const [ranked] = rankOutfits([cheapTemplate], businessCasualContext, 200, 'onsite')
    expect(ranked.scores.budgetFit).toBe(100)
  })

  it('budgetFit score of 0 when outfit costs 2× the budget', () => {
    const expensiveTemplate = { ...minimalTemplate, estimatedPrice: 400 }
    const [ranked] = rankOutfits([expensiveTemplate], businessCasualContext, 200, 'onsite')
    expect(ranked.scores.budgetFit).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Sorting — descending by overall score
// ---------------------------------------------------------------------------
describe('rankOutfits — sorting', () => {
  it('returns outfits sorted by overall score descending', () => {
    const ranked = rankOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite')
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i]!.scores.overall).toBeGreaterThanOrEqual(ranked[i + 1]!.scores.overall)
    }
  })
})

// ---------------------------------------------------------------------------
// selectTopOutfits
// ---------------------------------------------------------------------------
describe('selectTopOutfits', () => {
  it('returns exactly 3 outfits by default', () => {
    const top = selectTopOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite')
    expect(top).toHaveLength(3)
  })

  it('returns N outfits when count is specified', () => {
    const top = selectTopOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite', 2)
    expect(top).toHaveLength(2)
  })

  it('top result has the highest overall score among all ranked outfits', () => {
    const [top] = selectTopOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite')
    const allRanked = rankOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite')
    expect(top!.scores.overall).toBe(allRanked[0]!.scores.overall)
  })

  it('each RankedOutfit includes an explanation string', () => {
    const top = selectTopOutfits(OUTFIT_TEMPLATES, businessProfessionalContext, 200, 'onsite')
    for (const outfit of top) {
      expect(typeof outfit.explanation).toBe('string')
      expect(outfit.explanation.length).toBeGreaterThan(0)
    }
  })
})
