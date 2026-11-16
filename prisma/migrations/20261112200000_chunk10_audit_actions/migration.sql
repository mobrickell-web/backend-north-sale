-- AlterEnum: Chunk 10 access / on-behalf audit actions
ALTER TYPE "AuditAction" ADD VALUE 'ON_BEHALF';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_ALLOW';
ALTER TYPE "AuditAction" ADD VALUE 'ACCESS_DENY';
