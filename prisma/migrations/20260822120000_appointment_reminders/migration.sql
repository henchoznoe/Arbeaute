-- AlterEnum
ALTER TYPE "EmailStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "email_delivery"
ADD COLUMN "appointmentStartsAt" TIMESTAMP(3),
ADD COLUMN "deduplicationKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_deduplicationKey_key" ON "email_delivery"("deduplicationKey");
