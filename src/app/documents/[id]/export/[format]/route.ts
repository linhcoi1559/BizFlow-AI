import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { documentContentSchema } from "@/services/documents/schemas";
import { renderDocx, renderPdf, safeDownloadName } from "@/services/documents/renderers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; format: string }> },
) {
  const { id, format } = await params;
  if (format !== "docx" && format !== "pdf") {
    return new Response("Unsupported export format.", { status: 400 });
  }

  const organization = await getCurrentOrganization();
  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      organization: { include: { companyProfile: true } },
      client: true,
      project: true,
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!document) return new Response("Document not found.", { status: 404 });
  if (document.status !== "approved" || !document.approvedAt) {
    return new Response("Approve the current document version before exporting it.", { status: 409 });
  }

  const version = document.versions.find((item) => item.version === document.currentVersion);
  if (!version) return new Response("Current document version not found.", { status: 500 });
  const content = documentContentSchema.safeParse(version.content);
  if (!content.success) return new Response("Document content is invalid.", { status: 500 });

  const input = {
    document: {
      title: document.title,
      type: document.type,
      referenceNumber: document.referenceNumber,
      approvedAt: document.approvedAt,
      approvedByName: document.approvedByName,
    },
    content: content.data,
    company: document.organization.companyProfile,
    client: document.client,
    project: document.project,
  };
  const buffer = format === "docx" ? await renderDocx(input) : await renderPdf(input);
  const filename = `${safeDownloadName(document.title)}-${document.referenceNumber.toLowerCase()}.${format}`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

