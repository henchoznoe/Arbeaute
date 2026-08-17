ALTER TYPE "AuditActionType" ADD VALUE 'ANONYMIZED';

ALTER TABLE "customer" ADD COLUMN "anonymizedAt" TIMESTAMP(3);
CREATE INDEX "customer_anonymizedAt_idx" ON "customer"("anonymizedAt");
