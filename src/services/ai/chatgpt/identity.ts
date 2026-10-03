import { jwtVerify, type JWTVerifyGetKey } from "jose";
export async function verifiedIdentity(
  token: string,
  clientId: string,
  nonce: string | undefined,
  previousSubject: string | undefined,
  keys: JWTVerifyGetKey,
) {
  const { payload } = await jwtVerify(token, keys, {
    issuer: "https://auth.openai.com",
    audience: clientId,
    algorithms: ["RS256"],
    requiredClaims: nonce ? ["exp", "sub", "nonce"] : ["exp", "sub"],
  });
  if (
    (nonce && payload.nonce !== nonce) ||
    (previousSubject && payload.sub !== previousSubject)
  )
    throw new Error("Identity mismatch");
  return {
    subject: payload.sub!,
    email:
      typeof payload.email === "string" ? payload.email : "Tài khoản ChatGPT",
  };
}
export function issuedClient(
  callbackId: string | null,
  savedId: string | undefined,
) {
  const id = callbackId || savedId;
  if (!id || id === "dynamic_agent_client" || (savedId && id !== savedId))
    throw new Error("Invalid registration");
  return id;
}
