import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * La v2 avait aligné tous les écrans sur `Button`, `FormField` et
 * `formControlClass`. Le catalogue et quelques panneaux d'administration
 * étaient restés en arrière : libellés écrits à la main, rayons d'une
 * génération plus ancienne, un même mot dit de trois façons — « (facultatif) »,
 * « (optionnel) », « (optionnelle) » —, et un écran de connexion avec son
 * propre champ et son propre anneau de focus.
 */
const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter(entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))
    .map(entry => join(directory, entry))

const ADMIN_DIRECTORIES = ['app/admin', 'components/admin']

const findOffenders = (
  directories: string[],
  pattern: RegExp,
  isAllowed: (file: string) => boolean = () => false,
): string[] =>
  directories
    .flatMap(listSourceFiles)
    .filter(file => !isAllowed(file))
    .flatMap(file =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          pattern.test(line) ? [`${file}:${index + 1} ${line.trim()}`] : [],
        ),
    )

describe('administration sur la charte', () => {
  it('n’écrit plus de libellé empilé à la main', () => {
    // Le gabarit des libellés faits maison : un `<label>` en grille qui pose
    // son texte au-dessus du champ. C'est exactement ce que `FormField` fait.
    const offenders = findOffenders(
      ADMIN_DIRECTORIES,
      /className="[^"]*grid gap-1\.5 text-sm font-medium/,
    )

    expect(offenders).toEqual([])
  })

  it('ne mentionne un champ facultatif que depuis une seule source', () => {
    const offenders = findOffenders(
      ['app', 'components'],
      /\((?:facultatif|optionnel)/i,
      file => file === join('components', 'ui', 'form-field.tsx'),
    )

    expect(offenders).toEqual([])
    expect(readFileSync('components/ui/form-field.tsx', 'utf8')).toContain(
      '(facultatif)',
    )
  })

  it('n’invente aucun anneau de focus à côté de formControlClass', () => {
    // `formControlClass` pose `focus-visible:ring-3` ; l'écran de connexion
    // écrivait `focus:ring-2`, et une ombre qu'on ne trouvait nulle part.
    const offenders = findOffenders(['app', 'components'], /focus:ring-\d/)

    expect(offenders).toEqual([])
  })

  it('donne le même rayon aux panneaux de la page des prestations', () => {
    const panels = [
      'app/admin/services/page.tsx',
      'components/admin/service-form.tsx',
      'components/admin/service-image-upload.tsx',
      'components/admin/service-consent-upload.tsx',
    ]

    for (const panel of panels) {
      const source = readFileSync(panel, 'utf8')
      expect(source, panel).toContain('rounded-3xl border bg-card')
    }
  })

  it('n’a plus qu’un seul sélecteur de couleur', () => {
    const offenders = findOffenders(
      ['app', 'components'],
      /type="color"/,
      file => file === join('components', 'admin', 'color-field.tsx'),
    )

    expect(offenders).toEqual([])
  })

  it('passe l’écran de connexion sous FormField', () => {
    const login = readFileSync('app/admin/login/page.tsx', 'utf8')
    expect(login).toContain('<FormField controlId="password"')
    expect(login).toContain('className={formControlClass}')
  })
})
