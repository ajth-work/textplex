import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["--workspace", "apps/web", "run", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TEXTPLEX_SITE_MODE: "static",
      NEXT_PUBLIC_TEXTPLEX_DEMO_MODE: "true",
      NEXT_PUBLIC_TEXTPLEX_BASE_PATH: process.env.NEXT_PUBLIC_TEXTPLEX_BASE_PATH ?? "",
      NEXT_IGNORE_INCORRECT_LOCKFILE: "1",
    },
  },
);

process.exit(result.status ?? 1);
