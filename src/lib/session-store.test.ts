import { afterEach, describe, expect, it } from "vitest";
import { JSON_DOC_KEYS } from "@/lib/storage/keys";
import { peekJsonDocument, runStorageBatch } from "@/lib/storage/json-document";
import { memoryUsage, resetMemoryStorage } from "@/lib/storage/memory-backend";
import {
  createSession,
  getSession,
  updateSession,
} from "@/lib/session-store";
import type { IntakePayload } from "@/types/interview";

const intake: IntakePayload = {
  jobTitle: "Engineer",
  companyName: "Acme",
  industry: "tech",
  jobDescription: "Build things",
  interviewFormat: "video",
  interviewStage: "final",
  interviewDate: "2026-09-01",
  budget: 200,
  stylePreference: "classic",
  skinTone: "medium",
};

describe("session-store", () => {
  afterEach(() => {
    resetMemoryStorage();
  });

  it("round-trips a session through the JSON document", async () => {
    const created = await createSession(intake);
    const loaded = await getSession(created.id);
    expect(loaded?.id).toBe(created.id);
    expect(loaded?.status).toBe("intake");

    const updated = await updateSession(created.id, { status: "ready" });
    expect(updated?.status).toBe("ready");
    expect(await getSession("missing")).toBeNull();
  });

  it("coalesces create + updates into a single KV-style put", async () => {
    await runStorageBatch(async () => {
      const created = await createSession(intake);
      await updateSession(created.id, { status: "analyzing" });
      await updateSession(created.id, { status: "ready" });
    });
    expect(memoryUsage.jsonPuts).toBe(1);
    const raw = await peekJsonDocument(JSON_DOC_KEYS.sessions);
    expect(raw).toContain('"ready"');
  });
});
