-- Remap any Sales Rep staff to Account Executive, then drop SALES_REP from StaffPosition.
UPDATE "admin_users"
SET "position" = 'ACCOUNT_EXECUTIVE'
WHERE "position" = 'SALES_REP';

ALTER TYPE "StaffPosition" RENAME TO "StaffPosition_old";

CREATE TYPE "StaffPosition" AS ENUM (
  'ACCOUNT_EXECUTIVE',
  'IMPLEMENTATION_SPECIALIST',
  'FRACTIONAL_VP',
  'REGIONAL_SALES_MANAGER'
);

ALTER TABLE "admin_users"
  ALTER COLUMN "position" TYPE "StaffPosition"
  USING ("position"::text::"StaffPosition");

DROP TYPE "StaffPosition_old";
