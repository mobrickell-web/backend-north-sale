CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');
CREATE TYPE "AuthCodePurpose" AS ENUM ('SIGNUP', 'PASSWORD_RESET');

ALTER TABLE "admin_users"
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "admin_users"
  ADD COLUMN "email_verified_at" TIMESTAMPTZ(6);

UPDATE "admin_users"
SET "email_verified_at" = "created_at"
WHERE "email_verified_at" IS NULL;

CREATE TABLE "oauth_identities" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "provider_account_id" VARCHAR(255) NOT NULL,
  "provider_email" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "oauth_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_verification_codes" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "purpose" "AuthCodePurpose" NOT NULL,
  "code_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_oauth_provider_account"
  ON "oauth_identities"("provider", "provider_account_id");
CREATE UNIQUE INDEX "uq_account_oauth_provider"
  ON "oauth_identities"("account_id", "provider");
CREATE INDEX "idx_auth_code_account_purpose"
  ON "auth_verification_codes"("account_id", "purpose", "created_at");
CREATE INDEX "idx_auth_code_expiry"
  ON "auth_verification_codes"("expires_at");
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");
CREATE INDEX "idx_password_reset_account_expiry"
  ON "password_reset_tokens"("account_id", "expires_at");

ALTER TABLE "oauth_identities"
  ADD CONSTRAINT "oauth_identities_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_verification_codes"
  ADD CONSTRAINT "auth_verification_codes_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
