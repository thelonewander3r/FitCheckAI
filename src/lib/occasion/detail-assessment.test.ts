import { describe, expect, it } from "vitest";
import { assessEventDetail } from "./detail-assessment";

describe("assessEventDetail", () => {
  it("asks for more context when the event is sparse", () => {
    expect(assessEventDetail("a wedding").needsFollowUp).toBe(true);
  });

  it("accepts an event with a specific venue or company", () => {
    expect(
      assessEventDetail(
        "a garden wedding at Rosewood Pavilion in New York",
      ).needsFollowUp,
    ).toBe(false);
  });

  it("accepts a restaurant event as enough context to research", () => {
    expect(assessEventDetail("dinner at The Ivy").needsFollowUp).toBe(false);
  });

  it("asks for context for a generic conference", () => {
    const assessment = assessEventDetail("a conference");
    expect(assessment.needsFollowUp).toBe(true);
    expect(assessment.questions).toContain("Where is it happening?");
  });
});
