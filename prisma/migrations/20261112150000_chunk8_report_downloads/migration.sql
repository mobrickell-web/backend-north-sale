-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DOWNLOAD';

-- AlterTable
ALTER TABLE "EngagementReport" ADD COLUMN "original_file_name" VARCHAR(255);
ALTER TABLE "EngagementReport" ADD COLUMN "content_type" VARCHAR(120);
