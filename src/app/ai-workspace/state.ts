import type { BusinessRequestDraft } from "@/services/ai/business-request-schema";
import type { DuplicateClientCandidate } from "@/services/ai/client-matching";

export type AIExtractionState = {
  status: "idle" | "error" | "review";
  message: string;
  fieldErrors: Record<string, string[]>;
  originalRequest: string;
  draft: BusinessRequestDraft | null;
  duplicateCandidates: DuplicateClientCandidate[];
  provider: string;
  model: string;
  receipt?: string;
};

export const initialAIExtractionState: AIExtractionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  originalRequest: "",
  draft: null,
  duplicateCandidates: [],
  provider: "",
  model: "",
};

export type AIConfirmationState = {
  status: "idle" | "error";
  message: string;
  fieldErrors: Record<string, string[]>;
  duplicateCandidates: DuplicateClientCandidate[];
};

export const initialAIConfirmationState: AIConfirmationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  duplicateCandidates: [],
};
