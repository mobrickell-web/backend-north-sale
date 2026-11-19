-- A10: Multiple contacts under one company/prospect; calls may link contactId.

CREATE TABLE "lead_contacts" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "title" VARCHAR(150),
  "phone" VARCHAR(50),
  "email" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_lead_contact_lead" ON "lead_contacts"("lead_id");

ALTER TABLE "lead_contacts"
  ADD CONSTRAINT "lead_contacts_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy flat fields (best-effort; skip empty names).
INSERT INTO "lead_contacts" ("id", "lead_id", "name", "title", "phone", "email", "created_at", "updated_at")
SELECT gen_random_uuid(), l."id", l."gatekeeper_name", 'Gatekeeper', l."gatekeeper_phone", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "leads" l
WHERE l."gatekeeper_name" IS NOT NULL AND btrim(l."gatekeeper_name") <> '';

INSERT INTO "lead_contacts" ("id", "lead_id", "name", "title", "phone", "email", "created_at", "updated_at")
SELECT gen_random_uuid(), l."id", l."decision_maker_name", 'Decision Maker', l."decision_maker_phone", l."decision_maker_email", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "leads" l
WHERE l."decision_maker_name" IS NOT NULL AND btrim(l."decision_maker_name") <> '';

INSERT INTO "lead_contacts" ("id", "lead_id", "name", "title", "phone", "email", "created_at", "updated_at")
SELECT gen_random_uuid(), l."id", l."name", 'General', l."phone", l."email", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "leads" l
WHERE l."name" IS NOT NULL
  AND btrim(l."name") <> ''
  AND (
    l."gatekeeper_name" IS NULL OR btrim(COALESCE(l."gatekeeper_name", '')) = ''
    OR lower(btrim(l."name")) <> lower(btrim(l."gatekeeper_name"))
  )
  AND (
    l."decision_maker_name" IS NULL OR btrim(COALESCE(l."decision_maker_name", '')) = ''
    OR lower(btrim(l."name")) <> lower(btrim(l."decision_maker_name"))
  );

ALTER TABLE "lead_activities"
  ADD CONSTRAINT "lead_activities_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "lead_contacts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_lead_activity_contact" ON "lead_activities"("contact_id");
