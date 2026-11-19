-- A13 — Appointment Completed status + completion timestamp (gap fill).
-- Keeps appointment_at for history when marked completed.
-- Activity type APPOINTMENT_COMPLETED for the CRM timeline.

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'APPOINTMENT_COMPLETED';
ALTER TYPE "LeadActivityType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_COMPLETED';

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "appointment_completed_at" TIMESTAMPTZ(6);
