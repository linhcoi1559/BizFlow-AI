import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("PostgreSQL baseline enables RLS for every Prisma model", async () => {
  const [schema, migration, lock] = await Promise.all([
    readFile("prisma/schema.postgresql.prisma", "utf8"),
    readFile("prisma/migrations-postgresql/20261001093000_baseline/migration.sql", "utf8"),
    readFile("prisma/migrations-postgresql/migration_lock.toml", "utf8"),
  ]);
  const modelNames = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);
  assert.ok(modelNames.length > 0, "PostgreSQL schema should contain models");

  for (const modelName of modelNames) {
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${modelName}" ENABLE ROW LEVEL SECURITY;`),
      `RLS is missing for ${modelName}`,
    );
  }

  const rlsStatements = migration.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
  assert.equal(rlsStatements.length, modelNames.length, "RLS statements should match model count");
  assert.match(lock, /provider\s*=\s*"postgresql"/);
});
