-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM (
  'NOTE',
  'CALL',
  'EMAIL',
  'MEETING',
  'FOLLOW_UP_SCHEDULED',
  'FOLLOW_UP_COMPLETED'
);

-- AlterTable
CREATE INDEX "idx_lead_appointment_at" ON "leads"("appointment_at");

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "author_id" UUID,
    "author_name" VARCHAR(120) NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_follow_ups" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "created_by_id" UUID,
    "created_by_name" VARCHAR(120) NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by_id" UUID,
    "completed_by_name" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lead_activity_lead_created" ON "lead_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_lead_follow_up_lead_due" ON "lead_follow_ups"("lead_id", "due_at");

-- CreateIndex
CREATE INDEX "idx_lead_follow_up_open_due" ON "lead_follow_ups"("completed_at", "due_at");

-- AddForeignKey
ALTER TABLE "lead_activities"
  ADD CONSTRAINT "lead_activities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_activities"
  ADD CONSTRAINT "lead_activities_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_follow_ups"
  ADD CONSTRAINT "lead_follow_ups_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_follow_ups"
  ADD CONSTRAINT "lead_follow_ups_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_follow_ups"
  ADD CONSTRAINT "lead_follow_ups_completed_by_id_fkey"
  FOREIGN KEY ("completed_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
