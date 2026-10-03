import type {
  GenerateStructuredDataInput,
  GenerateTextInput,
  StructuredGenerationResult,
} from "@/services/ai/types";

/**
 * Provider-neutral server contract. Business workflows depend on this
 * interface, never directly on a vendor SDK.
 */
export interface AIProvider {
  readonly providerName: string;
  readonly model: string;
  generateText(input: GenerateTextInput): Promise<string>;
  generateStructuredData(
    input: GenerateStructuredDataInput,
  ): Promise<StructuredGenerationResult>;
}
