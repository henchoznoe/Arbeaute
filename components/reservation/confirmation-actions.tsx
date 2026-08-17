'use client'

import {
  CalendarPlus,
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Printer,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  createAppointmentDetails,
  createGoogleCalendarUrl,
} from '@/lib/reservation/confirmation'
import { openCalendar } from './calendar-download'

interface ConfirmationActionsProps {
  appointment: {
    serviceName: string
    dateLabel: string
    startsAt: string
    endsAt: string
    calendar: string
  }
}

type Feedback = { kind: 'success' | 'info'; message: string } | null

const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Certains navigateurs exposent l'API sans autoriser son utilisation.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy unavailable')
}

export const ConfirmationActions = ({
  appointment,
}: Readonly<ConfirmationActionsProps>) => {
  const [calendarFeedback, setCalendarFeedback] = useState<Feedback>(null)
  const [copyFeedback, setCopyFeedback] = useState<Feedback>(null)
  const [printFeedback, setPrintFeedback] = useState<Feedback>(null)
  const details = createAppointmentDetails(appointment)
  const googleCalendarUrl = createGoogleCalendarUrl(appointment)

  const addToCalendar = async () => {
    setCalendarFeedback(null)
    const result = await openCalendar(
      appointment.calendar,
      'rendez-vous-arbeaute.ics',
    )
    if (result === 'SHARED')
      setCalendarFeedback({
        kind: 'success',
        message: 'Le calendrier a été transmis à l’application choisie.',
      })
    else if (result === 'DOWNLOADED')
      setCalendarFeedback({
        kind: 'info',
        message:
          'Le fichier calendrier a été téléchargé. Ouvrez-le depuis vos téléchargements, puis choisissez Calendrier, Outlook ou une autre application compatible.',
      })
  }

  const copyDetails = async () => {
    try {
      await copyText(details)
      setCopyFeedback({
        kind: 'success',
        message: 'Les détails du rendez-vous sont copiés.',
      })
    } catch {
      setCopyFeedback({
        kind: 'info',
        message:
          'La copie automatique est indisponible. Faites une capture de cet écran ou utilisez « Enregistrer en PDF ».',
      })
    }
  }

  const printAppointment = () => {
    try {
      if (typeof window.print === 'function') {
        window.print()
        return
      }
    } catch {
      // Le message ci-dessous guide vers le menu du navigateur.
    }
    setPrintFeedback({
      kind: 'info',
      message:
        'Ouvrez le menu de votre navigateur, puis choisissez « Imprimer » ou « Partager » et « Enregistrer en PDF ».',
    })
  }

  return (
    <section className="mt-6 space-y-3 text-left" data-no-print>
      <h3 className="font-heading text-xl font-bold">Conserver les détails</h3>

      <div className="rounded-2xl border p-4 sm:p-5">
        <p className="flex items-center gap-3 font-semibold">
          <CalendarPlus className="size-5 shrink-0 text-primary" />
          Ajouter au calendrier
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Google Agenda s’ouvre directement. Pour Apple Calendar, Outlook ou une
          autre application, votre téléphone proposera les applications
          compatibles lorsqu’il le peut.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild size="lg">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Agenda
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={addToCalendar}
          >
            <Download className="size-4" />
            Apple, Outlook ou autre
          </Button>
        </div>
        {calendarFeedback ? (
          <p
            className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
            role="status"
          >
            {calendarFeedback.kind === 'success' ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
            ) : null}
            {calendarFeedback.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={copyDetails}
            className="w-full justify-start gap-3 px-2 font-semibold"
          >
            <ClipboardCopy className="size-5 shrink-0 text-primary" />
            Copier les détails
          </Button>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Copie le soin, l’horaire, l’adresse et le téléphone.
          </p>
          {copyFeedback ? (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {copyFeedback.message}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={printAppointment}
            className="w-full justify-start gap-3 px-2 font-semibold"
          >
            <Printer className="size-5 shrink-0 text-primary" />
            Enregistrer en PDF
          </Button>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ouvre l’impression : choisissez « Enregistrer en PDF ».
          </p>
          {printFeedback ? (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {printFeedback.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
