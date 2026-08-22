import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const HOME = readFileSync('app/page.tsx', 'utf8')
const VERA = readFileSync('components/sections/vera-recommendation.tsx', 'utf8')

describe('analyse de peau recommandée par Arzu', () => {
  it('reste visible sur l’accueil avec le lien destiné au public', () => {
    expect(HOME).toContain('<VeraRecommendation />')
    expect(VERA).toContain("'https://nskn.co/Xg1Fdf'")
    expect(VERA).not.toContain('6BbYE8')
    expect(VERA).not.toContain('9Xmsb0')
  })

  it('présente simplement l’analyse sans détailler la marque ou la rémunération', () => {
    expect(VERA).toContain('Faites une analyse de peau personnalisée')
    expect(VERA).not.toContain('Nu Skin')
    expect(VERA).not.toContain('commission')
    expect(VERA).not.toContain('Stela')
  })

  it('isole le lien externe et le signale aux moteurs de recherche', () => {
    expect(VERA).toContain('target="_blank"')
    expect(VERA).toContain('rel="sponsored noopener noreferrer"')
  })
})
