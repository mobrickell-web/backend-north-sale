-- CreateEnum
CREATE TYPE "AssessmentInstanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'COMPLETE';

-- CreateTable
CREATE TABLE "assessment_instances" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "AssessmentInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "answers" JSONB,
    "result" JSONB,
    "completed_by" UUID,
    "on_behalf_of" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "on_behalf_token_hash" VARCHAR(128),
    "token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assessment_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_assessment_instance_client_assessment" ON "assessment_instances"("client_id", "assessment_id");

-- CreateIndex
CREATE INDEX "idx_assessment_instance_client_status" ON "assessment_instances"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_instances_on_behalf_token_hash_key" ON "assessment_instances"("on_behalf_token_hash");

-- AddForeignKey
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
