-- Le premier trigger savait contrôler un forfait dont la validité avait déjà
-- commencé, mais pas une vente directe encore sans première séance. Calculer
-- la plage complète, en incluant la ligne en cours, protège aussi une série
-- créée en une transaction et le rattachement d'une séance antérieure.
CREATE OR REPLACE FUNCTION validate_package_session() RETURNS trigger AS $$
DECLARE
  sold_package "customer_package"%ROWTYPE;
  linked_appointment "appointment"%ROWTYPE;
  used_credits INTEGER;
  first_reserved_start TIMESTAMP(3);
  last_reserved_start TIMESTAMP(3);
  package_expiry TIMESTAMP(3);
BEGIN
  SELECT * INTO sold_package
  FROM "customer_package"
  WHERE "id" = NEW."customerPackageId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer package does not exist';
  END IF;

  SELECT * INTO linked_appointment
  FROM "appointment"
  WHERE "id" = NEW."appointmentId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment does not exist';
  END IF;

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

  IF NEW."creditState" <> 'RETURNED' THEN
    SELECT COUNT(*), MIN(appointment."startsAt"), MAX(appointment."startsAt")
    INTO used_credits, first_reserved_start, last_reserved_start
    FROM "package_session" package_session
    JOIN "appointment" appointment
      ON appointment."id" = package_session."appointmentId"
    WHERE package_session."customerPackageId" = sold_package."id"
      AND package_session."creditState" <> 'RETURNED'
      AND package_session."id" <> NEW."id";

    IF used_credits >= sold_package."sessionCountSnapshot" THEN
      RAISE EXCEPTION 'customer package has no remaining credit';
    END IF;

    first_reserved_start := LEAST(
      COALESCE(first_reserved_start, linked_appointment."startsAt"),
      linked_appointment."startsAt"
    );
    last_reserved_start := GREATEST(
      COALESCE(last_reserved_start, linked_appointment."startsAt"),
      linked_appointment."startsAt"
    );
    package_expiry := COALESCE(
      sold_package."expiresAtOverride",
      first_reserved_start + make_interval(months => sold_package."validityMonthsSnapshot")
    );
    IF last_reserved_start > package_expiry THEN
      RAISE EXCEPTION 'customer package is expired';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Une suppression libère un crédit. Elle prend le même verrou que l'ajout pour
-- que le recalcul du premier rendez-vous ne puisse pas croiser une réservation
-- concurrente du dernier crédit.
CREATE FUNCTION lock_customer_package_on_session_delete() RETURNS trigger AS $$
BEGIN
  PERFORM 1
  FROM "customer_package"
  WHERE "id" = OLD."customerPackageId"
  FOR UPDATE;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER package_session_delete_lock
BEFORE DELETE ON "package_session"
FOR EACH ROW EXECUTE FUNCTION lock_customer_package_on_session_delete();

-- Une séance déjà rattachée ne doit pas pouvoir sortir silencieusement du
-- contrat lors d'une modification ultérieure du rendez-vous. Le trigger posé
-- sur `package_session` protège le rattachement initial ; celui-ci protège les
-- changements de client, de soin et d'horaire qui suivent.
CREATE FUNCTION validate_linked_package_appointment() RETURNS trigger AS $$
DECLARE
  sold_package "customer_package"%ROWTYPE;
  first_reserved_start TIMESTAMP(3);
  last_reserved_start TIMESTAMP(3);
  package_expiry TIMESTAMP(3);
BEGIN
  SELECT customer_package.* INTO sold_package
  FROM "package_session" package_session
  JOIN "customer_package" customer_package
    ON customer_package."id" = package_session."customerPackageId"
  WHERE package_session."appointmentId" = NEW."id"
  FOR UPDATE OF customer_package;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW."customerId" IS DISTINCT FROM sold_package."customerId" THEN
    RAISE EXCEPTION 'appointment belongs to another customer';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "customer_package_service"
    WHERE "customerPackageId" = sold_package."id"
      AND "serviceId" = NEW."serviceId"
  ) THEN
    RAISE EXCEPTION 'service is not allowed by customer package';
  END IF;

  SELECT
    MIN(
      CASE
        WHEN package_session."appointmentId" = NEW."id" THEN NEW."startsAt"
        ELSE appointment."startsAt"
      END
    ),
    MAX(
      CASE
        WHEN package_session."appointmentId" = NEW."id" THEN NEW."startsAt"
        ELSE appointment."startsAt"
      END
    )
  INTO first_reserved_start, last_reserved_start
  FROM "package_session" package_session
  JOIN "appointment" appointment
    ON appointment."id" = package_session."appointmentId"
  WHERE package_session."customerPackageId" = sold_package."id"
    AND package_session."creditState" <> 'RETURNED';

  package_expiry := COALESCE(
    sold_package."expiresAtOverride",
    first_reserved_start + make_interval(months => sold_package."validityMonthsSnapshot")
  );
  IF package_expiry IS NOT NULL AND last_reserved_start > package_expiry THEN
    RAISE EXCEPTION 'customer package is expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER linked_package_appointment_validate
BEFORE UPDATE OF "customerId", "serviceId", "startsAt"
ON "appointment"
FOR EACH ROW EXECUTE FUNCTION validate_linked_package_appointment();

-- La prestation a été créée dans l'admin avant le déploiement du sélecteur.
-- Sans ce rattrapage, la nouvelle colonne prendrait sa valeur COVER par défaut
-- et rognerait l'affiche qui contient du texte.
UPDATE "service"
SET "imageDisplayMode" = 'CONTAIN'
WHERE "slug" = 'soin-purifiant-du-dos-a-l-argile';
