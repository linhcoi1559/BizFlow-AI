import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { scopeKey, sealPreview } from "../src/services/ai/chatgpt/security";
import {
  contractInputSchema,
  contractParties,
} from "../src/services/documents/ai-contract";
const db = new PrismaClient();
const base = "http://127.0.0.1:3015";
const marker = "AI-VERIFY-" + randomUUID().slice(0, 8);
const decode = (v: string) =>
  v
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
function hidden(form: string) {
  return [...form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)]
    .map(
      (m) =>
        [
          decode(m[0].match(/name="([^"]*)"/)?.[1] || ""),
          decode(m[0].match(/value="([^"]*)"/)?.[1] || ""),
        ] as [string, string],
    )
    .filter(([name]) => name);
}
async function main() {
  assert.ok(
    process.env.DATABASE_URL === "file:./phase5-verification.db",
    "Disposable database required; URL redacted",
  );
  const organization = await db.organization.findFirstOrThrow({
    orderBy: { createdAt: "asc" },
  });
  const owner = await db.organizationMembership.findFirstOrThrow({
    where: { organizationId: organization.id, role: "owner", status: "active" },
  });
  const company = await db.companyProfile.findUniqueOrThrow({
    where: { organizationId: organization.id },
  });
  const html = await (await fetch(base + "/contracts/new")).text();
  assert.ok(html.includes("Tạo hợp đồng bằng AI"));
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].find((m) =>
    m[0].includes('name="purpose"'),
  )?.[0];
  assert.ok(form);
  assert.match(
    form,
    /<button\b[^>]*type="submit"[^>]*>/,
    "Contract generation must have a working submit button",
  );
  const fields = hidden(form);
  const manifest = JSON.parse(
    await readFile(
      ".next-ai-demo/server/server-reference-manifest.json",
      "utf8",
    ),
  );
  const confirmId = Object.entries(manifest.node).find(
    ([, entry]) =>
      (entry as { exportedName: string }).exportedName ===
      "confirmContractAction",
  )?.[0];
  assert.ok(confirmId);
  const actions = fields.map(
    ([name, value]) =>
      [
        name,
        value.includes('"id":')
          ? JSON.stringify({ ...JSON.parse(value), id: confirmId })
          : value,
      ] as [string, string],
  );
  const input = contractInputSchema.parse({
    partyKind: "individual",
    name: marker,
    address: "123 Đường Kiểm Thử, Hà Nội",
    birthDate: "1990-01-02",
    purpose:
      "Thiết kế website giới thiệu dịch vụ với tiêu chí nghiệm thu đã thống nhất",
    startDate: "2026-11-01",
    endDate: "2027-01-31",
    totalValue: 30_000_000,
    paymentTerms: "50% khi ký và 50% sau nghiệm thu",
  });
  const content = {
    title: "Hợp đồng kiểm thử " + marker,
    sections: [
      {
        key: "parties",
        heading: "Thông tin các bên",
        body: contractParties(input, company),
      },
      { key: "scope", heading: "Phạm vi", body: input.purpose },
    ],
    lineItems: [
      {
        description: "Thiết kế website",
        quantity: 1,
        unit: "gói",
        unitPrice: input.totalValue,
      },
    ],
    totalValue: input.totalValue,
    currency: "VND",
    paymentTerms: input.paymentTerms,
    notes: "Fixture kiểm thử; không phải kết quả ChatGPT live.",
  };
  const reference = `BF-CT-2026-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const data = {
    input,
    content,
    missingFields: ["Cần nhân sự xác nhận tiêu chí nghiệm thu"],
    provider: "test-fixture",
    model: "test-fixture",
    reference,
    companyUpdatedAt: company.updatedAt.toISOString(),
    templateUpdatedAt: null,
  };
  const key = scopeKey(organization.id, owner.userId);
  const ticket = sealPreview(data, key);
  async function post(
    value: string,
    confirmed = true,
    acceptUnresolved = true,
  ) {
    const body = new FormData();
    for (const [name, v] of actions) body.set(name, v);
    body.set("ticket", value);
    if (confirmed) body.set("confirm", "on");
    if (acceptUnresolved) body.set("acceptUnresolved", "on");
    return fetch(base + "/contracts/new", {
      method: "POST",
      headers: { Origin: base },
      body,
      redirect: "manual",
    });
  }
  const before = await db.document.count();
  let projectId: string | undefined;
  let clientId: string | undefined;
  try {
    assert.equal((await post(ticket, false)).status, 200);
    assert.equal(await db.document.count(), before);
    assert.equal((await post(ticket + "x")).status, 200);
    assert.equal(await db.document.count(), before);
    assert.equal(
      (
        await post(
          sealPreview(
            { ...data, missingFields: ["Cần nhân sự xác nhận nghiệm thu"] },
            key,
          ),
          true,
          false,
        )
      ).status,
      200,
    );
    assert.equal(await db.document.count(), before);
    assert.equal(
      (await post(sealPreview(data, scopeKey("foreign", owner.userId)))).status,
      200,
    );
    assert.equal(await db.document.count(), before);
    await db.organizationMembership.update({
      where: { id: owner.id },
      data: { role: "member" },
    });
    assert.ok(
      (await post(ticket)).headers.get("location")?.includes("access-denied"),
    );
    assert.equal(await db.document.count(), before);
    await db.organizationMembership.update({
      where: { id: owner.id },
      data: { role: "owner" },
    });
    const result = await post(ticket);
    assert.ok(result.headers.get("location")?.includes("/documents/"));
    const document = await db.document.findFirstOrThrow({
      where: { organizationId: organization.id, referenceNumber: reference },
      include: { versions: true },
    });
    projectId = document.projectId;
    clientId = document.clientId;
    assert.equal(document.status, "draft");
    assert.equal(document.versions.length, 1);
    assert.match(document.versions[0].changeNote || "", /chấp nhận 1 cảnh báo/);
    assert.ok(
      JSON.stringify(document.versions[0].content).includes("1990-01-02"),
    );
    assert.equal(
      (await db.project.findUniqueOrThrow({ where: { id: projectId } }))
        .aiProvider,
      "test-fixture",
    );
    assert.equal(
      (await fetch(base + `/documents/${document.id}/export/pdf`)).status,
      409,
    );
    assert.ok(
      (await post(ticket)).headers.get("location")?.includes(document.id),
    );
    assert.equal(await db.document.count(), before + 1);
    async function docAction(
      action: string,
      extra: Record<string, string> = {},
    ) {
      const page = await (
        await fetch(base + `/documents/${document.id}`)
      ).text();
      const forms = [...page.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(
        (m) => m[0],
      );
      const actionId = Object.entries(manifest.node).find(
        ([, entry]) =>
          (entry as { exportedName: string }).exportedName === action,
      )?.[0];
      assert.ok(actionId);
      const target = forms.find((f) => f.includes(actionId));
      assert.ok(target, action + " form");
      const body = new FormData();
      for (const [name, v] of hidden(target)) body.set(name, v);
      body.set("id", document.id);
      for (const [name, v] of Object.entries(extra)) body.set(name, v);
      return fetch(base + `/documents/${document.id}`, {
        method: "POST",
        headers: { Origin: base },
        body,
        redirect: "manual",
      });
    }
    await docAction("submitDocumentForReviewAction");
    assert.equal(
      (await db.document.findUniqueOrThrow({ where: { id: document.id } }))
        .status,
      "in_review",
    );
    await docAction("approveDocumentAction", {
      approvedByName: "Người kiểm thử",
    });
    assert.equal(
      (await db.document.findUniqueOrThrow({ where: { id: document.id } }))
        .status,
      "approved",
    );
    for (const format of ["pdf", "docx"]) {
      const response = await fetch(
        base + `/documents/${document.id}/export/${format}`,
      );
      assert.equal(response.status, 200);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.ok(bytes.length > 1000);
      assert.equal(
        bytes.subarray(0, format === "pdf" ? 4 : 2).toString(),
        format === "pdf" ? "%PDF" : "PK",
      );
    }
    const settings = await (await fetch(base + "/settings/ai")).text();
    assert.ok(settings.includes("Continue with ChatGPT"));
    const connectForm = [...settings.matchAll(/<form\b[\s\S]*?<\/form>/g)].find(
      (m) => m[0].includes("Continue with ChatGPT"),
    )?.[0];
    assert.ok(connectForm);
    assert.match(
      connectForm,
      /<button\b[^>]*type="submit"[^>]*>/,
      "ChatGPT connection must have a working submit button",
    );
    const settingsForm = [
      ...settings.matchAll(/<form\b[\s\S]*?<\/form>/g),
    ].find((m) => m[0].includes("Lưu lựa chọn AI"))?.[0];
    assert.ok(settingsForm);
    assert.match(
      settingsForm,
      /<button\b[^>]*type="submit"[^>]*>/,
      "AI settings must have a working submit button",
    );
    const body = new FormData();
    for (const [name, v] of hidden(connectForm)) body.set(name, v);
    const connect = await fetch(base + "/settings/ai", {
      method: "POST",
      headers: { Origin: base },
      body,
      redirect: "manual",
    });
    const location = connect.headers.get("location");
    assert.ok(location);
    const url = new URL(location);
    assert.equal(url.origin, "https://auth.openai.com");
    assert.equal(url.searchParams.get("client_id"), "dynamic_agent_client");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.ok(
      url.searchParams.get("scope")?.includes("chatgpt.tokens.use.direct"),
    );
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    assert.equal(callback.hostname, "127.0.0.1");
    assert.equal(callback.pathname, "/auth/callback");
    callback.searchParams.set("state", "wrong");
    assert.equal((await fetch(callback)).status, 400);
    callback.searchParams.set("state", url.searchParams.get("state")!);
    callback.searchParams.set("error", "access_denied");
    const denied = await fetch(callback, { redirect: "manual" });
    assert.equal(denied.status, 303);
    assert.ok(denied.headers.get("location")?.endsWith("connection=error"));
    console.log(
      "PASS: real Server Action confirmation rejects tampered/cross-tenant/unconfirmed/lower-role requests; transaction creates individual contract, repeat confirmation is idempotent; real submit/approve actions and PDF/DOCX exports pass; OAuth URL/PKCE/scopes/loopback/state/denial pass. No real ChatGPT inference was claimed.",
    );
  } finally {
    await db.organizationMembership.update({
      where: { id: owner.id },
      data: { role: owner.role },
    });
    if (projectId) {
      await db.activity.deleteMany({ where: { projectId } });
      await db.project.delete({ where: { id: projectId } });
    }
    if (clientId) {
      await db.activity.deleteMany({ where: { clientId } });
      await db.client.delete({ where: { id: clientId } });
    }
  }
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Verification failed",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
