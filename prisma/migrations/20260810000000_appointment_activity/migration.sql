-- CreateEnum
CREATE TYPE "AppointmentActivityType" AS ENUM ('CREATED', 'RESCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "appointment_activity" (
    "id" TEXT NOT NULL,
    "type" "AppointmentActivityType" NOT NULL,
    "appointmentId" TEXT,
    "customerFirstNameSnapshot" TEXT,
    "customerLastNameSnapshot" TEXT NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "appointmentStartsAt" TIMESTAMP(3) NOT NULL,
    "previousAppointmentStartsAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_activity_createdAt_idx" ON "appointment_activity"("createdAt");

-- CreateIndex
CREATE INDEX "appointment_activity_readAt_createdAt_idx" ON "appointment_activity"("readAt", "createdAt");

-- CreateIndex
CREATE INDEX "appointment_activity_appointmentId_createdAt_idx" ON "appointment_activity"("appointmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "appointment_activity" ADD CONSTRAINT "appointment_activity_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
