import { CalendarDays } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import {
  AdminPage,
  AdminPageAside,
  AdminPageColumns,
  AdminPageHeader,
} from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
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
  <Suspense fallback={<AdminSkeleton variant="form" />}>
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
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="Agenda"
        icon={CalendarDays}
        description="Choisissez les jours que la vue semaine affiche sur ordinateur. Ce choix est enregistré ici, pas dans votre navigateur : tout le monde voit la même semaine."
      />

      <AdminPageColumns>
        <AdminPageAside>
          {params.saved ? (
            <p
              role="status"
              className="rounded-2xl border border-success-line bg-success-subtle p-4 text-sm leading-relaxed text-success-strong"
            >
              Les jours affichés ont été enregistrés.
            </p>
          ) : null}
          {params.error ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive"
            >
              Rien n’a été enregistré : gardez au moins un jour affiché, puis
              réessayez.
            </p>
          ) : null}
          <div className="rounded-2xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Bon à savoir</p>
            <p className="mt-2">
              Un jour décoché disparaît de la vue semaine sur ordinateur. Aucun
              rendez-vous n’est supprimé, et les onglets du téléphone continuent
              d’afficher les sept jours.
            </p>
          </div>
        </AdminPageAside>

        <form
          action={saveAgendaSettings}
          className="min-w-0 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
        >
          <fieldset>
            <legend className="text-sm font-medium">Jours affichés</legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
      </AdminPageColumns>
    </AdminPage>
  )
}

export default AgendaSettingsPage
