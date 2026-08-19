'use client'

import { useState } from 'react'
import { FormField, formControlClass } from '@/components/ui/form-field'
import {
  AA_CONTRAST,
  getInkContrast,
  getReadableInk,
} from '@/lib/utils/contrast'
import { formatContrastRatio } from '@/lib/utils/format'

/** Le beige de la maison, seule valeur de départ jamais proposée. */
export const DEFAULT_CATEGORY_COLOR = '#927b59'

/**
 * Le sélecteur de couleur, avec le contraste qu'il obtient.
 *
 * La couleur d'un groupe sert de fond à l'en-tête de la vitrine, et rien ne
 * vérifiait la teinte choisie : une couleur claire rendait le nom et la
 * description illisibles sans qu'aucun écran ne le signale. L'encre se déduit
 * désormais du fond, ce qui tient le résultat au-dessus de 4,5:1 quelle que
 * soit la teinte — et le chiffre s'affiche, pour que la garantie se voie plutôt
 * que de se croire.
 *
 * Le sélecteur vivait aussi en deux exemplaires, l'un sous `formControlClass`
 * et l'autre sous une classe locale : il n'y en a plus qu'un.
 */
export const ColorField = ({
  controlId,
  name,
  defaultValue,
  label = 'Couleur',
  className,
}: Readonly<{
  controlId: string
  name: string
  defaultValue: string
  label?: string
  className?: string
}>) => {
  const [color, setColor] = useState(defaultValue)
  const ink = getReadableInk(color)
  const ratio = getInkContrast(color, ink)

  return (
    <FormField
      controlId={controlId}
      label={label}
      className={className}
      helpId={`${controlId}-contrast`}
      help={
        ratio >= AA_CONTRAST
          ? `Texte ${ink === 'light' ? 'clair' : 'foncé'} sur cette couleur : ${formatContrastRatio(ratio)}. Lisible.`
          : `Texte ${ink === 'light' ? 'clair' : 'foncé'} sur cette couleur : ${formatContrastRatio(ratio)}. C’est trop peu pour être lu : choisissez une teinte plus foncée ou plus claire.`
      }
    >
      <input
        id={controlId}
        name={name}
        type="color"
        required
        value={color}
        onChange={event => setColor(event.target.value)}
        aria-describedby={`${controlId}-contrast`}
        className={`${formControlClass} p-1`}
      />
    </FormField>
  )
}
