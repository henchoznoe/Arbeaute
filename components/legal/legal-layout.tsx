import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'

interface LegalLayoutProps {
  eyebrow: string
  title: string
  lastUpdated: string
  children: ReactNode
}

export const LegalLayout = ({
  eyebrow,
  title,
  lastUpdated,
  children,
}: Readonly<LegalLayoutProps>) => (
  <>
    <SiteHeader />
    <main className="min-h-screen px-5 pt-24 pb-16 sm:px-8 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-title font-bold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Dernière mise à jour : {lastUpdated}
        </p>
        <div className="mt-10 space-y-8 leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </main>
  </>
)
