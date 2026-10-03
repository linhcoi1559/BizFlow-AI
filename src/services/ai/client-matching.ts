import "server-only";

import { prisma } from "@/lib/prisma";

export type DuplicateClientCandidate = {
  id: string;
  companyName: string;
  taxCode: string | null;
  representativeName: string | null;
  matchReason: "taxCode" | "companyName";
};

function normalizeCompanyIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(cong ty|company|co|joint stock company|jsc|limited|ltd|llc|corporation|corp)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTaxCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isCompanyNameMatch(left: string, right: string) {
  const a = normalizeCompanyIdentity(left);
  const b = normalizeCompanyIdentity(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 6 && (a.startsWith(b) || b.startsWith(a));
}

export async function findDuplicateClients(
  organizationId: string,
  input: { companyName: string; taxCode?: string | null },
): Promise<DuplicateClientCandidate[]> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: {
      id: true,
      companyName: true,
      taxCode: true,
      representativeName: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const requestedTaxCode = normalizeTaxCode(input.taxCode ?? "");

  return clients
    .map((client) => {
      const taxCodeMatch =
        Boolean(requestedTaxCode) &&
        normalizeTaxCode(client.taxCode ?? "") === requestedTaxCode;
      const companyNameMatch = isCompanyNameMatch(
        client.companyName,
        input.companyName,
      );

      if (!taxCodeMatch && !companyNameMatch) return null;
      return {
        ...client,
        matchReason: taxCodeMatch ? ("taxCode" as const) : ("companyName" as const),
      };
    })
    .filter((client): client is DuplicateClientCandidate => client !== null)
    .slice(0, 5);
}
