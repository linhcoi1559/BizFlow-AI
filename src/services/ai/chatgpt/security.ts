import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function secretKey() {
  const value = process.env.BIZFLOW_AI_SECRET;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error("Cần cấu hình BIZFLOW_AI_SECRET trên máy chủ.");
  return Buffer.from(value, "hex");
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function decrypt(value: string): unknown {
  const data = Buffer.from(value, "base64url");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    secretKey(),
    data.subarray(0, 12),
  );
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString(
      "utf8",
    ),
  );
}
export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function scopeKey(organizationId: string, userId: string) {
  return createHash("sha256")
    .update(JSON.stringify([organizationId, userId]))
    .digest("hex");
}
export function sealPreview(value: unknown, scope: string) {
  const payload = Buffer.from(
    JSON.stringify({ value, scope, expires: Date.now() + 30 * 60_000 }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secretKey()).update(payload).digest("base64url")
  );
}
export function openPreview(token: string, scope: string): unknown {
  if (token.length > 250_000) throw new Error("Bản nháp quá lớn.");
  const [payload, mac, extra] = token.split(".");
  if (
    extra ||
    !payload ||
    !mac ||
    !safeEqual(
      mac,
      createHmac("sha256", secretKey()).update(payload).digest("base64url"),
    )
  )
    throw new Error("Bản nháp không hợp lệ. Hãy tạo lại.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (parsed.scope !== scope || parsed.expires < Date.now())
    throw new Error(
      "Bản nháp đã hết hạn hoặc thuộc tài khoản khác. Hãy tạo lại.",
    );
  return parsed.value;
}
