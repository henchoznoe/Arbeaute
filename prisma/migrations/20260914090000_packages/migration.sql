CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "PackageSessionCreditState" AS ENUM ('COUNTED', 'DECISION_REQUIRED', 'RETURNED');
CREATE TYPE "ServiceImageDisplayMode" AS ENUM ('COVER', 'CONTAIN');

ALTER TABLE "service" ADD COLUMN "imageDisplayMode" "ServiceImageDisplayMode" NOT NULL DEFAULT 'COVER';

ALTER TYPE "AuditEntityType" ADD VALUE 'PACKAGE';
ALTER TYPE "AuditEntityType" ADD VALUE 'CUSTOMER_PACKAGE';

CREATE TABLE "package" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER NOT NULL,
  "sessionCount" INTEGER NOT NULL,
  "validityMonths" INTEGER NOT NULL DEFAULT 12,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "package_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "package_service" (
  "packageId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "package_service_pkey" PRIMARY KEY ("packageId", "serviceId")
);

CREATE TABLE "customer_package" (
  "id" TEXT NOT NULL,
  "packageId" TEXT,
  "customerId" TEXT NOT NULL,
  "packageNameSnapshot" TEXT NOT NULL,
  "packagePriceCents" INTEGER NOT NULL,
  "sessionCountSnapshot" INTEGER NOT NULL,
  "validityMonthsSnapshot" INTEGER NOT NULL,
  "installmentCount" INTEGER NOT NULL,
  "validityStartsAt" TIMESTAMP(3),
  "expiresAtOverride" TIMESTAMP(3),
  "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "revenueAppointmentId" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_package_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_package_installments_check" CHECK ("installmentCount" IN (1, 2, 3)),
  CONSTRAINT "customer_package_sessions_check" CHECK ("sessionCountSnapshot" > 0),
  CONSTRAINT "customer_package_price_check" CHECK ("packagePriceCents" >= 0)
);

CREATE TABLE "customer_package_service" (
  "customerPackageId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "customer_package_service_pkey" PRIMARY KEY ("customerPackageId", "serviceId")
);

CREATE TABLE "package_session" (
  "id" TEXT NOT NULL,
  "customerPackageId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "creditState" "PackageSessionCreditState" NOT NULL DEFAULT 'COUNTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "package_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "package_slug_key" ON "package"("slug");
CREATE INDEX "package_isVisible_isArchived_sortOrder_idx" ON "package"("isVisible", "isArchived", "sortOrder");
CREATE INDEX "package_service_serviceId_idx" ON "package_service"("serviceId");
CREATE UNIQUE INDEX "customer_package_revenueAppointmentId_key" ON "customer_package"("revenueAppointmentId");
CREATE INDEX "customer_package_customerId_status_createdAt_idx" ON "customer_package"("customerId", "status", "createdAt");
CREATE INDEX "customer_package_status_validityStartsAt_idx" ON "customer_package"("status", "validityStartsAt");
CREATE INDEX "customer_package_service_serviceId_idx" ON "customer_package_service"("serviceId");
CREATE UNIQUE INDEX "package_session_appointmentId_key" ON "package_session"("appointmentId");
CREATE INDEX "package_session_customerPackageId_creditState_idx" ON "package_session"("customerPackageId", "creditState");

ALTER TABLE "package_service" ADD CONSTRAINT "package_service_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_service" ADD CONSTRAINT "package_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_package" ADD CONSTRAINT "customer_package_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_package" ADD CONSTRAINT "customer_package_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_package" ADD CONSTRAINT "customer_package_revenueAppointmentId_fkey" FOREIGN KEY ("revenueAppointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_package_service" ADD CONSTRAINT "customer_package_service_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES "customer_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_package_service" ADD CONSTRAINT "customer_package_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "package_session" ADD CONSTRAINT "package_session_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES "customer_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "package_session" ADD CONSTRAINT "package_session_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- La transaction sérialisable donne un message lisible à l'interface. Ce
-- verrou reste le dernier rempart lorsque deux écritures visent le dernier
-- crédit au même instant, y compris depuis un outil qui contournerait l'app.
CREATE FUNCTION validate_package_session() RETURNS trigger AS $$
DECLARE
  sold_package "customer_package"%ROWTYPE;
  linked_appointment "appointment"%ROWTYPE;
  used_credits INTEGER;
  package_expiry TIMESTAMP(3);
BEGIN
  SELECT * INTO sold_package
  FROM "customer_package"
  WHERE "id" = NEW."customerPackageId"
  FOR UPDATE;

  SELECT * INTO linked_appointment
  FROM "appointment"
  WHERE "id" = NEW."appointmentId";

  IF sold_package."status" <> 'ACTIVE' THEN
    RAISE EXCEPTION 'customer package is not active';
  END IF;

  IF linked_appointment."customerId" IS DISTINCT FROM sold_package."customerId" THEN
    RAISE EXCEPTION 'appointment belongs to another customer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "customer_package_service"
    WHERE "customerPackageId" = sold_package."id"
      AND "serviceId" = linked_appointment."serviceId"
  ) THEN
    RAISE EXCEPTION 'service is not allowed by customer package';
  END IF;

  package_expiry := COALESCE(
    sold_package."expiresAtOverride",
    sold_package."validityStartsAt" + make_interval(months => sold_package."validityMonthsSnapshot")
  );
  IF package_expiry IS NOT NULL AND linked_appointment."startsAt" > package_expiry THEN
    RAISE EXCEPTION 'customer package is expired';
  END IF;

  IF NEW."creditState" <> 'RETURNED' THEN
    SELECT COUNT(*) INTO used_credits
    FROM "package_session"
    WHERE "customerPackageId" = sold_package."id"
      AND "creditState" <> 'RETURNED'
      AND "id" <> NEW."id";
    IF used_credits >= sold_package."sessionCountSnapshot" THEN
      RAISE EXCEPTION 'customer package has no remaining credit';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER package_session_validate
BEFORE INSERT OR UPDATE OF "customerPackageId", "appointmentId", "creditState"
ON "package_session"
FOR EACH ROW EXECUTE FUNCTION validate_package_session();
