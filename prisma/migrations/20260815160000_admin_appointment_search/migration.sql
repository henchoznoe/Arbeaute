ALTER TABLE "appointment" ADD COLUMN "customerSearchName" TEXT;

-- Les fiches clientes portent déjà la version normalisée la plus fiable. Le
-- repli couvre aussi les rendez-vous admin créés avec un nom uniquement.
UPDATE "appointment" AS appointment
SET "customerSearchName" = COALESCE(
  customer."searchName",
  LOWER(BTRIM(CONCAT_WS(' ', appointment."customerFirstName", appointment."customerLastName")))
)
FROM "customer" AS customer
WHERE appointment."customerId" = customer."id";

UPDATE "appointment"
SET "customerSearchName" = LOWER(
  TRANSLATE(
    BTRIM(CONCAT_WS(' ', "customerFirstName", "customerLastName")),
    'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
    'aaaaaaceeeeiiiinooooouuuuyy'
  )
)
WHERE "customerSearchName" IS NULL;

ALTER TABLE "appointment" ALTER COLUMN "customerSearchName" SET NOT NULL;

CREATE INDEX "appointment_customerPhone_startsAt_idx"
ON "appointment"("customerPhone", "startsAt");
CREATE INDEX "appointment_customerSearchName_startsAt_idx"
ON "appointment"("customerSearchName", "startsAt");
CREATE INDEX "appointment_status_source_startsAt_idx"
ON "appointment"("status", "source", "startsAt");
