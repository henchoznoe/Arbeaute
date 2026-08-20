import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const HOME = readFileSync('app/page.tsx', 'utf8')
const VERA = readFileSync('components/sections/vera-recommendation.tsx', 'utf8')

describe('recommandation affiliée Vera', () => {
  it('reste visible sur l’accueil avec le lien personnel d’Arzu', () => {
    expect(HOME).toContain('<VeraRecommendation />')
    expect(VERA).toContain("'https://nskn.co/9Xmsb0'")
  })

  it('annonce clairement la relation commerciale', () => {
    expect(VERA).toContain('Lien affilié')
    expect(VERA).toContain('Arzu peut')
    expect(VERA).toContain('recevoir une commission')
  })

  it('isole le lien externe et le signale aux moteurs de recherche', () => {
    expect(VERA).toContain('target="_blank"')
    expect(VERA).toContain('rel="sponsored noopener noreferrer"')
    expect(VERA).toContain('Vera est un service externe de Nu Skin')
  })
})
