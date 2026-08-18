import { SlidersHorizontal } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import {
  AdminPage,
  AdminPageAside,
  AdminPageColumns,
  AdminPageHeader,
} from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { FormField, formControlClass } from '@/components/ui/form-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { saveBookingSettings } from '@/lib/actions/admin-booking-settings'
import { SLOT_INTERVAL_OPTIONS } from '@/lib/admin/booking-settings'
import {
  describeBookingHorizon,
  describeBookingNotice,
  describeChangeCutoff,
  describeSlotInterval,
  formatSlotIntervalLabel,
} from '@/lib/admin/booking-settings-wording'
import { getAdminSession } from '@/lib/core/session-cookies'
import { getBookingSettings } from '@/lib/reservation/booking-settings'

interface BookingSettingsPageProps {
  searchParams: Promise<{ error?: string; saved?: string }>
}

const BookingSettingsPage = ({
  searchParams,
}: Readonly<BookingSettingsPageProps>) => (
  <Suspense fallback={<AdminSkeleton variant="form" />}>
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
    <AdminPage>
      <AdminPageHeader
        backHref="/admin/settings"
        backLabel="Réglages"
        eyebrow="Arbeauté"
        title="Règles de réservation"
        icon={SlidersHorizontal}
        description="Ces quatre réglages décident de ce qui peut être réservé en ligne, et jusqu’à quand un rendez-vous peut être modifié sans vous."
      />

      <AdminPageColumns>
        <AdminPageAside>
          {params.saved ? (
            <p
              role="status"
              className="rounded-2xl border border-success-line bg-success-subtle p-4 text-sm leading-relaxed text-success-strong"
            >
              Les règles de réservation ont été enregistrées.
            </p>
          ) : null}
          {params.error ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive"
            >
              Rien n’a été enregistré. Les deux délais en heures doivent rester
              plus courts que la période pendant laquelle on peut réserver.
              Réduisez l’un des deux délais, ou augmentez le nombre de mois.
            </p>
          ) : null}
          <div className="rounded-2xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">Bon à savoir</p>
            <p className="mt-2">
              Quel que soit l’espacement choisi, le site vérifie toujours que la
              durée complète du soin tient, temps d’installation et de rangement
              compris. Vous ne risquez pas de vous retrouver avec deux
              rendez-vous collés.
            </p>
          </div>
        </AdminPageAside>

        <form
          action={saveBookingSettings}
          className="min-w-0 rounded-3xl border bg-card p-5 shadow-sm sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              controlId="booking-notice"
              label="Combien de temps à l’avance réserver"
              help={describeBookingNotice(settings.minBookingNoticeHours)}
              helpId="booking-notice-help"
            >
              <div className="relative">
                <input
                  id="booking-notice"
                  name="minBookingNoticeHours"
                  type="number"
                  min={0}
                  max={720}
                  required
                  defaultValue={settings.minBookingNoticeHours}
                  aria-describedby="booking-notice-help"
                  className={`${formControlClass} w-full pr-20`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  heures
                </span>
              </div>
            </FormField>

            <FormField
              controlId="booking-horizon"
              label="Jusqu’à quand on peut réserver"
              help={describeBookingHorizon(settings.bookingHorizonMonths)}
              helpId="booking-horizon-help"
            >
              <div className="relative">
                <input
                  id="booking-horizon"
                  name="bookingHorizonMonths"
                  type="number"
                  min={1}
                  max={12}
                  required
                  defaultValue={settings.bookingHorizonMonths}
                  aria-describedby="booking-horizon-help"
                  className={`${formControlClass} w-full pr-16`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  mois
                </span>
              </div>
            </FormField>

            <FormField
              controlId="change-cutoff"
              label="Jusqu’à quand un rendez-vous peut être changé"
              help={describeChangeCutoff(settings.customerChangeCutoffHours)}
              helpId="change-cutoff-help"
            >
              <div className="relative">
                <input
                  id="change-cutoff"
                  name="customerChangeCutoffHours"
                  type="number"
                  min={0}
                  max={240}
                  required
                  defaultValue={settings.customerChangeCutoffHours}
                  aria-describedby="change-cutoff-help"
                  className={`${formControlClass} w-full pr-20`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  heures
                </span>
              </div>
            </FormField>

            <FormField
              controlId="slot-interval"
              label="Espacement des heures proposées"
              help={describeSlotInterval(settings.slotIntervalMinutes)}
              helpId="slot-interval-help"
            >
              <select
                id="slot-interval"
                name="slotIntervalMinutes"
                required
                defaultValue={settings.slotIntervalMinutes}
                aria-describedby="slot-interval-help"
                className={formControlClass}
              >
                {SLOT_INTERVAL_OPTIONS.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {formatSlotIntervalLabel(minutes)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <SubmitButton
            pendingLabel="Enregistrement…"
            className="mt-7 w-full sm:w-auto"
          >
            Enregistrer les règles
          </SubmitButton>
        </form>
      </AdminPageColumns>
    </AdminPage>
  )
}

export default BookingSettingsPage
