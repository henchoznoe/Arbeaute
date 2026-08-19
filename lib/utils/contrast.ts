/**
 * Contraste WCAG 2.1, pour les seules couleurs que le projet ne choisit pas
 * lui-même : celles saisies dans l'administration.
 *
 * L'en-tête d'une catégorie prend pour fond la couleur enregistrée et écrivait
 * dessus en blanc. Sur la couleur en place, `rgb(146, 123, 89)`, le nom passait
 * à 3,81:1 — juste assez au titre de « grand texte » — et la description
 * échouait à 3,21:1. Rien ne vérifiait la teinte choisie : une couleur plus
 * claire rendait les deux illisibles sans qu'aucun écran ne le signale.
 *
 * Le calcul se fait ici, en amont du navigateur, parce qu'une décision de
 * lisibilité ne peut pas attendre une feuille de style.
 */

export interface Rgb {
  red: number
  green: number
  blue: number
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value

/**
 * Les jetons de `app/globals.css` sont écrits en OKLCH : la conversion est donc
 * nécessaire pour comparer une encre du thème à une couleur saisie en
 * hexadécimal. Formule de référence d'OKLab, puis passage en sRGB.
 */
const parseOklch = (value: string): Rgb | null => {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i)
  if (!match) return null

  const lightness = Number(match[1])
  const chroma = Number(match[2])
  const hue = (Number(match[3]) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const long = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map(channel => {
    const clamped = clamp(channel, 0, 1)
    const encoded =
      clamped <= 0.0031308
        ? clamped * 12.92
        : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(clamp(encoded, 0, 1) * 255)
  })

  return { red: linear[0], green: linear[1], blue: linear[2] }
}

const parseHex = (value: string): Rgb | null => {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map(digit => digit + digit)
          .join('')
      : match[1]
  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
  }
}

/** Le noir, faute de mieux : une couleur illisible vaut mieux qu'une exception. */
const FALLBACK: Rgb = { red: 0, green: 0, blue: 0 }

export const parseColor = (value: string): Rgb =>
  parseHex(value) ?? parseOklch(value) ?? FALLBACK

const linearize = (channel: number): number => {
  const ratio = channel / 255
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
}

const getRelativeLuminance = (color: Rgb): number =>
  0.2126 * linearize(color.red) +
  0.7152 * linearize(color.green) +
  0.0722 * linearize(color.blue)

export const getContrastRatio = (first: Rgb, second: Rgb): number => {
  const [darker, lighter] = [
    getRelativeLuminance(first),
    getRelativeLuminance(second),
  ].sort((a, b) => a - b)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Une encre posée à `alpha` sur un fond : ce que l'œil voit réellement. */
export const blend = (
  foreground: Rgb,
  background: Rgb,
  alpha: number,
): Rgb => ({
  red: Math.round(alpha * foreground.red + (1 - alpha) * background.red),
  green: Math.round(alpha * foreground.green + (1 - alpha) * background.green),
  blue: Math.round(alpha * foreground.blue + (1 - alpha) * background.blue),
})

/** Le seuil AA pour un texte ordinaire. */
export const AA_CONTRAST = 4.5

/**
 * Les deux seules encres possibles sur une couleur qui ne vient pas du thème.
 *
 * Ce sont les jetons `--ink-light` et `--ink-dark` d'`app/globals.css`,
 * recopiés ici parce qu'une décision de contraste se prend avant le rendu ;
 * `tests/ui/contrast.test.ts` les compare au fichier, ils ne peuvent pas
 * diverger en silence. Les encres du thème, légèrement teintées, ne suffisaient
 * pas : leur meilleur des deux tombe à 4,05:1 sur les teintes moyennes — dont
 * la couleur en place. Le blanc et le noir purs sont les seuls dont le meilleur
 * dépasse toujours 4,58:1.
 */
export const INK_COLORS = {
  light: 'oklch(1 0 0)',
  dark: 'oklch(0 0 0)',
} as const

export type Ink = keyof typeof INK_COLORS

/**
 * Clair sur fond foncé, foncé sur fond clair.
 *
 * Le meilleur des deux dépasse toujours 4,58:1, quelle que soit la couleur :
 * les deux courbes se croisent à cette valeur. Forcer le blanc, c'était
 * accepter de tomber sous le seuil pour toute une moitié des teintes.
 */
export const getReadableInk = (background: string): Ink => {
  const surface = parseColor(background)
  return getContrastRatio(parseColor(INK_COLORS.light), surface) >=
    getContrastRatio(parseColor(INK_COLORS.dark), surface)
    ? 'light'
    : 'dark'
}

export const getInkContrast = (background: string, ink: Ink): number =>
  getContrastRatio(parseColor(INK_COLORS[ink]), parseColor(background))

/** Les opacités permises pour un texte secondaire, de la plus discrète à la plus franche. */
const SECONDARY_OPACITIES = [0.8, 0.9, 1]

/**
 * L'opacité la plus discrète qui reste au-dessus du seuil.
 *
 * `text-white/80` posait l'inverse : une opacité choisie pour l'allure, et un
 * contraste constaté après coup — 3,21:1 sur la couleur en place.
 */
export const getSecondaryInkOpacity = (
  background: string,
  ink: Ink,
): number => {
  const surface = parseColor(background)
  const inkColor = parseColor(INK_COLORS[ink])
  return (
    SECONDARY_OPACITIES.find(
      opacity =>
        getContrastRatio(blend(inkColor, surface, opacity), surface) >=
        AA_CONTRAST,
    ) ?? 1
  )
}
