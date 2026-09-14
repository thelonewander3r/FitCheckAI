import { afterEach } from "vitest";
import { resetMemoryStorage } from "@/lib/storage/memory-backend";

afterEach(() => {
  resetMemoryStorage();
});
