import { LiveVenueLookupProvider } from "./live-provider";
import { MockVenueLookupProvider } from "./mock-provider";
import type { VenueProvider } from "./types";

export { formalityLevelToLabel } from "./types";
export { LiveVenueLookupProvider } from "./live-provider";
export { MockVenueLookupProvider } from "./mock-provider";
export type {
  DressCodeLabel,
  VenueContext,
  VenueLookupInput,
  VenueProvider,
} from "./types";

/**
 * Returns the venue provider based on VENUE_MODE.
 * Defaults to the mock provider when the variable is absent or not "live".
 */
export function getVenueProvider(): VenueProvider {
  if (process.env["VENUE_MODE"] === "live") {
    return new LiveVenueLookupProvider();
  }
  return new MockVenueLookupProvider();
}
