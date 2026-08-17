import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { saveAgendaSettings } from '@/lib/actions/admin-agenda-settings'
import {
  AGENDA_DAY_LABELS,
  AGENDA_DAY_ORDER,
  getAgendaSettings,
} from '@/lib/admin/agenda-settings'
import { getAdminSession } from '@/lib/core/session-cookies'

interface AgendaSettingsPageProps {
  searchParams: Promise<{ error?: string; saved?: string }>
}

const AgendaSettingsPage = ({
  searchParams,
}: Readonly<AgendaSettingsPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" maxWidth="max-w-3xl" />}>
    <AgendaSettingsForm searchParams={searchParams} />
  </Suspense>
)

const AgendaSettingsForm = async ({
  searchParams,
}: Readonly<AgendaSettingsPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const [settings, params] = await Promise.all([
    getAgendaSettings(),
    searchParams,
  ])

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/admin/settings">
            <ChevronLeft className="size-4" /> Réglages
          </Link>
        </Button>
        <h1 className="mt-2 font-heading text-title font-bold">Agenda</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choisissez les jours que la vue semaine affiche sur ordinateur. Ce
          choix est enregistré ici, pas dans votre navigateur : tout le monde
          voit la même semaine.
        </p>
      </header>

      {params.saved ? (
        <p
          role="status"
          className="mt-6 rounded-xl border border-success-line bg-success-subtle p-4 text-sm text-success-strong"
        >
          Les jours affichés ont été enregistrés.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Rien n’a été enregistré : gardez au moins un jour affiché, puis
          réessayez.
        </p>
      ) : null}

      <form
        action={saveAgendaSettings}
        className="mt-7 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <fieldset>
          <legend className="text-sm font-medium">Jours affichés</legend>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Un jour décoché disparaît de la vue semaine sur ordinateur. Aucun
            rendez-vous n’est supprimé, et les onglets du téléphone continuent
            d’afficher les sept jours.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {AGENDA_DAY_ORDER.map(day => (
              <label
                key={day}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-medium transition hover:bg-muted"
              >
                <input
                  type="checkbox"
                  name="visibleDays"
                  value={day}
                  defaultChecked={settings.visibleDays.includes(day)}
                  className="size-5 accent-primary"
                />
                {AGENDA_DAY_LABELS[day]}
              </label>
            ))}
          </div>
        </fieldset>

        <SubmitButton
          pendingLabel="Enregistrement…"
          className="mt-7 w-full sm:w-auto"
        >
          Enregistrer les jours affichés
        </SubmitButton>
      </form>
    </main>
  )
}

export default AgendaSettingsPage
