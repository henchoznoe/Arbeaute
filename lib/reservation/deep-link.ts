interface SluggedService {
  id: string
  slug: string
}

/** Ne fait confiance qu'aux prestations réservables déjà chargées du serveur. */
export const resolveInitialServiceId = (
  services: SluggedService[],
  requestedSlug: string | null,
): string | null =>
  requestedSlug === null
    ? null
    : (services.find(service => service.slug === requestedSlug)?.id ?? null)
