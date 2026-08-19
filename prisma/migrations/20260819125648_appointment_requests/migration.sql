-- La demande d'une heure trop proche pour la réservation en ligne.
--
-- Table dédiée plutôt qu'un statut de plus sur `appointment` : une demande n'est
-- pas un rendez-vous, et l'agenda, le bilan hebdomadaire, les exports et les
-- indicateurs n'ont ainsi rien à filtrer pour ne pas la compter. Elle reste
-- également hors de la contrainte d'exclusion `appointment_no_confirmed_overlap`
-- — deux personnes peuvent demander la même heure, et c'est l'acceptation qui
-- tranche, protégée par la contrainte au moment où le rendez-vous est écrit.
--
-- Ajouts seuls : aucune colonne ni valeur d'énumération n'est retirée, le code
-- encore en ligne pendant le déploiement continue donc de fonctionner.
--
-- PostgreSQL 18 accepte d'ajouter une valeur d'énumération dans une transaction ;
-- aucune de celles ajoutées ici n'est utilisée avant la fin de la migration.

-- CreateEnum
CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'ACCEPTED';
ALTER TYPE "AuditActionType" ADD VALUE 'DECLINED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'APPOINTMENT_REQUEST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailKind" ADD VALUE 'LATE_REQUEST_SUBMITTED';
ALTER TYPE "EmailKind" ADD VALUE 'LATE_REQUEST_RECEIVED';
ALTER TYPE "EmailKind" ADD VALUE 'LATE_REQUEST_DECLINED';

-- CreateTable
CREATE TABLE "appointment_request" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "requestedStartsAt" TIMESTAMP(3) NOT NULL,
    "serviceNameSnapshot" TEXT NOT NULL,
    "servicePriceCents" INTEGER NOT NULL,
    "serviceDurationMinutes" INTEGER NOT NULL,
    "preparationMinutes" INTEGER NOT NULL DEFAULT 0,
    "cleanupMinutes" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_request_appointmentId_key" ON "appointment_request"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_request_status_requestedStartsAt_idx" ON "appointment_request"("status", "requestedStartsAt");

-- CreateIndex
CREATE INDEX "appointment_request_customerId_createdAt_idx" ON "appointment_request"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "appointment_request" ADD CONSTRAINT "appointment_request_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_request" ADD CONSTRAINT "appointment_request_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_request" ADD CONSTRAINT "appointment_request_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
