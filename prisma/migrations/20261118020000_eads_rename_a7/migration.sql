-- A7: Rename Account Executive → Executive Account Development Specialist (EADS).
-- Rebuild enum, mapping ACCOUNT_EXECUTIVE → EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST.

ALTER TYPE "StaffPosition" RENAME TO "StaffPosition_old";

CREATE TYPE "StaffPosition" AS ENUM (
  'EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST',
  'IMPLEMENTATION_SPECIALIST',
  'FRACTIONAL_VP',
  'REGIONAL_SALES_MANAGER'
);

ALTER TABLE "admin_users"
  ALTER COLUMN "position" TYPE "StaffPosition"
  USING (
    CASE "position"::text
      WHEN 'ACCOUNT_EXECUTIVE' THEN 'EXECUTIVE_ACCOUNT_DEVELOPMENT_SPECIALIST'::"StaffPosition"
      ELSE "position"::text::"StaffPosition"
    END
  );

DROP TYPE "StaffPosition_old";
