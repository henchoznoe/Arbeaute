interface SluggedService {
  id: string
  slug: string
}

/** Construit l'unique URL partageable utilisée par la vitrine et le tunnel. */
export const buildServiceReservationPath = (slug: string): string =>
  `/reservation?service=${encodeURIComponent(slug)}`

/** Ne fait confiance qu'aux prestations réservables déjà chargées du serveur. */
export const resolveInitialServiceId = (
  services: SluggedService[],
  requestedSlug: string | null,
): string | null =>
  requestedSlug === null
    ? null
    : (services.find(service => service.slug === requestedSlug)?.id ?? null)
