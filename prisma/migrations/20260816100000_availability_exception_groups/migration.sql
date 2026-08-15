ALTER TABLE "availability_exception" ADD COLUMN "groupId" TEXT;

UPDATE "availability_exception" SET "groupId" = "id" WHERE "groupId" IS NULL;

ALTER TABLE "availability_exception" ALTER COLUMN "groupId" SET NOT NULL;

CREATE INDEX "availability_exception_groupId_startsAt_idx"
ON "availability_exception"("groupId", "startsAt");
