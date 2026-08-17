ALTER TYPE "AuditActionType" ADD VALUE 'MERGED';

ALTER TABLE "customer"
ADD COLUMN "internalNote" TEXT,
ADD COLUMN "preferences" TEXT;
