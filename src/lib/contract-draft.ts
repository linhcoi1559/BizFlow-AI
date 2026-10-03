import { z } from "zod";

// Drafts may be incomplete. Only input fields are persisted, never AI tickets or consent.
export const contractDraftSchema = z.object({
  clientId: z.string().max(200),
  partyKind: z.enum(["company", "individual"]),
  name: z.string().max(500),
  address: z.string().max(500),
  representative: z.string().max(500),
  taxCode: z.string().max(500),
  birthDate: z.string().max(10),
  identityNumber: z.string().max(500),
  email: z.string().max(500),
  phone: z.string().max(500),
  purpose: z.string().max(4000),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  totalValue: z.string().max(100),
  paymentTerms: z.string().max(4000),
  templateId: z.string().max(200),
  requirements: z.string().max(4000),
});
export type ContractDraft = z.infer<typeof contractDraftSchema>;
export const emptyContractDraft: ContractDraft = {
  clientId: "", partyKind: "company", name: "", address: "", representative: "",
  taxCode: "", birthDate: "", identityNumber: "", email: "", phone: "", purpose: "",
  startDate: "", endDate: "", totalValue: "", paymentTerms: "", templateId: "", requirements: "",
};
const storedDraftSchema = z.object({ version: z.literal(1), fields: contractDraftSchema });
export function readContractDraft(raw: string | null): ContractDraft | null {
  if (!raw) return null;
  try {
    const result = storedDraftSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data.fields : null;
  } catch { return null; }
}
export function encodeContractDraft(fields: ContractDraft) {
  return JSON.stringify({ version: 1, fields: contractDraftSchema.parse(fields) });
}
