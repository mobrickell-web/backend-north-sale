-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PUBLISH';

-- AlterTable: drafts have null publishedAt until admin publishes
ALTER TABLE "EngagementReport" ALTER COLUMN "publishedAt" DROP NOT NULL;
