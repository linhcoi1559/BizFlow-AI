import "server-only";
import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createRemoteJWKSet } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifiedIdentity, issuedClient } from "./identity";
import { safeEqual } from "./security";
import {
  readConnections,
  updateConnections,
  type ChatGPTProfile,
} from "./store";

const issuer = "https://auth.openai.com";
const jwks = createRemoteJWKSet(new URL(issuer + "/.well-known/jwks.json"));
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  scope: z.string().optional(),
  expires_in: z.number().positive(),
  token_type: z.string(),
});
export function localEnabled() {
  return process.env.BIZFLOW_CHATGPT_LOCAL === "true";
}
export async function requireLocalRuntime() {
  if (!localEnabled())
    throw new Error("Kết nối Plus chỉ bật trên bản BizFlow chạy cục bộ.");
  const host = (await headers()).get("host") || "";
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host))
    throw new Error("Mở BizFlow bằng địa chỉ localhost để kết nối ChatGPT.");
  return "http://" + host;
}
async function tokenRequest(params: URLSearchParams) {
  const response = await fetch(issuer + "/api/accounts/oauth/token", {
    method: "POST",
    body: params,
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "OpenAI chưa cấp kết nối hoặc phiên đã hết hạn. Hãy kết nối lại.",
    );
  const token = tokenSchema.parse(await response.json());
  if (token.token_type.toLowerCase() !== "bearer")
    throw new Error("Loại phiên OpenAI không hợp lệ.");
  return token;
}
const state = globalThis as typeof globalThis & {
  bizflowOAuthPending?: Map<string, () => void>;
};
const pending = (state.bizflowOAuthPending ??= new Map());
export async function beginSignIn(
  key: string,
  organizationId: string,
  userId: string,
  returnOrigin: string,
  newProfile = false,
) {
  pending.get(key)?.();
  const record = await updateConnections(key, (record) =>
    structuredClone(record),
  );
  const selected = newProfile
    ? undefined
    : record.profiles.find((profile) => profile.clientId === record.activeId);
  const registeredClientId =
    selected?.clientId || (!newProfile ? record.pendingClientId : undefined);
  const oauthState = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  let used = false;
  let redirectUri = "";
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/auth/callback") {
      response.writeHead(404).end();
      return;
    }
    if (used || !safeEqual(url.searchParams.get("state") || "", oauthState)) {
      response
        .writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
        .end("Phiên kết nối không hợp lệ.");
      return;
    }
    used = true;
    let result = "error";
    try {
      if (url.searchParams.has("error"))
        throw new Error("Authorization denied");
      const code = url.searchParams.get("code");
      const clientId = issuedClient(
        url.searchParams.get("client_id"),
        registeredClientId,
      );
      if (
        !code ||
        !clientId ||
        clientId === "dynamic_agent_client" ||
        (selected && clientId !== selected.clientId)
      )
        throw new Error("Invalid registration");
      if (!selected)
        await updateConnections(key, (current) => {
          if (pending.get(key) !== cleanup) throw new Error("Sign-in expired");
          current.pendingClientId = clientId;
        });
      const token = await tokenRequest(
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
          resource: "https://api.openai.com/v1",
        }),
      );
      if (!token.id_token) throw new Error("Missing verified identity");
      const identity = await verifiedIdentity(
        token.id_token,
        clientId,
        nonce,
        selected?.subject,
        jwks,
      );
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          userId,
          status: "active",
          role: { in: ["owner", "admin", "manager"] },
        },
      });
      if (!membership) throw new Error("Access revoked");
      const profile: ChatGPTProfile = {
        clientId,
        subject: identity.subject,
        email: identity.email,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        idToken: token.id_token,
        scopes: (token.scope || "").split(" ").filter(Boolean),
        expiresAt: Date.now() + token.expires_in * 1000,
        model: selected?.model,
      };
      await updateConnections(key, (current) => {
        if (pending.get(key) !== cleanup) throw new Error("Sign-in expired");
        if (current.pendingClientId === clientId)
          delete current.pendingClientId;
        const index = current.profiles.findIndex(
          (item) => item.clientId === clientId,
        );
        if (index >= 0) current.profiles[index] = profile;
        else current.profiles.push(profile);
        current.activeId = clientId;
        current.provider = "chatgpt";
      });
      result = profile.scopes.includes("chatgpt.tokens.use.direct")
        ? "connected"
        : "permission";
    } catch {
      /* Never log callback URLs, tokens, or provider response bodies. */
    }
    response
      .writeHead(303, {
        Location: returnOrigin + "/settings/ai?connection=" + result,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      })
      .end();
    cleanup();
  });
  const timer = setTimeout(() => cleanup(), 5 * 60_000);
  timer.unref();
  function cleanup() {
    clearTimeout(timer);
    server.close();
    if (pending.get(key) === cleanup) pending.delete(key);
  }
  pending.set(key, cleanup);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    cleanup();
    throw new Error("Không mở được kết nối cục bộ.");
  }
  redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
  const url = new URL(issuer + "/api/accounts/authorize");
  url.search = new URLSearchParams({
    client_id: registeredClientId || "dynamic_agent_client",
    ...(registeredClientId ? {} : { agent_name_hint: "BizFlow AI" }),
    ext_agent_host_id: record.hostId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:
      "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
    resource: "https://api.openai.com/v1",
    state: oauthState,
    nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  }).toString();
  return url.toString();
}
export async function accessToken(key: string) {
  return updateConnections(key, async (record) => {
    const profile = record.profiles.find(
      (item) => item.clientId === record.activeId,
    );
    if (
      !profile?.accessToken ||
      !profile.scopes.includes("chatgpt.tokens.use.direct")
    )
      throw new Error(
        "Hãy kết nối ChatGPT và cho phép BizFlow sử dụng gói của bạn.",
      );
    if (profile.expiresAt < Date.now() + 60_000) {
      if (!profile.refreshToken)
        throw new Error("Phiên ChatGPT đã hết hạn. Hãy kết nối lại.");
      const token = await tokenRequest(
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: profile.clientId,
          refresh_token: profile.refreshToken,
          resource: "https://api.openai.com/v1",
        }),
      );
      if (token.id_token)
        await verifiedIdentity(
          token.id_token,
          profile.clientId,
          undefined,
          profile.subject,
          jwks,
        );
      profile.accessToken = token.access_token;
      profile.refreshToken = token.refresh_token || profile.refreshToken;
      profile.idToken = token.id_token || profile.idToken;
      profile.expiresAt = Date.now() + token.expires_in * 1000;
      if (token.scope !== undefined) profile.scopes = token.scope.split(" ");
      if (!profile.scopes.includes("chatgpt.tokens.use.direct"))
        throw new Error("Quyền sử dụng gói ChatGPT không còn được cấp.");
    }
    return profile.accessToken;
  });
}
export async function listModels(key: string) {
  const token = await accessToken(key);
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "Không lấy được danh sách model. Kiểm tra quyền sử dụng gói ChatGPT.",
    );
  const body = z
    .object({
      models: z.array(
        z.object({
          slug: z.string(),
          display_name: z.string(),
          visibility: z.string(),
        }),
      ),
    })
    .parse(await response.json());
  return body.models
    .filter((item) => item.visibility === "list")
    .map((item) => ({ slug: item.slug, name: item.display_name }));
}
export function cancelSignIn(key: string) {
  pending.get(key)?.();
}
export async function disconnect(key: string) {
  pending.get(key)?.();
  return updateConnections(key, async (record) => {
    const profile = record.profiles.find(
      (item) => item.clientId === record.activeId,
    );
    let revoked = !profile?.refreshToken;
    if (profile?.refreshToken) {
      try {
        const metadata = await fetch(
          issuer + "/.well-known/openid-configuration",
          { signal: AbortSignal.timeout(10_000) },
        ).then((res) => res.json());
        const endpoint = new URL(metadata.revocation_endpoint);
        if (endpoint.origin !== issuer)
          throw new Error("Unexpected revocation endpoint");
        const response = await fetch(endpoint, {
          method: "POST",
          body: new URLSearchParams({
            token: profile.refreshToken,
            token_type_hint: "refresh_token",
            client_id: profile.clientId,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        revoked = response.status === 200;
      } catch {
        revoked = false;
      }
    }
    if (profile) {
      delete profile.accessToken;
      delete profile.refreshToken;
      delete profile.idToken;
      profile.scopes = [];
      profile.expiresAt = 0;
    }
    return revoked;
  });
}
export async function connectionView(key: string) {
  const record = await readConnections(key);
  const selected = record.profiles.find(
    (item) => item.clientId === record.activeId,
  );
  return {
    provider: record.provider,
    connected: Boolean(selected?.accessToken),
    sharing: Boolean(
      selected?.accessToken &&
      selected.scopes.includes("chatgpt.tokens.use.direct"),
    ),
    model: selected?.model || "",
    profiles: record.profiles.map((item) => ({
      id: item.clientId,
      email: item.email,
      selected: item.clientId === record.activeId,
      connected: Boolean(item.accessToken),
    })),
  };
}
