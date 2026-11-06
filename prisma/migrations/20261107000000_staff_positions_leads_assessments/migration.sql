-- CreateEnum
CREATE TYPE "StaffPosition" AS ENUM ('ACCOUNT_EXECUTIVE', 'IMPLEMENTATION_SPECIALIST', 'FRACTIONAL_VP', 'REGIONAL_SALES_MANAGER');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "position" "StaffPosition";

-- Backfill: every existing sales representative becomes an Account Executive.
UPDATE "admin_users"
SET "position" = 'ACCOUNT_EXECUTIVE'
WHERE "role" = 'SALES_REPRESENTATIVE'
  AND "position" IS NULL;

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" UUID NOT NULL,
    "assessment" VARCHAR(60) NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "submitted_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lead_owner" ON "leads"("owner_id");

-- CreateIndex
CREATE INDEX "idx_assessment_result_email" ON "assessment_results"("email");

-- CreateIndex
CREATE INDEX "idx_assessment_result_submitted_by" ON "assessment_results"("submitted_by_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
