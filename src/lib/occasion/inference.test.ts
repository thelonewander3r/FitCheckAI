import { describe, expect, it } from "vitest";
import { inferOccasionType } from "./inference";

describe("inferOccasionType", () => {
  it.each([
    ["final interview at a bank", "interview"],
    ["my sister's wedding reception", "wedding"],
    ["black-tie gala at the opera", "gala"],
    ["rooftop dinner with my team", "dinner"],
    ["first date at a wine bar", "date"],
    ["client meeting at a consulting firm", "client-meeting"],
    ["developer conference", "conference"],
    ["picnic in the park", "casual-outing"],
  ])("maps %s to %s", (text, expected) => {
    expect(inferOccasionType(text)).toBe(expected);
  });

  it("uses a dinner baseline when the situation is ambiguous", () => {
    expect(inferOccasionType("somewhere nice downtown")).toBe("dinner");
  });
});
