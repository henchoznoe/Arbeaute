-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('PUBLIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "service_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#d99086',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" TEXT NOT NULL,
    "agendaSourceId" INTEGER,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceNote" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
    "cleanupMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#d99086',
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_availability" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exception" (
    "id" TEXT NOT NULL,
    "type" "AvailabilityExceptionType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "servicePriceCents" INTEGER NOT NULL,
    "serviceDurationMinutes" INTEGER NOT NULL,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
    "cleanupMinutes" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "customerFirstName" TEXT,
    "customerLastName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerIdentityVersion" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT,
    "source" "AppointmentSource" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_bucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_bucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_category_isActive_sortOrder_idx" ON "service_category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_agendaSourceId_key" ON "service"("agendaSourceId");

-- CreateIndex
CREATE INDEX "service_categoryId_isArchived_sortOrder_idx" ON "service"("categoryId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "service_isBookable_isVisible_isArchived_idx" ON "service"("isBookable", "isVisible", "isArchived");

-- CreateIndex
CREATE INDEX "weekly_availability_dayOfWeek_startMinute_idx" ON "weekly_availability"("dayOfWeek", "startMinute");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_availability_dayOfWeek_startMinute_endMinute_key" ON "weekly_availability"("dayOfWeek", "startMinute", "endMinute");

-- CreateIndex
CREATE INDEX "availability_exception_startsAt_endsAt_type_idx" ON "availability_exception"("startsAt", "endsAt", "type");

-- CreateIndex
CREATE INDEX "appointment_startsAt_endsAt_status_idx" ON "appointment"("startsAt", "endsAt", "status");

-- CreateIndex
CREATE INDEX "appointment_customerEmail_customerPhone_startsAt_idx" ON "appointment"("customerEmail", "customerPhone", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_serviceId_startsAt_idx" ON "appointment"("serviceId", "startsAt");

-- CreateIndex
CREATE INDEX "rate_limit_bucket_expiresAt_idx" ON "rate_limit_bucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_bucket_keyHash_action_windowStart_key" ON "rate_limit_bucket"("keyHash", "action", "windowStart");

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
