-- Ensure exactly one Primary (client-facing) published assessment exists.
-- Prefer the original sales-alignment assessment, else the oldest published.

UPDATE "assessments"
SET "is_client_primary" = false
WHERE "is_client_primary" = true
  AND status <> 'PUBLISHED';

UPDATE "assessments"
SET "is_client_primary" = true
WHERE id = (
  SELECT id
  FROM "assessments"
  WHERE status = 'PUBLISHED'
  ORDER BY
    CASE WHEN slug = 'sales-alignment' THEN 0 ELSE 1 END,
    "published_at" ASC NULLS LAST,
    "created_at" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "assessments" WHERE "is_client_primary" = true
);
