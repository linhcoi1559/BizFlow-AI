import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("demo seed refuses PostgreSQL before touching business data", () => {
  const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], {
    env: { ...process.env, DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/invalid" },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Demo seed chỉ được chạy trên SQLite/);
  assert.doesNotMatch(result.stderr, /Can't reach database server/);
});
