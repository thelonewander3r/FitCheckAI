/** Coarse KV keys — one JSON document per store to stay inside the Free 1k writes/day budget. */
export const JSON_DOC_KEYS = {
  sessions: "doc:sessions",
  occasions: "doc:occasions",
  wardrobe: "doc:wardrobe",
  worn: "doc:worn",
} as const;

export type JsonDocKey = (typeof JSON_DOC_KEYS)[keyof typeof JSON_DOC_KEYS];

/** R2 / memory prefix for ephemeral upload blobs. Not used for wardrobe photos. */
export const TEMP_BLOB_PREFIX = "tmp/";
