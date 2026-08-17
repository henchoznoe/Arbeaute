CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "appointment_customerSearchName_trgm_idx"
ON "appointment" USING GIN ("customerSearchName" gin_trgm_ops);
