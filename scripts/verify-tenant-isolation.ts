import "dotenv/config";

import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.startsWith("file:")) {
  throw new Error("Tenant isolation smoke tests only run against the local SQLite database.");
}

const prisma = new PrismaClient();
const marker = `TENANT-B-${randomUUID().slice(0, 8)}`;
const port = Number(process.env.BIZFLOW_TEST_PORT ?? 3014);
const baseUrl = `http://127.0.0.1:${port}`;
let organizationId: string | null = null;
let userId: string | null = null;
let server: ChildProcess | null = null;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error("Production server did not become ready for tenant isolation tests.");
}

async function expectHidden(pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`);
  assert.equal(response.status, 200, `${pathname} should remain available to tenant A`);
  const body = await response.text();
  assert.equal(body.includes(marker), false, `${pathname} leaked tenant B data`);
}

async function expectInaccessiblePage(pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  assert.equal([200, 404].includes(response.status), true, `${pathname} returned an unexpected status`);
  const body = await response.text();
  assert.equal(body.includes(marker), false, `${pathname} exposed tenant B data`);
  assert.equal(body.includes("Không tìm thấy dữ liệu"), true, `${pathname} did not render the not-found state`);
}

async function expectNotFoundResponse(pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
  assert.equal(response.status, 404, `${pathname} should return a non-streaming 404`);
  assert.equal((await response.text()).includes(marker), false, `${pathname} exposed tenant B data`);
}

async function main() {
try {
  const user = await prisma.user.create({
    data: { email: `${marker.toLowerCase()}@example.test`, displayName: marker },
  });
  userId = user.id;
  const organization = await prisma.organization.create({
    data: {
      name: marker,
      companyProfile: { create: { companyName: marker } },
      memberships: {
        create: { userId: user.id, role: "owner", status: "active", joinedAt: new Date() },
      },
    },
  });
  organizationId = organization.id;
  const client = await prisma.client.create({
    data: { organizationId: organization.id, companyName: marker },
  });
  const project = await prisma.project.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      name: marker,
      totalValue: 1,
    },
  });
  const template = await prisma.template.create({
    data: {
      organizationId: organization.id,
      templateKey: marker.toLowerCase(),
      name: marker,
      type: "contract",
      content: {},
    },
  });
  const document = await prisma.document.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      templateId: template.id,
      referenceNumber: marker,
      title: marker,
      type: "contract",
      versions: { create: { version: 1, content: {} } },
    },
  });
  const plan = await prisma.plan.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      title: marker,
      items: { create: { title: marker, position: 1 } },
    },
    include: { items: true },
  });
  await prisma.task.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      planItemId: plan.items[0]?.id,
      title: marker,
    },
  });
  await prisma.paymentMilestone.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      referenceNumber: marker,
      title: marker,
      amount: 1,
    },
  });
  await prisma.reminder.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      type: "general",
      title: marker,
      dueAt: new Date(),
    },
  });
  await prisma.activity.create({
    data: { organizationId: organization.id, message: marker, type: "project_created" },
  });

  server = spawn(
    process.execPath,
    [resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BIZFLOW_DEMO_MODE: "true",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let serverOutput = "";
  server.stdout?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer();

  for (const pathname of [
    "/",
    "/login",
    "/signup",
    "/ai-workspace",
    "/clients",
    "/projects",
    "/projects/new",
    "/documents",
    "/documents/new",
    "/templates",
    "/tasks",
    "/payments",
    "/reminders",
    "/activity",
    "/settings/company",
    "/settings/members",
    `/search?q=${encodeURIComponent(marker.slice(-8))}`,
  ]) {
    await expectHidden(pathname);
  }
  for (const pathname of [
    `/clients/${client.id}`,
    `/clients/${client.id}/edit`,
    `/projects/${project.id}`,
    `/projects/${project.id}/edit`,
    `/documents/${document.id}`,
    `/templates/${template.id}`,
  ]) {
    await expectInaccessiblePage(pathname);
  }
  await expectNotFoundResponse(`/documents/${document.id}/export/pdf`);

  assert.equal(server.exitCode, null, serverOutput);
  console.log("Tenant isolation verified across lists, search, members, details, and export routes.");
} finally {
  if (server && server.exitCode === null) server.kill();
  if (organizationId) await prisma.organization.delete({ where: { id: organizationId } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
