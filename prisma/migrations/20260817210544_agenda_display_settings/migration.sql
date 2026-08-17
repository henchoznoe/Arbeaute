-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'AGENDA_SETTINGS';

-- CreateTable
CREATE TABLE "agenda_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "visibleDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 0]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_settings_pkey" PRIMARY KEY ("id")
);
