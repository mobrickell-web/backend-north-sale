-- Client-facing primary assessment (at most one true at a time).
ALTER TABLE "assessments"
ADD COLUMN "is_client_primary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "idx_assessment_client_primary"
ON "assessments"("is_client_primary");

-- Enforce a single primary row (partial unique index).
CREATE UNIQUE INDEX "uq_assessment_one_client_primary"
ON "assessments" ("is_client_primary")
WHERE "is_client_primary" = true;

-- Backfill: prefer published sales-alignment, else newest published.
UPDATE "assessments"
SET "is_client_primary" = true
WHERE id = (
  SELECT id
  FROM "assessments"
  WHERE status = 'PUBLISHED'
  ORDER BY
    CASE WHEN slug = 'sales-alignment' THEN 0 ELSE 1 END,
    "updated_at" DESC
  LIMIT 1
);
