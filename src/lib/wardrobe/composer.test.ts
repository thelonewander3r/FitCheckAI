import { describe, it, expect } from 'vitest'
import { composeOutfits } from './composer'
import type { WardrobeItem } from '@/types/wardrobe'

function item(
  overrides: Partial<WardrobeItem> &
    Pick<WardrobeItem, 'id' | 'category' | 'color' | 'formality'>,
): WardrobeItem {
  return {
    name: overrides.name ?? overrides.id,
    seasons: overrides.seasons ?? ['any'],
    imageBase64: 'x',
    favorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('composeOutfits', () => {
  it('produces a dress-only outfit when a dress exists', () => {
    const items = [
      item({
        id: 'd1',
        name: 'Navy Dress',
        category: 'dresses',
        color: 'navy',
        formality: 'business-professional',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
    })

    expect(result.outfits.length).toBeGreaterThanOrEqual(1)
    expect(result.outfits[0]!.items.some((i) => i.category === 'dresses')).toBe(
      true,
    )
    expect(result.outfits[0]!.id).toBe('combo-1')
  })

  it('reports a formality gap for a casual-only wardrobe at business-professional', () => {
    const items = [
      item({
        id: 't1',
        category: 'tops',
        color: 'white',
        formality: 'casual',
      }),
      item({
        id: 'b1',
        category: 'bottoms',
        color: 'blue',
        formality: 'casual',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
    })

    expect(result.outfits).toHaveLength(0)
    expect(
      result.gaps.some((g) => g.includes('business-professional')),
    ).toBe(true)
  })

  it('scores higher when an item color is in the palette', () => {
    const items = [
      item({
        id: 'd1',
        name: 'Emerald Dress',
        category: 'dresses',
        color: 'emerald',
        formality: 'business-casual',
      }),
    ]

    const without = composeOutfits(items, {
      formality: 'business-casual',
    })
    const withPalette = composeOutfits(items, {
      formality: 'business-casual',
      palette: ['emerald', 'navy'],
    })

    expect(withPalette.outfits[0]!.score).toBeGreaterThan(
      without.outfits[0]!.score,
    )
  })

  it('reports missing outerwear at the required formality level', () => {
    const items = [
      item({
        id: 't1',
        category: 'tops',
        color: 'white',
        formality: 'business-professional',
      }),
      item({
        id: 'b1',
        category: 'bottoms',
        color: 'charcoal',
        formality: 'business-professional',
      }),
      item({
        id: 'o1',
        category: 'outerwear',
        color: 'navy',
        formality: 'casual',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
    })

    expect(result.gaps).toContain('outerwear at business-professional')
  })

  it('rescues a top one level below when a qualifying jacket is present', () => {
    const items = [
      item({
        id: 't1',
        name: 'Soft Blouse',
        category: 'tops',
        color: 'white',
        formality: 'business-casual',
      }),
      item({
        id: 'b1',
        name: 'Trousers',
        category: 'bottoms',
        color: 'charcoal',
        formality: 'business-professional',
      }),
      item({
        id: 'o1',
        name: 'Blazer',
        category: 'outerwear',
        color: 'navy',
        formality: 'business-professional',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
    })

    expect(result.outfits.length).toBeGreaterThanOrEqual(1)
    const combo = result.outfits[0]!
    expect(combo.items.some((i) => i.id === 't1')).toBe(true)
    expect(combo.items.some((i) => i.id === 'o1')).toBe(true)
  })

  it('reports no spurious gaps for a complete wardrobe', () => {
    const items = [
      item({
        id: 't1',
        category: 'tops',
        color: 'white',
        formality: 'business-professional',
      }),
      item({
        id: 'b1',
        category: 'bottoms',
        color: 'charcoal',
        formality: 'business-professional',
      }),
      item({
        id: 'o1',
        category: 'outerwear',
        color: 'navy',
        formality: 'business-professional',
      }),
      item({
        id: 's1',
        category: 'shoes',
        color: 'black',
        formality: 'business-professional',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
    })

    expect(result.gaps).toEqual([])
  })

  it('ranks a dress first for feminine presentation when both dress and top+bottom exist', () => {
    const items = [
      item({
        id: 'd1',
        name: 'Sheath Dress',
        category: 'dresses',
        color: 'navy',
        formality: 'business-professional',
      }),
      item({
        id: 't1',
        name: 'Blouse',
        category: 'tops',
        color: 'white',
        formality: 'business-professional',
      }),
      item({
        id: 'b1',
        name: 'Trousers',
        category: 'bottoms',
        color: 'charcoal',
        formality: 'business-professional',
      }),
    ]

    const result = composeOutfits(items, {
      formality: 'business-professional',
      presentation: 'feminine',
    })

    expect(result.outfits.length).toBeGreaterThanOrEqual(1)
    expect(
      result.outfits[0]!.items.some((i) => i.category === 'dresses'),
    ).toBe(true)
  })
})
