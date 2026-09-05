import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AdminPage, AdminPageHeader } from '@/components/admin/admin-page'
import { AdminSkeleton } from '@/components/admin/admin-skeleton'
import { CustomerCallButton } from '@/components/admin/customer-call-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getConflictAppointments,
  getUpcomingConflicts,
} from '@/lib/admin/conflict-queries'
import { getAdminSession } from '@/lib/core/session-cookies'
import { formatAppointmentDate, formatSlotTime } from '@/lib/reservation/time'

const Conflicts = async () => {
  if (!(await getAdminSession())) redirect('/admin/login')
  const { conflicts, ids, groups } = await getUpcomingConflicts()
  const appointments = await getConflictAppointments(ids)
  return (
    <AdminPage>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Agenda"
        title="Rendez-vous superposés"
        icon={AlertTriangle}
        description="Appelez les personnes concernées pour convenir d’une autre heure, puis déplacez l’un des rendez-vous."
      />
      {!groups.length ? (
        <EmptyState
          className="mt-5"
          title="Aucune superposition à venir"
          description="Tous les rendez-vous ont leur place dans l’agenda."
        />
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map(group => (
            <section
              key={group[0]}
              className="rounded-2xl border border-destructive/40 p-4"
            >
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-5 text-destructive" />
                {group.length} rendez-vous concernés
              </h2>
              <ul className="space-y-4">
                {appointments
                  .filter(a => group.includes(a.id))
                  .map(appointment => {
                    const name =
                      [
                        appointment.customerFirstName,
                        appointment.customerLastName,
                      ]
                        .filter(Boolean)
                        .join(' ') || 'Sans nom'
                    return (
                      <li
                        key={appointment.id}
                        className="rounded-xl border bg-card p-3"
                      >
                        <h3 className="font-semibold">{name}</h3>
                        <p className="text-sm">
                          {formatAppointmentDate(appointment.startsAt)}–
                          {formatSlotTime(appointment.endsAt)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.serviceNameSnapshot}
                        </p>
                        {conflicts
                          .filter(
                            c =>
                              c.firstId === appointment.id ||
                              c.secondId === appointment.id,
                          )
                          .map(c => {
                            const other = appointments.find(
                              a =>
                                a.id ===
                                (c.firstId === appointment.id
                                  ? c.secondId
                                  : c.firstId),
                            )
                            return other ? (
                              <p
                                key={other.id}
                                className="mt-2 text-sm text-destructive"
                              >
                                {c.buffersOnly
                                  ? 'Installation ou rangement : se superpose à '
                                  : 'Se superpose à '}
                                {[
                                  other.customerFirstName,
                                  other.customerLastName,
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                , {formatAppointmentDate(other.startsAt)}–
                                {formatSlotTime(other.endsAt)}.
                              </p>
                            ) : null
                          })}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <CustomerCallButton
                            phone={appointment.customerPhone}
                            customerName={name}
                          />
                          <Button asChild>
                            <Link
                              href={`/admin/appointments/${appointment.id}/deplacer`}
                            >
                              Déplacer
                            </Link>
                          </Button>
                          <Button asChild variant="ghost">
                            <Link
                              href={`/admin/appointments/${appointment.id}`}
                            >
                              Voir le rendez-vous
                            </Link>
                          </Button>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AdminPage>
  )
}

export default function ConflictsPage() {
  return (
    <Suspense fallback={<AdminSkeleton variant="list" />}>
      <Conflicts />
    </Suspense>
  )
}
