import "server-only";
import { getGeminiProvider } from "@/services/ai/gemini-provider";
import type { AIProvider } from "@/services/ai/provider";
import { getCurrentOrganizationContext } from "@/lib/organization";
import { connectionView, localEnabled } from "./chatgpt/connection";
import { scopeKey } from "./chatgpt/security";
import { ChatGPTProvider } from "./chatgpt/provider";
import { AIConfigurationError } from "./errors";

export async function getAIProvider(): Promise<AIProvider> {
  if (localEnabled()) {
    const { organization, user } = await getCurrentOrganizationContext();
    const key = scopeKey(organization.id, user.id);
    const view = await connectionView(key);
    if (view.provider === "chatgpt") {
      if (!view.sharing || !view.model)
        throw new AIConfigurationError(
          "Kết nối ChatGPT, cấp quyền sử dụng gói và chọn model trong Cài đặt AI.",
        );
      return new ChatGPTProvider(key, view.model);
    }
  }
  return getGeminiProvider();
}
export async function aiConfigured() {
  if (localEnabled()) {
    const { organization, user } = await getCurrentOrganizationContext();
    const view = await connectionView(scopeKey(organization.id, user.id));
    if (view.provider === "chatgpt") return view.sharing && Boolean(view.model);
  }
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
