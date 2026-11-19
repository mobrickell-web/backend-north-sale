-- Access Management: Office Manager + pause reason + admin-visible password handoff.

ALTER TYPE "StaffPosition" ADD VALUE IF NOT EXISTS 'OFFICE_MANAGER';

ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "admin_set_password" TEXT,
  ADD COLUMN IF NOT EXISTS "access_pause_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "access_paused_at" TIMESTAMPTZ(6);
