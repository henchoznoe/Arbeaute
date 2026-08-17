-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED', 'APPOINTMENT_REMINDER', 'DAILY_DIGEST');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_delivery" (
    "id" TEXT NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "appointmentId" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_delivery_status_createdAt_idx" ON "email_delivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "email_delivery_createdAt_idx" ON "email_delivery"("createdAt");

-- CreateIndex
CREATE INDEX "email_delivery_appointmentId_createdAt_idx" ON "email_delivery"("appointmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
