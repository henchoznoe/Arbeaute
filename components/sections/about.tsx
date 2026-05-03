import { Separator } from '@/components/ui/separator'
import { bio, contact } from '@/lib/constants/contact'

export function About() {
  return (
    <section
      id="about"
      className="scroll-mt-16 bg-linear-to-b from-rose-50/50 to-transparent px-6 py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium tracking-[0.2em] text-rose-400/80 uppercase">
            Votre esthéticienne
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {contact.owner}
          </h2>
        </div>

        <div className="flex flex-col items-center gap-10 md:flex-row md:items-start">
          <div className="flex size-48 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-rose-100 to-amber-50 shadow-lg">
            <span className="font-heading text-5xl font-bold text-rose-300">
              A
            </span>
          </div>

          <div className="text-center md:text-left">
            <blockquote className="text-lg leading-relaxed text-muted-foreground italic">
              &ldquo;{bio}&rdquo;
            </blockquote>

            <Separator className="my-6" />

            <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground md:justify-start">
              <span className="rounded-full bg-rose-50 px-4 py-1.5">
                Esthéticienne diplômée
              </span>
              <span className="rounded-full bg-rose-50 px-4 py-1.5">
                Formation continue
              </span>
              <span className="rounded-full bg-rose-50 px-4 py-1.5">
                Basée à Bulle
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
