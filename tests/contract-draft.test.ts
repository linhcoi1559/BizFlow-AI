import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyContractDraft, encodeContractDraft, readContractDraft } from "../src/lib/contract-draft";

test("incomplete contract input round-trips, including Vietnamese and individual details", () => {
  const fields = { ...emptyContractDraft, partyKind: "individual" as const, name: "Nguyễn Văn A", birthDate: "1990-01-02", identityNumber: "012345678901", purpose: "Nội dung đang nhập", totalValue: "" };
  assert.deepEqual(readContractDraft(encodeContractDraft(fields)), fields);
});
test("corrupt, incompatible and oversized browser drafts are rejected", () => {
  for (const raw of [null, "broken", "null", JSON.stringify({ version: 2, fields: emptyContractDraft }), JSON.stringify({ version: 1, fields: { ...emptyContractDraft, purpose: "x".repeat(4001) } })]) {
    assert.equal(readContractDraft(raw), null);
  }
});
test("restored drafts never contain server tickets or prior user consent", () => {
  const raw = JSON.stringify({ version: 1, fields: { ...emptyContractDraft, ticket: "untrusted", confirm: true, acknowledgeDuplicate: true } });
  const fields = readContractDraft(raw)!;
  assert.ok(!("ticket" in fields));
  assert.ok(!("confirm" in fields));
  assert.ok(!("acknowledgeDuplicate" in fields));
});
