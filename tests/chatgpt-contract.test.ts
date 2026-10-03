import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import {
  encrypt,
  decrypt,
  scopeKey,
  sealPreview,
  openPreview,
} from "../src/services/ai/chatgpt/security";
import { completedStream } from "../src/services/ai/chatgpt/stream";
import {
  issuedClient,
  verifiedIdentity,
} from "../src/services/ai/chatgpt/identity";
import {
  contractInputSchema,
  generateContract,
  reviseContract,
} from "../src/services/documents/ai-contract";
import type { AIProvider } from "../src/services/ai/provider";
process.env.BIZFLOW_AI_SECRET = randomBytes(32).toString("hex");
const facts = {
  partyKind: "individual" as const,
  name: "Nguyễn Văn A",
  address: "123 Nguyễn Trãi, Hà Nội",
  birthDate: "1990-01-02",
  purpose: "Thiết kế website giới thiệu công ty",
  startDate: "2026-11-01",
  endDate: "2027-01-31",
  totalValue: 30_000_000,
  paymentTerms: "50% khi ký, 50% sau nghiệm thu",
};
test("encrypted credential storage detects tampering and never contains plaintext", () => {
  const cipher = encrypt({ accessToken: "private-test-token" });
  assert.ok(!cipher.includes("private-test-token"));
  assert.deepEqual(decrypt(cipher), { accessToken: "private-test-token" });
  const bytes = Buffer.from(cipher, "base64url");
  bytes[30] ^= 1;
  assert.throws(() => decrypt(bytes.toString("base64url")));
});
test("review receipt rejects alteration, cross-user/cross-tenant use and expiration", () => {
  const scope = scopeKey("org-a", "user-a");
  const ticket = sealPreview({ value: 123 }, scope);
  assert.deepEqual(openPreview(ticket, scope), { value: 123 });
  assert.throws(() => openPreview(ticket, scopeKey("org-b", "user-a")));
  assert.throws(() => openPreview(ticket, scopeKey("org-a", "user-b")));
  assert.throws(() => openPreview(ticket + "x", scope));
  const original = Date.now;
  Date.now = () => original() + 31 * 60_000;
  try {
    assert.throws(() => openPreview(ticket, scope));
  } finally {
    Date.now = original;
  }
});
test("initial and returning registrations cannot replace client identity", () => {
  assert.equal(issuedClient("oaiapp_new", undefined), "oaiapp_new");
  assert.equal(issuedClient(null, "oaiapp_saved"), "oaiapp_saved");
  assert.throws(() => issuedClient(null, undefined));
  assert.throws(() => issuedClient("dynamic_agent_client", undefined));
  assert.throws(() => issuedClient("oaiapp_other", "oaiapp_saved"));
});
test("OIDC identity checks signature, issuer, audience, nonce, expiry and returning subject", async () => {
  const pair = await generateKeyPair("RS256");
  const jwk = await exportJWK(pair.publicKey);
  const keys = createLocalJWKSet({
    keys: [{ ...jwk, kid: "test", alg: "RS256" }],
  });
  async function token(override: Record<string, unknown> = {}) {
    return new SignJWT({
      sub: "user",
      nonce: "nonce",
      iss: "https://auth.openai.com",
      aud: "client",
      exp: Math.floor(Date.now() / 1000) + 60,
      ...override,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .sign(pair.privateKey);
  }
  assert.equal(
    (await verifiedIdentity(await token(), "client", "nonce", undefined, keys))
      .subject,
    "user",
  );
  for (const override of [
    { iss: "https://attacker.test" },
    { aud: "other" },
    { nonce: "other" },
    { exp: 1 },
    { sub: "other" },
  ])
    await assert.rejects(() =>
      token(override).then((value) =>
        verifiedIdentity(value, "client", "nonce", "user", keys),
      ),
    );
  const wrong = await generateKeyPair("RS256");
  const forged = await new SignJWT({
    sub: "user",
    nonce: "nonce",
    iss: "https://auth.openai.com",
    aud: "client",
    exp: Math.floor(Date.now() / 1000) + 60,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .sign(wrong.privateKey);
  await assert.rejects(() =>
    verifiedIdentity(forged, "client", "nonce", undefined, keys),
  );
});
function response(events: unknown[]) {
  return new Response(
    events.map((event) => "data: " + JSON.stringify(event) + "\n\n").join(""),
  );
}
test("stream requires completed event; usage errors after partial text are rejected", async () => {
  assert.equal(
    await completedStream(
      response([
        { type: "response.output_text.delta", delta: "Tiếng Việt" },
        { type: "response.completed" },
      ]),
    ),
    "Tiếng Việt",
  );
  await assert.rejects(() =>
    completedStream(
      response([{ type: "response.output_text.delta", delta: "Partial" }]),
    ),
  );
  await assert.rejects(() =>
    completedStream(
      response([
        { type: "response.output_text.delta", delta: "Partial" },
        {
          type: "response.failed",
          response: {
            error: { code: "subscription_sharing_usage_limit_exceeded" },
          },
        },
      ]),
    ),
  );
  await assert.rejects(() =>
    completedStream(response([{ type: "response.incomplete" }])),
  );
});
test("stream handles split UTF-8 and split events", async () => {
  const bytes = new TextEncoder().encode(
    'data: {"type":"response.output_text.delta","delta":"Hợp đồng"}\n\ndata: {"type":"response.completed"}\n\n',
  );
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 2)
        controller.enqueue(bytes.slice(i, i + 2));
      controller.close();
    },
  });
  assert.equal(await completedStream(new Response(stream)), "Hợp đồng");
});
test("contract inputs reject imaginary dates, reversed timeline and missing representative", () => {
  assert.ok(contractInputSchema.safeParse(facts).success);
  for (const override of [
    { startDate: "2026-02-30" },
    { endDate: "2026-01-01" },
    { totalValue: 0 },
    { partyKind: "company" },
    { birthDate: "2100-01-01" },
  ])
    assert.ok(
      !contractInputSchema.safeParse({ ...facts, ...override }).success,
    );
});
test("AI clauses cannot overwrite structured parties, financial terms or provenance", async () => {
  const provider: AIProvider = {
    providerName: "test-provider",
    model: "test-model",
    generateText: async () => "",
    generateStructuredData: async () => ({
      data: {
        sections: [
          { heading: "Phạm vi", body: "Thiết kế và nghiệm thu website." },
          {
            heading: "Trách nhiệm",
            body: "Hai bên cung cấp thông tin đã thống nhất.",
          },
          { heading: "Bảo mật", body: "Bảo mật dữ liệu trao đổi." },
        ],
        missingFields: [],
      },
      rawText: "",
      provider: "fake",
      model: "fake",
    }),
  };
  const generated = await generateContract(
    contractInputSchema.parse(facts),
    {
      companyName: "BizFlow",
      address: "Hà Nội",
      taxCode: null,
      representativeName: "Người đại diện",
    },
    {},
    provider,
  );
  assert.equal(generated.content.totalValue, 30_000_000);
  assert.equal(generated.content.paymentTerms, facts.paymentTerms);
  assert.equal(generated.content.lineItems[0].unitPrice, 30_000_000);
  assert.ok(generated.content.sections[0].body.includes("1990-01-02"));
  assert.equal(generated.provider, "test-provider");
  assert.equal(generated.model, "test-model");
  const invalid = {
    ...provider,
    generateStructuredData: async () => ({
      data: { sections: [], missingFields: [] },
      rawText: "",
      provider: "test",
      model: "test",
    }),
  };
  await assert.rejects(() =>
    generateContract(
      contractInputSchema.parse(facts),
      {
        companyName: "BizFlow",
        address: null,
        taxCode: null,
        representativeName: null,
      },
      {},
      invalid,
    ),
  );
});

