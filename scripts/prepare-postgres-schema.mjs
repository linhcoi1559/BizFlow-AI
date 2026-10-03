import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("prisma/schema.prisma");
const targetPath = resolve("prisma/schema.postgresql.prisma");
const source = await readFile(sourcePath, "utf8");
const postgresSchema = source.replace(
  'provider = "sqlite"',
  'provider = "postgresql"',
);

if (postgresSchema === source) {
  throw new Error("Could not locate the SQLite datasource provider.");
}

await writeFile(
  targetPath,
  `// Generated from prisma/schema.prisma by scripts/prepare-postgres-schema.mjs.\n${postgresSchema}`,
  "utf8",
);
