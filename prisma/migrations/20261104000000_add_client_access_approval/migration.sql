CREATE TYPE "ClientAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "client_access_requests" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "status" "ClientAccessStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_id" UUID,
  "rejection_reason" TEXT,

  CONSTRAINT "client_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_access_requests_account_id_key"
  ON "client_access_requests"("account_id");
CREATE INDEX "idx_client_access_status_requested"
  ON "client_access_requests"("status", "requested_at");

ALTER TABLE "client_access_requests"
  ADD CONSTRAINT "client_access_requests_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_access_requests"
  ADD CONSTRAINT "client_access_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "client_access_requests" ("id", "account_id", "status", "requested_at")
SELECT gen_random_uuid(), "id", 'PENDING', "created_at"
FROM "admin_users"
WHERE "role" = 'USER'
  AND "is_active" = TRUE;
