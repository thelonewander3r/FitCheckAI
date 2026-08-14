import { describe, it, expect } from 'vitest'
import { IntakeSchema } from './schemas'
import { DEMO_SCENARIO } from '@/lib/interview/demo-scenario'
import type { IntakeInput } from './schemas'

// ---------------------------------------------------------------------------
// Valid payload — demo scenario
// ---------------------------------------------------------------------------
describe('IntakeSchema — valid payloads', () => {
  it('accepts the DEMO_SCENARIO payload', () => {
    const result = IntakeSchema.safeParse(DEMO_SCENARIO)
    expect(result.success).toBe(true)
  })

  it('accepts a minimal valid payload without optional fields', () => {
    const minimal: IntakeInput = {
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corp',
      jobDescription: 'Build and maintain web applications in a collaborative team.',
      interviewStage: 'first-round',
      interviewFormat: 'video',
      interviewDate: '2026-09-01',
      budget: 150,
      stylePreference: 'classic',
    }
    const result = IntakeSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('accepts a minimal situation-first payload and applies defaults', () => {
    const result = IntakeSchema.safeParse({
      jobTitle: 'Software Engineer',
      companyName: 'Acme Corp',
      jobDescription: 'Build and maintain web applications in a collaborative team.',
      interviewDate: '2026-09-01',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.interviewStage).toBe('first-round')
      expect(result.data.interviewFormat).toBe('onsite')
      expect(result.data.stylePreference).toBe('classic')
      expect(result.data.budget).toBeUndefined()
    }
  })

  it('accepts an optional candidateName field', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, candidateName: 'Jordan' })
    expect(result.success).toBe(true)
  })

  it('accepts an optional industry field', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, industry: 'Financial Services' })
    expect(result.success).toBe(true)
  })

  it('accepts a positive fractional budget', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, budget: 99.99 })
    expect(result.success).toBe(true)
  })

  it('accepts optional person-profile fields', () => {
    const result = IntakeSchema.safeParse({
      ...DEMO_SCENARIO,
      fitSize: 'US 6',
      weightLbs: 140,
      skinTone: 'medium',
      presentation: 'feminine',
      companyCulture: 'startup',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fitSize).toBe('US 6')
      expect(result.data.weightLbs).toBe(140)
      expect(result.data.skinTone).toBe('medium')
      expect(result.data.presentation).toBe('feminine')
      expect(result.data.companyCulture).toBe('startup')
    }
  })

  it('keeps person-profile fields optional (absent still passes)', () => {
    const result = IntakeSchema.safeParse(DEMO_SCENARIO)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fitSize).toBeUndefined()
      expect(result.data.weightLbs).toBeUndefined()
      expect(result.data.skinTone).toBeUndefined()
      expect(result.data.presentation).toBeUndefined()
      expect(result.data.companyCulture).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Invalid payloads — field-level rejections
// ---------------------------------------------------------------------------
describe('IntakeSchema — invalid payloads', () => {
  it('rejects an empty jobTitle', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, jobTitle: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0])
      expect(fields).toContain('jobTitle')
    }
  })

  it('rejects a jobDescription that is too short (< 20 chars)', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, jobDescription: 'too short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0])
      expect(fields).toContain('jobDescription')
    }
  })

  it('rejects a jobDescription of exactly 19 characters', () => {
    const result = IntakeSchema.safeParse({
      ...DEMO_SCENARIO,
      jobDescription: '1234567890123456789',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a jobDescription of exactly 20 characters', () => {
    const result = IntakeSchema.safeParse({
      ...DEMO_SCENARIO,
      jobDescription: '12345678901234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative budget', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, budget: -50 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0])
      expect(fields).toContain('budget')
    }
  })

  it('rejects a zero budget', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, budget: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid interviewFormat', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, interviewFormat: 'in-person' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid interviewStage', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, interviewStage: 'screening' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed interviewDate', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, interviewDate: '01/09/2026' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty companyName', () => {
    const result = IntakeSchema.safeParse({ ...DEMO_SCENARIO, companyName: '' })
    expect(result.success).toBe(false)
  })

  it('accepts a payload without a budget', () => {
    const rest = { ...DEMO_SCENARIO } as Partial<typeof DEMO_SCENARIO>
    delete rest.budget
    const result = IntakeSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })
})
