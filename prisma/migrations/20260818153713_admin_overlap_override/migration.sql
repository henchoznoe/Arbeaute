-- Arzu peut désormais superposer volontairement un rendez-vous à un autre
-- depuis l'agenda : un soin court glissé pendant la pose d'un autre. La
-- contrainte d'exclusion refusait l'écriture ; son prédicat exclut maintenant
-- les lignes marquées.
--
-- Ajout d'abord, avec une valeur par défaut : le code encore en ligne pendant
-- le déploiement écrit `false` et conserve exactement la protection d'avant.
ALTER TABLE "appointment"
ADD COLUMN "allowsOverlap" BOOLEAN NOT NULL DEFAULT false;

-- Une ligne marquée sort de l'index : elle ne se heurte à rien, et rien ne se
-- heurte à elle. Deux rendez-vous ordinaires restent impossibles à superposer.
--
-- Contrepartie assumée : face à une ligne marquée, ce garde-fou de dernier
-- recours ne joue plus. Une réservation publique reste protégée par le recalcul
-- des créneaux dans la transaction (`getAvailableSlots`), qui soustrait tous
-- les rendez-vous confirmés, marqués ou non.
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_no_confirmed_overlap";

ALTER TABLE "appointment"
ADD CONSTRAINT "appointment_no_confirmed_overlap"
EXCLUDE USING GIST (
  tstzrange(
    "occupiedStartsAt",
    "occupiedEndsAt",
    '[)'
  ) WITH &&
)
WHERE ("status" = 'CONFIRMED' AND NOT "allowsOverlap");
