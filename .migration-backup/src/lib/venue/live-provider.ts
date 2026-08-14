/**
 * Live venue lookup provider stub.
 *
 * This file intentionally does NOT fabricate live API responses.
 * Before activating this provider you must:
 *   1. Obtain venue / place API credentials and documentation.
 *   2. Replace the TODO below with a real lookup implementation.
 *   3. Map the upstream response into VenueContext.
 */

import type { VenueContext, VenueLookupInput, VenueProvider } from "./types";

export class LiveVenueLookupProvider implements VenueProvider {
  async lookupVenue(_input: VenueLookupInput): Promise<VenueContext> {
    void _input;
    /**
     * TODO: Replace this stub with a real venue / place lookup.
     *
     * Steps required:
     *   1. Confirm the upstream API endpoint and auth headers.
     *   2. Map venue metadata (category, reviews, location) to dressCode /
     *      formalityLevel / palette / cultureHints.
     *   3. Set isMock: false and an appropriate source label.
     */
    throw new Error(
      "Live venue lookup requires configuration (VENUE_MODE=live)",
    );
  }
}
