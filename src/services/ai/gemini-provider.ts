import "server-only";

import { GoogleGenAI, type Content } from "@google/genai";

import {
  AIConfigurationError,
  AIProviderError,
  AIResponseParseError,
} from "@/services/ai/errors";
import type { AIProvider } from "@/services/ai/provider";
import type {
  GenerateStructuredDataInput,
  GenerateTextInput,
  StructuredGenerationResult,
} from "@/services/ai/types";

export const GEMINI_PROVIDER_NAME = "google-gemini";
export const GEMINI_MODEL = "gemini-3.8-flash";

function parseJsonResponse(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as unknown;
      } catch {
        // Fall through to the typed parse error below.
      }
    }
    throw new AIResponseParseError(rawText);
  }
}

function providerErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("api key") || message.includes("unauthorized")) {
    return "Gemini từ chối khóa API. Hãy kiểm tra GEMINI_API_KEY rồi thử lại.";
  }
  if (message.includes("quota") || message.includes("resource_exhausted")) {
    return "Hạn mức Gemini hiện đã hết. Hãy chờ hoặc kiểm tra hạn mức API.";
  }
  if (message.includes("429") || message.includes("rate")) {
    return "Gemini đang nhận quá nhiều yêu cầu. Hãy chờ một lát rồi thử lại.";
  }
  if (message.includes("503") || message.includes("overloaded") || message.includes("unavailable") || message.includes("high demand")) {
    return "Gemini đang tạm thời quá tải hoặc không sẵn sàng. Hãy thử lại sau một lát.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "BizFlow không thể kết nối với Gemini. Hãy kiểm tra mạng rồi thử lại.";
  }

  return "Gemini không thể xử lý yêu cầu này. Vui lòng thử lại.";
}

export class GeminiProvider implements AIProvider {
  readonly providerName = GEMINI_PROVIDER_NAME;
  readonly model = GEMINI_MODEL;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      throw new AIConfigurationError(
        "Gemini chưa được cấu hình. Hãy thêm GEMINI_API_KEY vào môi trường máy chủ.",
      );
    }
    this.client = new GoogleGenAI({ apiKey: normalizedKey });
  }

  async generateText(input: GenerateTextInput) {
    const systemInstruction = input.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const contents: Content[] = input.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          maxOutputTokens: input.maxOutputTokens ?? 2048,
        },
      });
      if (!response.text) {
        throw new AIProviderError("Gemini trả về phản hồi trống.");
      }
      return response.text;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(providerErrorMessage(error), { cause: error });
    }
  }

  async generateStructuredData(
    input: GenerateStructuredDataInput,
  ): Promise<StructuredGenerationResult> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: input.prompt,
        config: {
          systemInstruction: input.systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: input.responseJsonSchema,
          maxOutputTokens: input.maxOutputTokens ?? 4096,
        },
      });
      const rawText = response.text ?? "";
      if (!rawText.trim()) {
        throw new AIProviderError("Gemini trả về phản hồi có cấu trúc nhưng không có nội dung.");
      }

      return {
        data: parseJsonResponse(rawText),
        rawText,
        provider: this.providerName,
        model: this.model,
      };
    } catch (error) {
      if (
        error instanceof AIResponseParseError ||
        error instanceof AIProviderError
      ) {
        throw error;
      }
      throw new AIProviderError(providerErrorMessage(error), { cause: error });
    }
  }
}

export function getGeminiProvider() {
  return new GeminiProvider(process.env.GEMINI_API_KEY ?? "");
}
