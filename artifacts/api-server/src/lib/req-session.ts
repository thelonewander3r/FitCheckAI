/**
 * Per-user session scoping.
 * Each visitor receives a stable UUID stored in an HTTP-only session cookie.
 * All data stores use this ID as a directory prefix, so users never see each other's data.
 */
import type { Request } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Return the stable userId for this request, creating one on first visit.
 * The value is persisted in the signed session cookie.
 */
export function getUserId(req: Request): string {
  if (!req.session.userId) {
    req.session.userId = crypto.randomUUID();
  }
  return req.session.userId;
}
