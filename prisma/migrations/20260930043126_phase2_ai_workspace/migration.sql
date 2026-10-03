-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "totalValue" DECIMAL NOT NULL DEFAULT 0,
    "monthlyFee" DECIMAL,
    "durationMonths" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "ownerName" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "kpi" TEXT,
    "sourceRequest" TEXT,
    "createdWithAi" BOOLEAN NOT NULL DEFAULT false,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "suggestedDocuments" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("clientId", "createdAt", "currency", "description", "endDate", "id", "kpi", "name", "organizationId", "ownerName", "progress", "serviceType", "startDate", "status", "totalValue", "updatedAt") SELECT "clientId", "createdAt", "currency", "description", "endDate", "id", "kpi", "name", "organizationId", "ownerName", "progress", "serviceType", "startDate", "status", "totalValue", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");
CREATE INDEX "Project_endDate_idx" ON "Project"("endDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
