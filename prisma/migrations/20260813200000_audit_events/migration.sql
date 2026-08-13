CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'CUSTOMER');
CREATE TYPE "AuditEntityType" AS ENUM (
  'APPOINTMENT',
  'CUSTOMER',
  'SERVICE',
  'SERVICE_CATEGORY',
  'WEEKLY_AVAILABILITY',
  'AVAILABILITY_EXCEPTION'
);
CREATE TYPE "AuditActionType" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'CANCELLED',
  'RESCHEDULED',
  'REORDERED',
  'ARCHIVED',
  'RESTORED',
  'FILE_ASSIGNED',
  'FILE_REMOVED'
);

CREATE TABLE "audit_event" (
  "id" TEXT NOT NULL,
  "actorType" "AuditActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "entityType" "AuditEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityLabel" TEXT,
  "action" "AuditActionType" NOT NULL,
  "changes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_event_createdAt_idx" ON "audit_event"("createdAt");
CREATE INDEX "audit_event_entityType_entityId_createdAt_idx"
ON "audit_event"("entityType", "entityId", "createdAt");
CREATE INDEX "audit_event_action_createdAt_idx"
ON "audit_event"("action", "createdAt");
CREATE INDEX "audit_event_actorType_createdAt_idx"
ON "audit_event"("actorType", "createdAt");

-- Le journal est append-only jusque dans PostgreSQL : aucune erreur applicative
-- ou manipulation Prisma ne peut réécrire a posteriori un événement publié.
CREATE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_event_prevent_update"
BEFORE UPDATE ON "audit_event"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE TRIGGER "audit_event_prevent_delete"
BEFORE DELETE ON "audit_event"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
