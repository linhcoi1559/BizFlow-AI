import "dotenv/config";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://127.0.0.1:3015";
const marker = `VERIFY-${randomUUID().slice(0, 8)}`;
function decode(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
async function main() {
  assert.ok(
    process.env.DATABASE_URL === "file:./phase5-verification.db",
    "Only the disposable verification database is allowed",
  );
  const organization = await prisma.organization.findFirstOrThrow({
    orderBy: { createdAt: "asc" },
  });
  const project = await prisma.project.findFirstOrThrow({
    where: { organizationId: organization.id, tasks: { some: {} } },
    include: { client: true },
  });
  const membership = await prisma.organizationMembership.findFirstOrThrow({
    where: { organizationId: organization.id, role: "owner", status: "active" },
  });
  const editUrl = `${baseUrl}/projects/${project.id}/edit`;
  const html = await (await fetch(editUrl)).text();
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].find((match) =>
    match[0].includes('name="name"'),
  )?.[0];
  assert.ok(form, "Project edit form must exist");
  const hidden: Array<[string, string]> = [];
  for (const match of form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) {
    const name = match[0].match(/name="([^"]*)"/)?.[1];
    if (name)
      hidden.push([
        decode(name),
        decode(match[0].match(/value="([^"]*)"/)?.[1] ?? ""),
      ]);
  }
  assert.ok(
    hidden.some(([name]) => name.startsWith("$ACTION_")),
    "Must submit the real Server Action form",
  );
  async function post(
    overrides: Record<string, string> = {},
  ): Promise<Response> {
    const body = new FormData();
    for (const [name, value] of hidden) body.set(name, value);
    for (const [name, value] of Object.entries({
      id: project.id,
      clientId: project.clientId,
      name: marker,
      description: "Kiểm thử cập nhật dự án",
      serviceType: project.serviceType ?? "",
      status: "paused",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      totalValue: project.totalValue.toString(),
      currency: project.currency,
      ownerName: "Người kiểm thử",
      progress: "99",
      kpi: "Kiểm thử Phase 5",
      ...overrides,
    }))
      body.set(name, value);
    return fetch(editUrl, {
      method: "POST",
      headers: { Origin: baseUrl },
      body,
      redirect: "manual",
    });
  }
  let foreignId: string | null = null;
  let documentId: string | null = null;
  let bootstrapUserId: string | null = null;
  let invitationTargetId: string | null = null;
  try {
    const beforeActivities = await prisma.activity.count({
      where: { projectId: project.id },
    });
    const invalid = await post({ clientId: "foreign-client" });
    assert.equal(invalid.status, 200);
    assert.ok((await invalid.text()).includes("Không thể chuyển dự án"));
    assert.equal(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .name,
      project.name,
    );
    const valid = await post();
    assert.equal(valid.status, 303);
    assert.ok(
      valid.headers
        .get("location")
        ?.includes(`/projects/${project.id}?updated=1`),
    );
    const updated = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    assert.equal(updated.name, marker);
    assert.equal(updated.status, "paused");
    assert.equal(
      updated.progress,
      project.progress,
      "Task-derived progress cannot be overwritten",
    );
    assert.equal(
      await prisma.activity.count({ where: { projectId: project.id } }),
      beforeActivities + 1,
    );
    await prisma.client.update({
      where: { id: project.clientId },
      data: { status: "archived" },
    });
    assert.ok(
      (await (await fetch(editUrl)).text()).includes(
        project.client.companyName,
      ),
      "Archived parent client must remain visible in edit form",
    );
    const foreign = await prisma.organization.create({
      data: { name: marker, clients: { create: { companyName: marker } } },
      include: { clients: true },
    });
    foreignId = foreign.id;
    const foreignProject = await prisma.project.create({
      data: {
        organizationId: foreign.id,
        clientId: foreign.clients[0].id,
        name: marker,
      },
    });
    const deniedTenant = await post({
      id: foreignProject.id,
      clientId: foreignProject.clientId,
      name: "Forbidden update",
    });
    assert.equal(deniedTenant.status, 200);
    assert.ok((await deniedTenant.text()).includes("Không tìm thấy dự án"));
    assert.equal(
      (
        await prisma.project.findUniqueOrThrow({
          where: { id: foreignProject.id },
        })
      ).name,
      marker,
    );
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role: "member" },
    });
    const deniedPage = await fetch(editUrl, { redirect: "manual" });
    const deniedPageBody = await deniedPage.text();
    assert.ok(
      deniedPage.headers.get("location")?.includes("/access-denied") ||
        deniedPageBody.includes("/access-denied"),
    );
    assert.equal(
      deniedPageBody.includes('name="name"'),
      false,
      "Denied page must not render the edit form",
    );
    const deniedRole = await post({ name: "Forbidden role update" });
    assert.ok(deniedRole.headers.get("location")?.includes("/access-denied"));
    assert.equal(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .name,
      marker,
    );
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role: "owner" },
    });
    const targetUser = await prisma.user.create({
      data: { email: marker.toLowerCase() + "-owner@example.test" },
    });
    invitationTargetId = targetUser.id;
    const targetMembership = await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: targetUser.id,
        role: "owner",
        status: "suspended",
      },
    });
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role: "admin" },
    });
    const membersHtml = await (
      await fetch(baseUrl + "/settings/members")
    ).text();
    const invitationForm = [
      ...membersHtml.matchAll(/<form\b[\s\S]*?<\/form>/g),
    ].find((match) => match[0].includes('name="email"'))?.[0];
    assert.ok(invitationForm, "Admin invitation form must exist");
    const invitationBody = new FormData();
    for (const match of invitationForm.matchAll(
      /<input\b[^>]*type="hidden"[^>]*>/g,
    )) {
      const name = match[0].match(/name="([^"]*)"/)?.[1];
      if (name)
        invitationBody.set(
          decode(name),
          decode(match[0].match(/value="([^"]*)"/)?.[1] ?? ""),
        );
    }
    invitationBody.set("email", targetUser.email);
    invitationBody.set("displayName", "Attempted owner demotion");
    invitationBody.set("role", "member");
    const deniedInvitation = await fetch(baseUrl + "/settings/members", {
      method: "POST",
      headers: { Origin: baseUrl },
      body: invitationBody,
      redirect: "manual",
    });
    assert.ok(deniedInvitation.headers.get("location")?.includes("error="));
    const protectedOwner =
      await prisma.organizationMembership.findUniqueOrThrow({
        where: { id: targetMembership.id },
      });
    assert.equal(protectedOwner.role, "owner");
    assert.equal(protectedOwner.status, "suspended");
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role: "owner" },
    });
    const content = {
      title: "Tài liệu kiểm thử Phase 5",
      sections: [
        {
          key: "scope",
          heading: "Phạm vi",
          body: "Nội dung tiếng Việt để kiểm tra xuất tài liệu.",
        },
      ],
      lineItems: [
        {
          description: "Dịch vụ kiểm thử",
          quantity: 1,
          unit: "dự án",
          unitPrice: 1000,
        },
      ],
      currency: "VND",
      totalValue: 1000,
      paymentTerms: "Thanh toán theo thỏa thuận",
      notes: "",
    };
    const document = await prisma.document.create({
      data: {
        organizationId: organization.id,
        projectId: project.id,
        clientId: project.clientId,
        title: content.title,
        referenceNumber: marker,
        type: "contract",
        versions: { create: { version: 1, content } },
      },
    });
    documentId = document.id;
    assert.equal(
      (await fetch(`${baseUrl}/documents/${document.id}/export/pdf`)).status,
      409,
      "Draft export must be blocked",
    );
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedByName: "Kiểm thử",
      },
    });
    for (const format of ["pdf", "docx"]) {
      const response: Response = await fetch(
        `${baseUrl}/documents/${document.id}/export/${format}`,
      );
      assert.equal(response.status, 200, format + " export");
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.ok(bytes.length > 1000);
      assert.equal(
        bytes.subarray(0, format === "pdf" ? 4 : 2).toString(),
        format === "pdf" ? "%PDF" : "PK",
      );
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
    const email = `${marker.toLowerCase()}@example.test`;
    function bootstrap(name = organization.name) {
      return spawnSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "prisma/bootstrap.ts"],
        {
          env: {
            ...process.env,
            BIZFLOW_ORGANIZATION_NAME: name,
            BIZFLOW_BOOTSTRAP_OWNER_EMAIL: email,
          },
          encoding: "utf8",
        },
      );
    }
    assert.equal(bootstrap().status, 0);
    const bootstrapUser = await prisma.user.findUniqueOrThrow({
      where: { email },
    });
    bootstrapUserId = bootstrapUser.id;
    const invitation = await prisma.organizationMembership.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: bootstrapUser.id,
        },
      },
    });
    assert.equal(invitation.status, "invited");
    assert.equal(bootstrap().status, 0);
    assert.equal(
      await prisma.organizationMembership.count({
        where: { userId: bootstrapUser.id },
      }),
      1,
    );
    await prisma.organizationMembership.update({
      where: { id: invitation.id },
      data: { status: "suspended" },
    });
    assert.equal(bootstrap().status, 0);
    assert.equal(
      (
        await prisma.organizationMembership.findUniqueOrThrow({
          where: { id: invitation.id },
        })
      ).status,
      "suspended",
    );
    await prisma.organizationMembership.update({
      where: { id: invitation.id },
      data: { role: "member" },
    });
    assert.equal(
      bootstrap().status,
      1,
      "Bootstrap must not promote an existing member",
    );
    assert.equal(
      bootstrap("Wrong organization").status,
      1,
      "Bootstrap must not select an unrelated workspace",
    );
    assert.equal(
      (
        await prisma.organizationMembership.findUniqueOrThrow({
          where: { id: invitation.id },
        })
      ).role,
      "member",
    );
    console.log(
      "PASS: real project edit submission, immutable client, task progress, archived client, cross-tenant and lower-role mutation denial, admin owner-reinvitation denial, draft export denial, PDF/DOCX export, bootstrap idempotence and no reactivation/promotion.",
    );
  } finally {
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role: membership.role },
    });
    await prisma.client.update({
      where: { id: project.clientId },
      data: { status: project.client.status },
    });
    if (documentId) await prisma.document.delete({ where: { id: documentId } });
    if (foreignId)
      await prisma.organization.delete({ where: { id: foreignId } });
    if (invitationTargetId)
      await prisma.user.delete({ where: { id: invitationTargetId } });
    if (bootstrapUserId)
      await prisma.user.delete({ where: { id: bootstrapUserId } });
  }
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
