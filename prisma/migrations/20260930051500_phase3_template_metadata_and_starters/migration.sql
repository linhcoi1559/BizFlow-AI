-- Preserve the reason for each immutable template version.
ALTER TABLE "Template" ADD COLUMN "changeNote" TEXT;

-- Install starter templates for organizations that existed before Phase 3.
INSERT INTO "Template" (
    "id", "organizationId", "templateKey", "name", "description", "type",
    "status", "version", "isCurrent", "changeNote", "content", "createdAt", "updatedAt"
)
SELECT
    'phase3-proposal-' || "id", "id", 'standard-proposal',
    'Standard Service Proposal',
    'A concise commercial proposal for agency and consulting engagements.',
    'proposal', 'active', 1, true, 'Starter template',
    '{"titlePattern":"Proposal for {{project.name}}","sections":[{"key":"summary","heading":"Project overview","body":"{{company.name}} proposes to deliver {{project.serviceType}} for {{client.companyName}}. This proposal summarizes the business objective, delivery scope, schedule, and commercial terms for {{project.name}}."},{"key":"scope","heading":"Scope and deliverables","body":"The engagement covers {{project.description}}\n\nPrimary service: {{project.serviceType}}. The delivery team will confirm detailed deliverables, acceptance criteria, and dependencies during kickoff."},{"key":"timeline","heading":"Schedule","body":"Planned start: {{project.startDate}}. Planned completion: {{project.endDate}}. Estimated duration: {{project.duration}}."},{"key":"kpi","heading":"Success measures","body":"The primary KPI for this engagement is {{project.kpi}}. Measurement definitions and reporting cadence will be agreed during kickoff."},{"key":"legal","heading":"Proposal conditions","body":"This proposal is subject to final scope confirmation and execution of a service agreement by authorized representatives of both parties."}],"paymentTerms":"Fees will be invoiced according to the agreed project schedule. Payment is due within 15 days of each valid invoice unless otherwise agreed in writing.","notes":"This proposal remains valid for 30 days from its issue date."}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization"
WHERE NOT EXISTS (
    SELECT 1 FROM "Template"
    WHERE "Template"."organizationId" = "Organization"."id"
      AND "Template"."templateKey" = 'standard-proposal'
      AND "Template"."version" = 1
);

INSERT INTO "Template" (
    "id", "organizationId", "templateKey", "name", "description", "type",
    "status", "version", "isCurrent", "changeNote", "content", "createdAt", "updatedAt"
)
SELECT
    'phase3-quotation-' || "id", "id", 'standard-quotation',
    'Standard Quotation',
    'A clean quotation with project pricing, validity, and payment terms.',
    'quotation', 'active', 1, true, 'Starter template',
    '{"titlePattern":"Quotation for {{project.name}}","sections":[{"key":"summary","heading":"Quotation summary","body":"{{company.name}} is pleased to provide this quotation to {{client.companyName}} for {{project.serviceType}}."},{"key":"scope","heading":"Service description","body":"{{project.description}}"},{"key":"timeline","heading":"Delivery period","body":"Expected service period: {{project.startDate}} to {{project.endDate}} ({{project.duration}})."},{"key":"kpi","heading":"Expected outcome","body":"{{project.kpi}}"},{"key":"legal","heading":"Quotation conditions","body":"Pricing excludes taxes unless expressly stated. Work begins after written acceptance and receipt of any required advance payment."}],"paymentTerms":"Payment schedule: 50% on acceptance and 50% on completion, unless another schedule is confirmed in writing.","notes":"Quotation validity: 30 days from the issue date."}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization"
WHERE NOT EXISTS (
    SELECT 1 FROM "Template"
    WHERE "Template"."organizationId" = "Organization"."id"
      AND "Template"."templateKey" = 'standard-quotation'
      AND "Template"."version" = 1
);

INSERT INTO "Template" (
    "id", "organizationId", "templateKey", "name", "description", "type",
    "status", "version", "isCurrent", "changeNote", "content", "createdAt", "updatedAt"
)
SELECT
    'phase3-contract-' || "id", "id", 'standard-service-contract',
    'Standard Service Contract',
    'A practical service agreement draft for review before legal execution.',
    'contract', 'active', 1, true, 'Starter template',
    '{"titlePattern":"Service Agreement for {{project.name}}","sections":[{"key":"summary","heading":"Parties and purpose","body":"This Service Agreement is entered into between {{company.name}}, represented by {{company.representative}}, and {{client.companyName}}, represented by {{client.representative}}, for delivery of {{project.serviceType}} under project {{project.name}}."},{"key":"scope","heading":"Services and responsibilities","body":"The service provider will perform the following scope: {{project.description}}\n\nEach party will provide timely information, approvals, access, and cooperation reasonably required for delivery."},{"key":"timeline","heading":"Term and schedule","body":"The planned term begins on {{project.startDate}} and ends on {{project.endDate}}, with an estimated duration of {{project.duration}}."},{"key":"kpi","heading":"Performance and acceptance","body":"Target outcome: {{project.kpi}}. Unless otherwise agreed, KPIs guide performance evaluation and do not constitute a guaranteed commercial result."},{"key":"legal","heading":"General terms","body":"Both parties will protect confidential information, comply with applicable law, and resolve material scope changes in writing. Liability, termination, intellectual property, and dispute provisions must be reviewed by the parties before signature."}],"paymentTerms":"The client will pay the fees shown in this agreement according to the agreed invoice schedule. Overdue or disputed invoices will be handled under the final signed terms.","notes":"Draft for business review. Obtain appropriate legal review before signing."}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization"
WHERE NOT EXISTS (
    SELECT 1 FROM "Template"
    WHERE "Template"."organizationId" = "Organization"."id"
      AND "Template"."templateKey" = 'standard-service-contract'
      AND "Template"."version" = 1
);
