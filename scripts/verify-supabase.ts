import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { getSupabasePublicConfig } from "../src/lib/supabase/config";

const prisma = new PrismaClient();
async function main() {
  assert.match(process.env.DATABASE_URL ?? "", /^postgres(?:ql)?:/, "Requires PostgreSQL");
  const config = getSupabasePublicConfig();
  assert.ok(config, "Requires complete Supabase Auth configuration");
  const schema = await readFile("prisma/schema.postgresql.prisma", "utf8");
  const models = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const tables = await tx.$queryRaw<Array<{ name: string; rls: boolean }>>
      `SELECT c.relname AS name, c.relrowsecurity AS rls FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'`;
    for (const model of models) {
      assert.equal(tables.find((table) => table.name === model)?.rls, true, model + " must have RLS");
    }
    const policies = await tx.$queryRaw<Array<{ tablename: string }>>
      `SELECT tablename FROM pg_policies WHERE schemaname = 'public'`;
    assert.equal(policies.filter((policy) => models.includes(policy.tablename)).length, 0,
      "Expected deny-by-default RLS with no business-table policies");
    const migrations = await tx.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>
      `SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    assert.ok(migrations.length > 0, "Expected applied PostgreSQL migrations");
    for (const migration of migrations) {
      assert.ok(migration.finished_at && !migration.rolled_back_at, "Migration must be completed");
      const sql = await readFile("prisma/migrations-postgresql/" + migration.migration_name + "/migration.sql");
      assert.equal(createHash("sha256").update(sql).digest("hex"), migration.checksum,
        "Applied migration was modified: " + migration.migration_name);
    }
    const ownerEmail = process.env.BIZFLOW_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
    const owner = await tx.user.findUnique({ where: { email: ownerEmail ?? "" }, include: { memberships: true } });
    assert.ok(owner?.authUserId, "Bootstrap owner must be linked to Auth");
    assert.ok(owner.memberships.some((membership) => membership.role === "owner" && membership.status === "active"),
      "Bootstrap owner must have an active owner membership");
    const authUsers = await tx.$queryRaw<Array<{ confirmed: boolean }>>
      `SELECT email_confirmed_at IS NOT NULL AS confirmed FROM auth.users WHERE id::text = ${owner.authUserId}`;
    assert.equal(authUsers[0]?.confirmed, true, "Owner Auth email must be confirmed");
    const counts: Record<string, number> = {};
    for (const model of models) {
      const rows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT count(*) AS count FROM public."' + model + '"');
      counts[model] = Number(rows[0].count);
    }
    console.log(JSON.stringify({ counts, modelsWithRls: models.length, completedMigrations: migrations.length, activeConfirmedOwner: true }));
  }, { timeout: 60000 });
  for (const role of ["anon", "authenticated"] as const) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL ROLE " + role);
      for (const model of models) {
        const rows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT count(*) AS count FROM public."' + model + '"');
        assert.equal(Number(rows[0].count), 0, role + " can read " + model);
      }
    }, { timeout: 60000 });
  }
  const headers = { apikey: config.publishableKey };
  const health = await fetch(config.url + "/auth/v1/health", { headers, signal: AbortSignal.timeout(15000) });
  assert.equal(health.status, 200, "Supabase Auth health");
  for (const model of models) {
    const response: Response = await fetch(config.url + "/rest/v1/" + model + "?select=*&limit=1", { headers, signal: AbortSignal.timeout(15000) });
    assert.ok([200, 401, 403].includes(response.status), model + " REST status " + response.status);
    if (response.status === 200) assert.deepEqual(await response.json(), [], model + " exposed anonymous business data");
  }
  console.log("PASS: read-only PostgreSQL integrity, RLS, migration checksums, owner activation, Auth health and anonymous REST denial for all " + models.length + " models.");
}
main().catch(() => { console.error("Supabase verification failed. Inspect database configuration, RLS and owner activation; credentials were not logged."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