const currentContent = {
  title: "Hợp đồng dịch vụ với Nguyễn Văn A",
  sections: [
    { key: "parties", heading: "Thông tin các bên", body: "Bên A và B" },
    {
      key: "commercial",
      heading: "Nội dung và điều kiện thương mại",
      body: "Giá trị và thời hạn đã xác nhận",
    },
    { key: "ai_clause_0", heading: "Phạm vi", body: "Bản cũ" },
  ],
  lineItems: [
    {
      description: facts.purpose,
      quantity: 1,
      unit: "gói dịch vụ",
      unitPrice: facts.totalValue,
    },
  ],
  currency: "VND",
  totalValue: facts.totalValue,
  paymentTerms: facts.paymentTerms,
  notes: "Bản nháp",
};

test("contract chat revises all clauses and preserves server-owned facts", async () => {
  const missingFields = [
    "Số vòng chỉnh sửa là bao nhiêu?",
    "Thời gian báo trước khi chấm dứt là bao lâu?",
  ];
  const provider: AIProvider = {
    providerName: "test-provider",
    model: "test-model",
    generateText: async () => "",
    generateStructuredData: async () => ({
      data: {
        assistantReply:
          "Đã thêm ba vòng chỉnh sửa, thời hạn nghiệm thu và hướng dẫn đổi ngày kết thúc.",
        sections: [
          {
            heading: "Phạm vi và nghiệm thu",
            body: "Bao gồm 03 vòng chỉnh sửa; phản hồi trong 05 ngày làm việc.",
          },
          { heading: "Trách nhiệm", body: "Hai bên phối hợp đúng hạn." },
          { heading: "Bảo mật", body: "Hai bên bảo mật thông tin." },
        ],
        missingFields: [],
        manualChanges: [
          {
            field: "endDate",
            instruction: "Đổi ngày kết thúc tại biểu mẫu nếu hai bên đã chốt.",
          },
        ],
      },
      rawText: "",
      provider: "test-provider",
      model: "test-model",
    }),
  };
  const revision = await reviseContract(
    contractInputSchema.parse(facts),
    currentContent,
    missingFields,
    "Hãy tự hoàn thiện và đổi ngày kết thúc",
    provider,
  );
  assert.equal(revision.content.totalValue, facts.totalValue);
  assert.equal(revision.content.paymentTerms, facts.paymentTerms);
  assert.deepEqual(revision.content.sections.slice(0, 2), currentContent.sections.slice(0, 2));
  assert.match(revision.content.sections[2].body, /03 vòng chỉnh sửa/);
  assert.equal(revision.manualChanges[0].field, "endDate");
  assert.deepEqual(revision.missingFields, []);
});

test("contract chat rejects invalid revisions before updating the preview", async () => {
  const provider: AIProvider = {
    providerName: "test-provider",
    model: "test-model",
    generateText: async () => "",
    generateStructuredData: async () => ({
      data: {
        assistantReply: "Đã sửa",
        sections: [],
        missingFields: [],
        manualChanges: [{ field: "unknown", instruction: "Không hợp lệ" }],
      },
      rawText: "",
      provider: "test-provider",
      model: "test-model",
    }),
  };
  await assert.rejects(() =>
    reviseContract(
      contractInputSchema.parse(facts),
      currentContent,
      ["Câu hỏi một"],
      "Hãy tự hoàn thiện",
      provider,
    ),
  );
});
