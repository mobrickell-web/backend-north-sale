-- A12 — Company information fields (gap fill before Workstream B).
-- Structured revenue kind + existing sales force + # reps + lead source.
-- Keeps annual_revenue (amount) and sales_force_size (legacy) columns.

CREATE TYPE "AnnualGrossRevenueKind" AS ENUM ('REPORTED', 'ESTIMATED', 'UNKNOWN');
CREATE TYPE "ExistingSalesForce" AS ENUM ('YES', 'NO', 'UNKNOWN');

ALTER TABLE "leads"
  ADD COLUMN "annual_gross_revenue_kind" "AnnualGrossRevenueKind",
  ADD COLUMN "existing_sales_force" "ExistingSalesForce",
  ADD COLUMN "number_of_sales_representatives" INTEGER,
  ADD COLUMN "lead_source" VARCHAR(150);

-- Best-effort: copy purely numeric legacy sales_force_size into the new int column.
UPDATE "leads"
SET "number_of_sales_representatives" = CAST("sales_force_size" AS INTEGER)
WHERE "sales_force_size" ~ '^[0-9]+$'
  AND "number_of_sales_representatives" IS NULL;
