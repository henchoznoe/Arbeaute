import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { saveBookingSettings } from '@/lib/actions/admin-booking-settings'
import { SLOT_INTERVAL_OPTIONS } from '@/lib/admin/booking-settings'
import { getAdminSession } from '@/lib/core/session-cookies'
import { getBookingSettings } from '@/lib/reservation/booking-settings'

interface BookingSettingsPageProps {
  searchParams: Promise<{ error?: string; saved?: string }>
}

const BookingSettingsPage = ({
  searchParams,
}: Readonly<BookingSettingsPageProps>) => (
  <Suspense fallback={<AdminSkeleton maxWidth="max-w-3xl" />}>
    <BookingSettingsForm searchParams={searchParams} />
  </Suspense>
)

const BookingSettingsForm = async ({
  searchParams,
}: Readonly<BookingSettingsPageProps>) => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const [settings, params] = await Promise.all([
    getBookingSettings(),
    searchParams,
  ])

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
        >
          ← Réglages
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          Règles de réservation
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ces quatre valeurs pilotent le calendrier public, les créations, les
          déplacements et les conditions affichées aux clientes.
        </p>
      </header>

      {params.saved ? (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          Les règles de réservation ont été enregistrées.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Vérifiez les valeurs : les délais doivent rester inférieurs à
          l’horizon de réservation.
        </p>
      ) : null}

      <form
        action={saveBookingSettings}
        className="mt-7 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Préavis minimum
            <span className="font-normal text-muted-foreground">
              Entre 0 et 720 heures avant le rendez-vous.
            </span>
            <div className="relative">
              <input
                name="minBookingNoticeHours"
                type="number"
                min={0}
                max={720}
                required
                defaultValue={settings.minBookingNoticeHours}
                className={`${formControlClass} w-full pr-20`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                heures
              </span>
            </div>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Horizon de réservation
            <span className="font-normal text-muted-foreground">
              Nombre de mois visibles dans le calendrier.
            </span>
            <div className="relative">
              <input
                name="bookingHorizonMonths"
                type="number"
                min={1}
                max={12}
                required
                defaultValue={settings.bookingHorizonMonths}
                className={`${formControlClass} w-full pr-16`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                mois
              </span>
            </div>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Délai de modification
            <span className="font-normal text-muted-foreground">
              Heures ouvrables, week-end non comptabilisé.
            </span>
            <div className="relative">
              <input
                name="customerChangeCutoffHours"
                type="number"
                min={0}
                max={240}
                required
                defaultValue={settings.customerChangeCutoffHours}
                className={`${formControlClass} w-full pr-20`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                heures
              </span>
            </div>
          </label>

          <label className="grid gap-1.5 text-sm font-medium">
            Pas des créneaux
            <span className="font-normal text-muted-foreground">
              Intervalle proposé entre deux heures de départ.
            </span>
            <select
              name="slotIntervalMinutes"
              required
              defaultValue={settings.slotIntervalMinutes}
              className={formControlClass}
            >
              {SLOT_INTERVAL_OPTIONS.map(minutes => (
                <option key={minutes} value={minutes}>
                  Toutes les {minutes} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-7 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          Les durées de prestation, de préparation et de rangement restent
          toujours contrôlées intégralement, quel que soit le pas choisi.
        </div>
        <SubmitButton
          pendingLabel="Enregistrement…"
          className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground sm:w-auto"
        >
          Enregistrer les règles
        </SubmitButton>
      </form>
    </main>
  )
}

export default BookingSettingsPage
