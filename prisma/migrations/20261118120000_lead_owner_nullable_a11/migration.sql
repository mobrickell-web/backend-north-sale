-- A11: Allow unassigned leads (Admin create without owner; assign later).
-- Reassign only updates owner_id — activities / contacts / follow-ups stay on the lead.

ALTER TABLE "leads" DROP CONSTRAINT "leads_owner_id_fkey";

ALTER TABLE "leads"
  ALTER COLUMN "owner_id" DROP NOT NULL;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
