import type { IntakePayload } from "../../types/interview";

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0] as string;
}

export const DEMO_SCENARIO: IntakePayload = {
  candidateName: "Alex",
  jobTitle: "Data Analytics Specialist",
  companyName: "Meridian Financial Group",
  industry: "Financial Services",
  interviewStage: "final",
  interviewFormat: "onsite",
  interviewDate: addDays(new Date(), 5),
  budget: 200,
  stylePreference: "classic",
  jobDescription: `
We are looking for a Data Analytics Specialist to join our financial services team.
The role involves developing dashboards, interpreting data trends, and presenting
findings to senior leadership.

Dress expectations: Our office maintains a business-professional standard.
Candidates have asked whether a full suit or business casual is more appropriate —
our leadership team is split on the matter, but for final-round interviews we
lean toward polished, traditional attire that reflects our brand.

Responsibilities include SQL querying, Python-based data pipelines, and working
cross-functionally with compliance and audit teams.
  `.trim(),
};
