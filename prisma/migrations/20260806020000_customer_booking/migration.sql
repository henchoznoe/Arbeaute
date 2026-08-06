-- AlterTable
ALTER TABLE "appointment" ADD COLUMN "customerIdentityDigest" TEXT;

ALTER TABLE "appointment"
ADD COLUMN "occupiedStartsAt" TIMESTAMP(3) WITH TIME ZONE,
ADD COLUMN "occupiedEndsAt" TIMESTAMP(3) WITH TIME ZONE;

UPDATE "appointment"
SET
  "occupiedStartsAt" = "startsAt" - ("preparationMinutes" * INTERVAL '1 minute'),
  "occupiedEndsAt" = "endsAt" + ("cleanupMinutes" * INTERVAL '1 minute');

ALTER TABLE "appointment"
ALTER COLUMN "occupiedStartsAt" SET NOT NULL,
ALTER COLUMN "occupiedEndsAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "appointment_customerIdentityDigest_startsAt_status_idx"
ON "appointment"("customerIdentityDigest", "startsAt", "status");

CREATE INDEX "appointment_occupiedStartsAt_occupiedEndsAt_status_idx"
ON "appointment"("occupiedStartsAt", "occupiedEndsAt", "status");

-- The half-open occupied interval includes preparation and cleanup buffers.
-- This database constraint is the final safeguard against concurrent overlaps.
ALTER TABLE "appointment"
ADD CONSTRAINT "appointment_no_confirmed_overlap"
EXCLUDE USING GIST (
  tstzrange(
    "occupiedStartsAt",
    "occupiedEndsAt",
    '[)'
  ) WITH &&
)
WHERE ("status" = 'CONFIRMED');
