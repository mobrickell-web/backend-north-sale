-- A9: Permanent call disposition fields on append-only lead activities.
-- Disposition uses LeadStatus vocabulary; Current Status on the lead is separate.

ALTER TABLE "lead_activities"
  ADD COLUMN "disposition" "LeadStatus",
  ADD COLUMN "next_follow_up_at" TIMESTAMPTZ(6),
  ADD COLUMN "contact_id" UUID;

CREATE INDEX "idx_lead_activity_lead_type_created"
  ON "lead_activities" ("lead_id", "type", "created_at");
