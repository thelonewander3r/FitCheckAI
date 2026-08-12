import { describe, it, expect } from 'vitest'
import { inferInterviewContext } from './context-engine'

// ---------------------------------------------------------------------------
// financial services → business-professional
// ---------------------------------------------------------------------------
describe('inferInterviewContext — industry inference', () => {
  it('returns business-professional for financial services onsite final round', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Data Analytics Specialist',
      companyName: 'Meridian Financial Group',
      industry: 'financial services',
      jobDescription:
        'The role involves financial analysis, compliance reporting, and working with audit teams in a banking environment.',
      interviewFormat: 'onsite',
      interviewStage: 'final',
    })
    expect(ctx.dressCode).toBe('business-professional')
  })

  it('returns business-casual for a healthcare first-round onsite interview', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Product Manager',
      industry: 'healthcare',
      jobDescription:
        'Join our medical pharma team to manage product roadmaps and coordinate with clinical stakeholders.',
      interviewFormat: 'onsite',
      interviewStage: 'first-round',
    })
    // healthcare → semiformal (level 1) → onsite keeps level 1 → business-casual
    expect(ctx.dressCode).toBe('business-casual')
  })

  it('returns smart-casual for a tech startup first-round phone screen', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Frontend Engineer',
      industry: 'startup',
      jobDescription:
        'Fast-growing tech startup building a SaaS platform. Remote-first culture, casual dress code.',
      interviewFormat: 'recruiter',
      interviewStage: 'phone-screen',
    })
    expect(ctx.dressCode).toBe('smart-casual')
  })
})

// ---------------------------------------------------------------------------
// video adds pattern avoids
// ---------------------------------------------------------------------------
describe('inferInterviewContext — video format', () => {
  it('includes video-specific pattern warnings (e.g. fine stripes) for video format', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Software Engineer',
      jobDescription: 'Tech startup software development saas platform.',
      interviewFormat: 'video',
      interviewStage: 'first-round',
    })
    const videoSpecificPatterns = ['fine stripes', 'houndstooth', 'tiny checks', 'moiré', 'busy prints']
    const hasVideoPattern = ctx.avoidPatterns.some((p) => videoSpecificPatterns.includes(p))
    expect(hasVideoPattern).toBe(true)
    expect(ctx.avoidPatterns).toContain('fine stripes')
  })

  it('does NOT include video-specific patterns for onsite format', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Software Engineer',
      jobDescription: 'Tech startup software development saas platform.',
      interviewFormat: 'onsite',
      interviewStage: 'first-round',
    })
    expect(ctx.avoidPatterns).not.toContain('fine stripes')
    expect(ctx.avoidPatterns).not.toContain('houndstooth')
    expect(ctx.avoidPatterns).not.toContain('moiré')
  })
})

// ---------------------------------------------------------------------------
// executive format bumps formality
// ---------------------------------------------------------------------------
describe('inferInterviewContext — executive format', () => {
  it('bumps semiformal to business-professional for executive interview', () => {
    // healthcare → semiformal (level 1); executive bumps → level 2 → business-professional
    const ctx = inferInterviewContext({
      jobTitle: 'Senior Director',
      industry: 'healthcare',
      jobDescription:
        'Medical device company seeking a senior director to lead clinical affairs across healthcare systems.',
      interviewFormat: 'executive',
      interviewStage: 'first-round',
    })
    expect(ctx.dressCode).toBe('business-professional')
  })

  it('sets jacketRecommended to true for executive format', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'VP of Operations',
      jobDescription: 'Healthcare organisation executive leadership role.',
      interviewFormat: 'executive',
      interviewStage: 'first-round',
    })
    expect(ctx.jacketRecommended).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// confidence and output shape
// ---------------------------------------------------------------------------
describe('inferInterviewContext — output shape', () => {
  it('returns a non-empty recommendedColors array', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Analyst',
      jobDescription: 'General professional role in a corporate environment.',
      interviewFormat: 'onsite',
      interviewStage: 'first-round',
    })
    expect(ctx.recommendedColors.length).toBeGreaterThan(0)
  })

  it('returns a confidence between 0 and 1', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Analyst',
      jobDescription: 'Finance banking investment compliance audit role.',
      interviewFormat: 'onsite',
      interviewStage: 'first-round',
    })
    expect(ctx.confidence).toBeGreaterThan(0)
    expect(ctx.confidence).toBeLessThanOrEqual(1)
  })

  it('returns at least one rationale note', () => {
    const ctx = inferInterviewContext({
      jobTitle: 'Analyst',
      jobDescription: 'Finance banking investment compliance audit role.',
      interviewFormat: 'onsite',
      interviewStage: 'first-round',
    })
    expect(ctx.rationale.length).toBeGreaterThan(0)
  })
})
