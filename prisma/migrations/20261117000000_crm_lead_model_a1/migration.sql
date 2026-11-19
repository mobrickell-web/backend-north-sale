-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM (
  'NEW_LEAD',
  'ATTEMPTING_CONTACT',
  'FOLLOW_UP_NEEDED',
  'APPOINTMENT_SCHEDULED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'CLIENT_WON',
  'NOT_INTERESTED',
  'NOT_QUALIFIED',
  'DO_NOT_CONTACT'
);

-- AlterTable: CRM fields (company name backfilled from legacy name)
ALTER TABLE "leads" ADD COLUMN "company_name" VARCHAR(200);
UPDATE "leads" SET "company_name" = COALESCE(NULLIF(TRIM("name"), ''), 'Unknown company') WHERE "company_name" IS NULL;
ALTER TABLE "leads" ALTER COLUMN "company_name" SET NOT NULL;

ALTER TABLE "leads" ADD COLUMN "website" VARCHAR(255);
ALTER TABLE "leads" ADD COLUMN "gatekeeper_name" VARCHAR(150);
ALTER TABLE "leads" ADD COLUMN "gatekeeper_phone" VARCHAR(50);
ALTER TABLE "leads" ADD COLUMN "decision_maker_name" VARCHAR(150);
ALTER TABLE "leads" ADD COLUMN "decision_maker_email" VARCHAR(255);
ALTER TABLE "leads" ADD COLUMN "decision_maker_phone" VARCHAR(50);
ALTER TABLE "leads" ADD COLUMN "annual_revenue" VARCHAR(100);
ALTER TABLE "leads" ADD COLUMN "sales_force_size" VARCHAR(100);
ALTER TABLE "leads" ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW_LEAD';
ALTER TABLE "leads" ADD COLUMN "not_qualified_reason" TEXT;
ALTER TABLE "leads" ADD COLUMN "follow_up_at" TIMESTAMPTZ(6);
ALTER TABLE "leads" ADD COLUMN "follow_up_notes" TEXT;
ALTER TABLE "leads" ADD COLUMN "appointment_at" TIMESTAMPTZ(6);
ALTER TABLE "leads" ADD COLUMN "appointment_notes" TEXT;

-- Contact name is optional under the CRM model (company + owner are required).
ALTER TABLE "leads" ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_lead_status" ON "leads"("status");
CREATE INDEX "idx_lead_company_name" ON "leads"("company_name");
