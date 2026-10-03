import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rmdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { decrypt, encrypt } from "./security";

export const profileSchema = z.object({
  clientId: z.string(),
  subject: z.string(),
  email: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  scopes: z.array(z.string()),
  expiresAt: z.number(),
  model: z.string().optional(),
});
const recordSchema = z.object({
  hostId: z.string(),
  activeId: z.string().optional(),
  pendingClientId: z.string().optional(),
  profiles: z.array(profileSchema),
  provider: z.enum(["chatgpt", "gemini"]).default("chatgpt"),
});
export type ConnectionRecord = z.infer<typeof recordSchema>;
export type ChatGPTProfile = z.infer<typeof profileSchema>;
const directory = () => path.join(process.cwd(), ".bizflow-ai");
export async function readConnections(key: string): Promise<ConnectionRecord> {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid account scope");
  try {
    return recordSchema.parse(
      decrypt(await readFile(path.join(directory(), key + ".enc"), "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new Error("Không đọc được kết nối AI đã lưu.");
  }
  return {
    hostId: "urn:uuid:" + randomUUID(),
    profiles: [],
    provider: "gemini",
  };
}
export async function updateConnections<T>(
  key: string,
  update: (record: ConnectionRecord) => Promise<T> | T,
): Promise<T> {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const lock = path.join(directory(), key + ".lock");
  let locked = false;
  for (let i = 0; i < 50; i++) {
    try {
      await mkdir(lock);
      locked = true;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!locked) throw new Error("Kết nối đang được cập nhật. Hãy thử lại.");
  try {
    const record = await readConnections(key);
    const result = await update(record);
    const temp = path.join(directory(), key + "." + randomUUID() + ".tmp");
    await writeFile(temp, encrypt(recordSchema.parse(record)), { mode: 0o600 });
    await rename(temp, path.join(directory(), key + ".enc"));
    return result;
  } finally {
    await rmdir(lock);
  }
}
