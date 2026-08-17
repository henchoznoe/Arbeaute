ALTER TYPE "AuditEntityType" ADD VALUE 'BOOKING_SETTINGS';

CREATE TABLE "booking_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "minBookingNoticeHours" INTEGER NOT NULL DEFAULT 12,
  "bookingHorizonMonths" INTEGER NOT NULL DEFAULT 3,
  "customerChangeCutoffHours" INTEGER NOT NULL DEFAULT 48,
  "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booking_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "booking_settings" (
  "id",
  "minBookingNoticeHours",
  "bookingHorizonMonths",
  "customerChangeCutoffHours",
  "slotIntervalMinutes",
  "updatedAt"
) VALUES ('default', 12, 3, 48, 15, CURRENT_TIMESTAMP);
