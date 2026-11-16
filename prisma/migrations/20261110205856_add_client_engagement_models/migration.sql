-- CreateEnum
CREATE TYPE "ImprovementStatus" AS ENUM ('AGREED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('QUARTERLY', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "BaselineMetric" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "metricKey" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20),
    "measuredAt" TIMESTAMPTZ(6) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BaselineMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Improvement" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "ownerName" VARCHAR(120),
    "ownerSide" VARCHAR(20),
    "status" "ImprovementStatus" NOT NULL DEFAULT 'AGREED',
    "targetDate" TIMESTAMP(3),
    "agreedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Improvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiMeasurement" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "metricKey" VARCHAR(50) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMPTZ(6) NOT NULL,
    "target" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "KpiMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplementationMilestone" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "ownerName" VARCHAR(120),
    "ownerSide" VARCHAR(20),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImplementationMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementReport" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'OTHER',
    "period" VARCHAR(100) NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL,
    "fileKey" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EngagementReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" UUID NOT NULL,
    "clientId" UUID,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaselineMetric_clientId_metricKey_idx" ON "BaselineMetric"("clientId", "metricKey");

-- CreateIndex
CREATE INDEX "Improvement_clientId_status_idx" ON "Improvement"("clientId", "status");

-- CreateIndex
CREATE INDEX "KpiMeasurement_clientId_metricKey_idx" ON "KpiMeasurement"("clientId", "metricKey");

-- CreateIndex
CREATE INDEX "ImplementationMilestone_clientId_status_idx" ON "ImplementationMilestone"("clientId", "status");

-- CreateIndex
CREATE INDEX "EngagementReport_clientId_type_idx" ON "EngagementReport"("clientId", "type");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_targetType_idx" ON "AuditLog"("actorId", "targetType");

-- RenameIndex
ALTER INDEX "uq_account_oauth_provider" RENAME TO "oauth_identities_account_id_provider_key";

-- RenameIndex
ALTER INDEX "uq_oauth_provider_account" RENAME TO "oauth_identities_provider_provider_account_id_key";
