'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { moveAdminAppointment } from '@/lib/actions/admin-reschedule'
import { formatAppointmentDate } from '@/lib/reservation/time'

export const RescheduleForm = ({
  appointmentId,
  expectedStartsAt,
  slots,
  emailExpected,
}: {
  appointmentId: string
  expectedStartsAt: string
  slots: { startsAt: string }[]
  emailExpected: boolean
}) => {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(3)
  const confirmation = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()
  const confirm = () => {
    if (!selected) return
    startTransition(async () => {
      try {
        const result = await moveAdminAppointment({
          appointmentId,
          expectedStartsAt,
          startsAt: selected,
        })
        setMessage(result.message)
        setSelected(null)
        setDone(result.ok)
        router.refresh()
      } catch {
        setMessage(
          'La connexion a été interrompue. Consultez le rendez-vous pour vérifier son heure avant de réessayer.',
        )
        router.refresh()
      }
    })
  }
  return (
    <section className="mt-5 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Choisir une nouvelle heure</h2>
      {message ? (
        <p role="status" className="my-4 rounded-xl bg-muted p-3 text-sm">
          {message}
        </p>
      ) : null}
      {done ? (
        <div className="mt-4 grid gap-2">
          <Button asChild>
            <Link href="/admin/conflits">Voir les conflits restants</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/appointments/${appointmentId}`}>
              Voir le rendez-vous et les messages
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {!slots.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune heure libre pour ce soin sur ces sept jours. Choisissez une
              autre date ci-dessus.
            </p>
          ) : (
            <>
              <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Heures libres</legend>
                {slots.slice(0, visibleCount).map(slot => (
                  <label
                    key={slot.startsAt}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selected === slot.startsAt ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <input
                      type="radio"
                      name="reschedule-slot"
                      value={slot.startsAt}
                      checked={selected === slot.startsAt}
                      disabled={pending}
                      onChange={() => {
                        setSelected(slot.startsAt)
                        setMessage(null)
                        requestAnimationFrame(() =>
                          confirmation.current?.scrollIntoView({
                            block: 'nearest',
                          }),
                        )
                      }}
                    />
                    {formatAppointmentDate(new Date(slot.startsAt))}
                  </label>
                ))}
              </fieldset>
              {slots.length > visibleCount ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setVisibleCount(count => count + 12)}
                >
                  Voir davantage d’heures
                </Button>
              ) : null}
            </>
          )}
          {selected && slots.some(slot => slot.startsAt === selected) ? (
            <div
              ref={confirmation}
              className="mt-4 scroll-mb-24 space-y-3 border-t pt-4"
            >
              <p className="font-medium">
                Déplacer du {formatAppointmentDate(new Date(expectedStartsAt))}{' '}
                au {formatAppointmentDate(new Date(selected))} ?
              </p>
              <p className="text-sm text-muted-foreground">
                {emailExpected
                  ? 'Un e-mail avec la nouvelle heure sera préparé après confirmation.'
                  : 'Aucun e-mail ne pourra être envoyé. Appelez la personne pour convenir de cette heure.'}
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={pending}
                onClick={confirm}
              >
                {pending ? 'Déplacement en cours…' : 'Confirmer le déplacement'}
              </Button>
              <Button
                type="button"
                className="w-full"
                variant="ghost"
                disabled={pending}
                onClick={() => setSelected(null)}
              >
                Garder l’heure actuelle
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
