-- Le rattachement reste volontairement nullable : un rendez-vous admin peut ne
-- contenir qu'un nom, et une identité ambiguë ne doit jamais être fusionnée.
CREATE TABLE IF NOT EXISTS "customer" (
    "id" TEXT NOT NULL,
    "identityDigest" TEXT NOT NULL,
    "identityVersion" INTEGER NOT NULL DEFAULT 1,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointment" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "customer" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "customer_identityDigest_key"
ON "customer"("identityDigest");
CREATE INDEX IF NOT EXISTS "customer_emailNormalized_idx"
ON "customer"("emailNormalized");
CREATE INDEX IF NOT EXISTS "customer_phoneNormalized_idx"
ON "customer"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "customer_searchName_idx"
ON "customer"("searchName");
CREATE INDEX IF NOT EXISTS "appointment_customerId_startsAt_status_idx"
ON "appointment"("customerId", "startsAt", "status");

-- Le rapport est persistant et sans PII : il expose seulement le digest et les
-- rendez-vous à examiner manuellement. La migration peut ainsi être rejouée et
-- le rapport relu après une correction sans produire de doublons.
CREATE OR REPLACE VIEW "customer_migration_ambiguity_report" AS
SELECT
  "customerIdentityDigest" AS "identityDigest",
  COUNT(*)::INTEGER AS "appointmentCount",
  ARRAY_AGG("id" ORDER BY "createdAt", "id") AS "appointmentIds"
FROM "appointment"
WHERE
  "customerIdentityDigest" IS NOT NULL
  AND "customerEmail" IS NOT NULL
  AND "customerPhone" IS NOT NULL
GROUP BY "customerIdentityDigest"
HAVING
  COUNT(DISTINCT LOWER(BTRIM("customerEmail"))) > 1
  OR COUNT(DISTINCT BTRIM("customerPhone")) > 1;

-- Une seule paire normalisée exacte par digest est migrée. DISTINCT ON garde
-- les coordonnées et le nom du rendez-vous le plus récemment mis à jour, alors
-- que les dates de suivi couvrent tout l'historique.
WITH unambiguous AS (
  SELECT "customerIdentityDigest"
  FROM "appointment"
  WHERE
    "customerIdentityDigest" IS NOT NULL
    AND "customerEmail" IS NOT NULL
    AND "customerPhone" IS NOT NULL
  GROUP BY "customerIdentityDigest"
  HAVING
    COUNT(DISTINCT LOWER(BTRIM("customerEmail"))) = 1
    AND COUNT(DISTINCT BTRIM("customerPhone")) = 1
), latest AS (
  SELECT DISTINCT ON (appointment."customerIdentityDigest")
    appointment."customerIdentityDigest",
    appointment."customerFirstName",
    appointment."customerLastName",
    LOWER(BTRIM(appointment."customerEmail")) AS "emailNormalized",
    BTRIM(appointment."customerPhone") AS "phoneNormalized",
    MIN(appointment."createdAt") OVER identity AS "firstSeenAt",
    MAX(appointment."createdAt") OVER identity AS "lastSeenAt",
    MAX(appointment."customerIdentityVersion") OVER identity AS "identityVersion"
  FROM "appointment" AS appointment
  INNER JOIN unambiguous
    ON unambiguous."customerIdentityDigest" = appointment."customerIdentityDigest"
  WINDOW identity AS (PARTITION BY appointment."customerIdentityDigest")
  ORDER BY appointment."customerIdentityDigest", appointment."updatedAt" DESC, appointment."id"
)
INSERT INTO "customer" (
  "id",
  "identityDigest",
  "identityVersion",
  "firstName",
  "lastName",
  "email",
  "emailNormalized",
  "phone",
  "phoneNormalized",
  "searchName",
  "firstSeenAt",
  "lastSeenAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'customer-' || MD5("customerIdentityDigest"),
  "customerIdentityDigest",
  "identityVersion",
  "customerFirstName",
  "customerLastName",
  "emailNormalized",
  "emailNormalized",
  "phoneNormalized",
  "phoneNormalized",
  LOWER(BTRIM(CONCAT_WS(' ', "customerFirstName", "customerLastName"))),
  "firstSeenAt",
  "lastSeenAt",
  "firstSeenAt",
  CURRENT_TIMESTAMP
FROM latest
ON CONFLICT ("identityDigest") DO NOTHING;

UPDATE "appointment" AS appointment
SET "customerId" = customer."id"
FROM "customer" AS customer
WHERE
  appointment."customerId" IS NULL
  AND appointment."customerIdentityDigest" = customer."identityDigest"
  AND LOWER(BTRIM(appointment."customerEmail")) = customer."emailNormalized"
  AND BTRIM(appointment."customerPhone") = customer."phoneNormalized";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_customerId_fkey'
  ) THEN
    ALTER TABLE "appointment"
    ADD CONSTRAINT "appointment_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Toute correction des champs qui composent l'identité invalide les jetons
-- émis auparavant, même si elle est faite hors de l'application.
CREATE OR REPLACE FUNCTION bump_customer_identity_version()
RETURNS TRIGGER AS $$
BEGIN
  IF
    OLD."identityDigest" IS DISTINCT FROM NEW."identityDigest"
    OR OLD."emailNormalized" IS DISTINCT FROM NEW."emailNormalized"
    OR OLD."phoneNormalized" IS DISTINCT FROM NEW."phoneNormalized"
  THEN
    NEW."identityVersion" = OLD."identityVersion" + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "customer_identity_version_trigger" ON "customer";
CREATE TRIGGER "customer_identity_version_trigger"
BEFORE UPDATE ON "customer"
FOR EACH ROW EXECUTE FUNCTION bump_customer_identity_version();

DO $$
DECLARE ambiguity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ambiguity_count
  FROM "customer_migration_ambiguity_report";
  RAISE NOTICE 'Customer migration: % ambiguous identities require manual review', ambiguity_count;
END $$;
