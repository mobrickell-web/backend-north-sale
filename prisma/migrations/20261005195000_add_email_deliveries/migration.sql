-- Adds the email_deliveries table so every outbound message gets a stored
-- provider messageId, which is the only handle a future delivery webhook can
-- be matched back on.
--
-- It also repairs a pre-existing gap: MARKED_COMPLETED_BY_ADMIN existed in the
-- live database and in schema.prisma but had no migration, so a fresh
-- production database would have failed on the admin "Mark Done" action.

-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'MARKED_COMPLETED_BY_ADMIN';

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM (
    'ACCEPTED',
    'DELIVERED',
    'BOUNCED',
    'DEFERRED',
    'DROPPED',
    'SPAMREPORT',
    'UNSUBSCRIBED'
);

-- CreateTable
CREATE TABLE "email_deliveries" (
    "id" UUID NOT NULL,
    "appointment_id" UUID,
    "message_id" VARCHAR(255),
    "kind" VARCHAR(60) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'ACCEPTED',
    "status_reason" TEXT,
    "status_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_delivery_message_id" ON "email_deliveries"("message_id");

-- CreateIndex
CREATE INDEX "idx_email_delivery_appointment_id" ON "email_deliveries"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_email_delivery_status" ON "email_deliveries"("status");

-- AddForeignKey
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;