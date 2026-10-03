export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  messages: AIMessage[];
  maxOutputTokens?: number;
};

export type GenerateStructuredDataInput = {
  prompt: string;
  systemInstruction?: string;
  responseJsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
};

export type StructuredGenerationResult = {
  data: unknown;
  rawText: string;
  provider: string;
  model: string;
};
