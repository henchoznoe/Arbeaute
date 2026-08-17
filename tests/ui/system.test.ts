import { readFileSync } from 'node:fs'
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
