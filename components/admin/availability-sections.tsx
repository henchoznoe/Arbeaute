'use client'

import { CalendarDays, CalendarRange } from 'lucide-react'
import { type ReactNode, useState } from 'react'

type AvailabilitySection = 'exceptions' | 'weekly'

export const AvailabilitySections = ({
  exceptions,
  weekly,
}: Readonly<{ exceptions: ReactNode; weekly: ReactNode }>) => {
  const [section, setSection] = useState<AvailabilitySection>('exceptions')

  return (
    <>
      <fieldset className="mt-4 grid grid-cols-2 gap-2">
        <legend className="sr-only">Type d’horaires</legend>
        <button
          type="button"
          aria-pressed={section === 'exceptions'}
          onClick={() => setSection('exceptions')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
            section === 'exceptions'
              ? 'border-primary bg-primary/10 text-primary'
              : 'bg-card hover:bg-muted'
          }`}
        >
          <CalendarRange className="size-4" /> Jours particuliers
        </button>
        <button
          type="button"
          aria-pressed={section === 'weekly'}
          onClick={() => setSection('weekly')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
            section === 'weekly'
              ? 'border-primary bg-primary/10 text-primary'
              : 'bg-card hover:bg-muted'
          }`}
        >
          <CalendarDays className="size-4" /> Semaine habituelle
        </button>
      </fieldset>
      <div className="mt-3">
        {section === 'exceptions' ? exceptions : weekly}
      </div>
    </>
  )
}
