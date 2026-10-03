import type { DocumentContent } from "@/services/documents/schemas";
export type ContractState = {
  status: "idle" | "error" | "preview";
  message: string;
  fieldErrors: Record<string, string[]>;
  content: DocumentContent | null;
  missingFields: string[];
  ticket: string;
};
export const initialContractState: ContractState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  content: null,
  missingFields: [],
  ticket: "",
};

export type ContractManualChange = {
  field:
    | "name"
    | "address"
    | "representative"
    | "taxCode"
    | "birthDate"
    | "identityNumber"
    | "email"
    | "phone"
    | "purpose"
    | "startDate"
    | "endDate"
    | "totalValue"
    | "paymentTerms"
    | "requirements";
  instruction: string;
};

export type ContractChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ContractChatState = {
  status: "idle" | "error" | "ready";
  message: string;
  baseTicket: string;
  ticket: string;
  content: DocumentContent | null;
  missingFields: string[];
  manualChanges: ContractManualChange[];
  messages: ContractChatMessage[];
};

export const initialContractChatState: ContractChatState = {
  status: "idle",
  message: "",
  baseTicket: "",
  ticket: "",
  content: null,
  missingFields: [],
  manualChanges: [],
  messages: [],
};
