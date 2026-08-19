-- Une journée dont toutes les heures tombaient sous le délai de réservation
-- s'affichait « complète », exactement comme une journée réellement pleine :
-- quelqu'un qui regardait le site à 8 h du matin lisait « tous les créneaux de
-- ce jour sont déjà pris » alors que l'institut était vide. Ces heures peuvent
-- désormais rester visibles, marquées « sur demande ».
--
-- Ajout seul, avec valeurs par défaut : le code encore en ligne pendant le
-- déploiement ne connaît pas ces colonnes, et `false` reproduit à l'identique
-- le comportement d'avant. Arzu active la fonction quand elle le décide.
ALTER TABLE "booking_settings"
ADD COLUMN "lateRequestsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Plancher absolu : sous ce délai, plus aucune heure n'apparaît, même sur
-- demande. Arzu est en soin et ne lit pas ses e-mails.
ALTER TABLE "booking_settings"
ADD COLUMN "lateRequestFloorHours" INTEGER NOT NULL DEFAULT 2;
