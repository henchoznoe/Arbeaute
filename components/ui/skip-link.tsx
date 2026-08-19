/**
 * Le lien d'évitement, premier élément atteint par la tabulation.
 *
 * Chaque page monte un en-tête fixe avant son contenu : sans ce lien, atteindre
 * le premier bouton utile au clavier demandait de traverser toute la
 * navigation, à chaque page. Il reste invisible tant qu'il n'a pas le focus.
 */
export const MAIN_CONTENT_ID = 'contenu'

export const SkipLink = () => (
  <a
    href={`#${MAIN_CONTENT_ID}`}
    className="sr-only rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
  >
    Aller au contenu
  </a>
)
