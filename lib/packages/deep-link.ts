export const buildPackageReservationPath = (slug: string): string =>
  `/reservation?forfait=${encodeURIComponent(slug)}`
