/**
 * Libellé complet d'une prestation, groupe compris.
 *
 * Plusieurs groupes contiennent une prestation du même nom (« Visage » existe
 * en Laser Erbium, Endosphères et Épilation laser) : sans le groupe, les
 * listes déroulantes et les agendas deviennent ambigus.
 */
export const formatServiceLabel = (
  serviceName: string,
  categoryName?: string | null,
): string => (categoryName ? `${categoryName} — ${serviceName}` : serviceName)
