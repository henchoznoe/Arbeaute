import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AA_CONTRAST,
  blend,
  getContrastRatio,
  getInkContrast,
  getReadableInk,
  getSecondaryInkOpacity,
  INK_COLORS,
  parseColor,
} from '@/lib/utils/contrast'

/**
 * L'en-tête d'une catégorie prend pour fond la couleur saisie dans
 * l'administration, et écrivait dessus en blanc. Sur la couleur en place, le
 * nom ne passait qu'au titre de « grand texte » et la description échouait.
 * Rien ne vérifiait la teinte choisie.
 */
const GLOBALS = readFileSync('app/globals.css', 'utf8')

describe('calcul de contraste', () => {
  it('lit un hexadécimal comme un jeton OKLCH', () => {
    expect(parseColor('#927b59')).toEqual({ red: 146, green: 123, blue: 89 })
    expect(parseColor('#fff')).toEqual({ red: 255, green: 255, blue: 255 })
    expect(parseColor('oklch(1 0 0)')).toEqual({
      red: 255,
      green: 255,
      blue: 255,
    })
    expect(parseColor('oklch(0 0 0)')).toEqual({ red: 0, green: 0, blue: 0 })
  })

  it('retrouve les rapports de référence WCAG', () => {
    expect(
      getContrastRatio(parseColor('#ffffff'), parseColor('#000000')),
    ).toBeCloseTo(21, 5)
    expect(
      getContrastRatio(parseColor('#ffffff'), parseColor('#ffffff')),
    ).toBeCloseTo(1, 5)
    // Le gris de référence du seuil AA sur fond blanc.
    expect(
      getContrastRatio(parseColor('#767676'), parseColor('#ffffff')),
    ).toBeGreaterThanOrEqual(AA_CONTRAST)
  })
})

describe('encre déduite du fond', () => {
  it('ne descend jamais sous le seuil AA, quelle que soit la couleur', () => {
    // Le cube sRGB au pas de sept : les deux courbes se croisent à 4,58:1, et
    // c'est ce croisement qui garantit le seuil.
    let worst = Number.POSITIVE_INFINITY
    for (let red = 0; red < 256; red += 7)
      for (let green = 0; green < 256; green += 7)
        for (let blue = 0; blue < 256; blue += 7) {
          const hex = `#${[red, green, blue]
            .map(channel => channel.toString(16).padStart(2, '0'))
            .join('')}`
          worst = Math.min(worst, getInkContrast(hex, getReadableInk(hex)))
        }

    expect(worst).toBeGreaterThanOrEqual(AA_CONTRAST)
  })

  it('choisit l’encre foncée sur la couleur en place, là où le blanc échouait', () => {
    const inPlace = '#927b59'
    expect(getReadableInk(inPlace)).toBe('dark')
    expect(getInkContrast(inPlace, 'dark')).toBeGreaterThanOrEqual(AA_CONTRAST)
    // Le blanc forcé, lui, restait sous le seuil : c'était le constat.
    expect(
      getContrastRatio(parseColor('#ffffff'), parseColor(inPlace)),
    ).toBeLessThan(AA_CONTRAST)
  })

  it('choisit une opacité de description qui reste lisible', () => {
    for (const background of ['#927b59', '#111111', '#f5f5f5', '#2f6f4e']) {
      const ink = getReadableInk(background)
      const opacity = getSecondaryInkOpacity(background, ink)
      const composed = blend(
        parseColor(INK_COLORS[ink]),
        parseColor(background),
        opacity,
      )
      expect(opacity).toBeLessThanOrEqual(1)
      expect(
        getContrastRatio(composed, parseColor(background)),
      ).toBeGreaterThanOrEqual(AA_CONTRAST)
    }
  })

  it('reprend les jetons d’encre tels qu’ils sont écrits dans la charte', () => {
    expect(GLOBALS).toContain(`--ink-light: ${INK_COLORS.light};`)
    expect(GLOBALS).toContain(`--ink-dark: ${INK_COLORS.dark};`)
    expect(GLOBALS).toContain('--color-ink-light: var(--ink-light);')
    expect(GLOBALS).toContain('--color-ink-dark: var(--ink-dark);')
  })
})

/**
 * « Aucune couleur littérale dans `app/` ni `components/` : les intentions
 * passent par les jetons de `app/globals.css`. » La règle était écrite, sans
 * garde-fou : treize classes de la palette Tailwind y avaient survécu.
 */
describe('aucune couleur littérale dans les écrans', () => {
  const LITERAL_COLOR =
    /\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d{1,3})?\b/

  const listSourceFiles = (directory: string): string[] =>
    readdirSync(directory, { recursive: true, encoding: 'utf8' })
      .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
      .map(entry => join(directory, entry))

  it('n’emploie aucune classe de la palette Tailwind', () => {
    const offenders = ['app', 'components']
      .flatMap(listSourceFiles)
      .flatMap(file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            LITERAL_COLOR.test(line)
              ? [`${file}:${index + 1} ${line.trim()}`]
              : [],
          ),
      )

    expect(offenders).toEqual([])
  })
})

describe('légendes posées sur une photo', () => {
  it('garde le texte au-dessus du seuil sur l’image la plus claire', () => {
    // Pire cas : une photo entièrement blanche sous le voile.
    const white = parseColor('#ffffff')
    const scrim = parseColor(INK_COLORS.dark)
    const ink = parseColor(INK_COLORS.light)

    // Le hero ne figure plus ici : depuis la refonte, sa photo est posée à
    // côté du titre et ne porte aucun texte. Seule la galerie écrit encore par
    // dessus une image, et c'est son voile que ce test protège.
    const captions = [
      { name: 'galerie, titre', veil: 0.75, opacity: 1 },
      { name: 'galerie, légende', veil: 0.75, opacity: 0.75 },
    ]

    for (const caption of captions) {
      const background = blend(scrim, white, caption.veil)
      const text = blend(ink, background, caption.opacity)
      expect(
        getContrastRatio(text, background),
        caption.name,
      ).toBeGreaterThanOrEqual(AA_CONTRAST)
    }
  })

  it('applique bien ce voile dans la galerie', () => {
    expect(readFileSync('components/sections/gallery.tsx', 'utf8')).toContain(
      'from-ink-dark/75',
    )
  })
})
