import { describe, it, expect, beforeEach } from "vitest";
import { MockVenueLookupProvider } from "./mock-provider";
import { formalityLevelToLabel } from "./types";

describe("MockVenueLookupProvider", () => {
  let provider: MockVenueLookupProvider;

  beforeEach(() => {
    provider = new MockVenueLookupProvider();
  });

  it("curated rooftop match returns smart-casual with confidence > 0.8", async () => {
    const result = await provider.lookupVenue({
      venueName: "Skyline Rooftop Bar",
      eventType: "dinner",
    });
    expect(result.dressCode).toBe("smart-casual");
    expect(result.formalityLevel).toBe(1);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.source).toBe("mock:curated");
    expect(result.isMock).toBe(true);
  });

  it("bank/financial match returns business-professional", async () => {
    const result = await provider.lookupVenue({
      venueName: "First National Bank HQ",
      eventType: "client-meeting",
    });
    expect(result.dressCode).toBe("business-professional");
    expect(result.formalityLevel).toBe(3);
    expect(result.source).toBe("mock:curated");
  });

  it("no-match with eventType gala returns formal + confidence 0.5 + event-default", async () => {
    const result = await provider.lookupVenue({
      venueName: "Unknown Hall",
      eventType: "gala",
    });
    expect(result.dressCode).toBe("formal");
    expect(result.formalityLevel).toBe(4);
    expect(result.confidence).toBe(0.5);
    expect(result.source).toBe("mock:event-default");
  });

  it("wedding name match returns formal", async () => {
    const result = await provider.lookupVenue({
      venueName: "Rosewood Wedding Pavilion",
      eventType: "other",
    });
    expect(result.dressCode).toBe("formal");
    expect(result.formalityLevel).toBe(4);
    expect(result.source).toBe("mock:curated");
  });

  it("wedding at Skyline Terrace floors curated formality to formal", async () => {
    const result = await provider.lookupVenue({
      venueName: "Skyline Terrace",
      eventType: "wedding",
    });
    expect(result.dressCode).toBe("formal");
    expect(result.formalityLevel).toBe(4);
    expect(result.source).toBe("mock:curated");
  });

  it("gala at Lakeside Resort floors curated formality to formal", async () => {
    const result = await provider.lookupVenue({
      venueName: "Lakeside Resort",
      eventType: "gala",
    });
    expect(result.dressCode).toBe("formal");
    expect(result.formalityLevel).toBe(4);
    expect(result.source).toBe("mock:curated");
  });

  it("gala at First National Bank floors bank curated level to formal", async () => {
    const result = await provider.lookupVenue({
      venueName: "First National Bank",
      eventType: "gala",
    });
    expect(result.dressCode).toBe("formal");
    expect(result.formalityLevel).toBe(4);
    expect(result.source).toBe("mock:curated");
  });

  it("Burbank Town Center does not match bank; dinner defaults to smart-casual", async () => {
    const result = await provider.lookupVenue({
      venueName: "Burbank Town Center",
      eventType: "dinner",
    });
    expect(result.dressCode).not.toBe("business-professional");
    expect(result.dressCode).toBe("smart-casual");
    expect(result.formalityLevel).toBe(1);
    expect(result.source).toBe("mock:event-default");
  });
});

describe("formalityLevelToLabel", () => {
  it("returns smart-casual for NaN", () => {
    expect(formalityLevelToLabel(NaN)).toBe("smart-casual");
  });

  it("clamps high values to formal", () => {
    expect(formalityLevelToLabel(7)).toBe("formal");
  });

  it("clamps low values to casual", () => {
    expect(formalityLevelToLabel(-1)).toBe("casual");
  });
});
