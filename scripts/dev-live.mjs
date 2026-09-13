/**
 * Local-only launcher: starts Next with YOUCAM_MODE=live for this process tree.
 * Does not write .env. Does not print secrets.
 */
import { spawn } from "node:child_process";

const child = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, YOUCAM_MODE: "live" },
});

child.on("exit", (code) => process.exit(code ?? 0));
