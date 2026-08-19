import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MAIN_CONTENT_ID } from '@/components/ui/skip-link'

/**
 * L'écran commun aux pages d'erreur et d'introuvable.
 *
 * Le projet n'en avait aucune : une action serveur qui levait, ou un
 * identifiant inconnu, renvoyaient l'écran par défaut de Next — en anglais,
 * sans la charte, sans chemin de retour, et sans rien dire de ce qu'il faut
 * faire. `docs/vocabulaire.md` exige pourtant qu'un message dise ce qui s'est
 * passé, puis quoi faire ensuite : c'est la forme de cet écran.
 */
export const ErrorScreen = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  actions: ReactNode
}>) => (
  <main
    id={MAIN_CONTENT_ID}
    className="flex min-h-screen items-center justify-center px-6 py-16"
  >
    <section className="w-full max-w-md text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-subtle text-brand">
        <Icon className="size-6" />
      </div>
      <p className="mt-6 text-2xs font-semibold tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-heading text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {actions}
      </div>
    </section>
  </main>
)
