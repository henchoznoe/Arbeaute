import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formControlClass } from '@/components/ui/form-field'

describe('shared visual system', () => {
  it('keeps shared form controls touch friendly and accessible', () => {
    expect(formControlClass).toContain('min-h-11')
    expect(formControlClass).toContain('text-base')
    expect(formControlClass).toContain('focus-visible:ring-3')
    expect(formControlClass).toContain('aria-invalid:border-destructive')
  })

  it('defines a global reduced-motion fallback', () => {
    const css = readFileSync('app/globals.css', 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('scroll-behavior: auto')
    expect(css).toContain('animation-duration: 0.01ms')
  })
})

/**
 * `@custom-variant dark` et quelques utilitaires `dark:` hérités de shadcn
 * survivaient sans qu'aucun bloc de jetons `.dark` existe : une surface
 * inatteignable qui donnait le change, et qui se serait déclenchée contre des
 * jetons clairs le jour où `.dark` serait posé.
 */
describe('pas de mode sombre à moitié', () => {
  const listSourceFiles = (directory: string): string[] =>
    readdirSync(directory, { recursive: true, encoding: 'utf8' })
      .filter(
        entry =>
          entry.endsWith('.ts') ||
          entry.endsWith('.tsx') ||
          entry.endsWith('.css'),
      )
      .map(entry => join(directory, entry))

  it('ne déclare aucune variante sombre', () => {
    const css = readFileSync('app/globals.css', 'utf8')
    expect(css).not.toContain('@custom-variant dark')
    expect(css).not.toContain('.dark {')
  })

  it('n’emploie aucune classe dark:', () => {
    const offenders = ['app', 'components']
      .flatMap(listSourceFiles)
      .flatMap(file =>
        readFileSync(file, 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            // Le préfixe de variante, pas le suffixe d'un jeton `ink-dark`.
            /(?<![\w-])dark:/.test(line)
              ? [`${file}:${index + 1} ${line.trim()}`]
              : [],
          ),
      )

    expect(offenders).toEqual([])
  })
})
