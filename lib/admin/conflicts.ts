interface ConflictInterval {
  id: string
  startsAt: Date
  endsAt: Date
  occupiedStartsAt: Date
  occupiedEndsAt: Date
  status: string
}

export interface AppointmentConflict {
  firstId: string
  secondId: string
  startsAt: Date
  endsAt: Date
  buffersOnly: boolean
}

/** Comparaison en UTC : les heures répétées au changement d'heure restent distinctes. */
export const findAppointmentConflicts = (
  appointments: readonly ConflictInterval[],
  now?: Date,
): AppointmentConflict[] => {
  const sorted = appointments
    .filter(a => a.status === 'CONFIRMED')
    .sort(
      (a, b) =>
        a.occupiedStartsAt.getTime() - b.occupiedStartsAt.getTime() ||
        a.id.localeCompare(b.id),
    )
  const conflicts: AppointmentConflict[] = []
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i]
    for (let j = i + 1; j < sorted.length; j++) {
      const second = sorted[j]
      if (second.occupiedStartsAt >= first.occupiedEndsAt) break
      const startsAt = new Date(
        Math.max(
          first.occupiedStartsAt.getTime(),
          second.occupiedStartsAt.getTime(),
        ),
      )
      const endsAt = new Date(
        Math.min(
          first.occupiedEndsAt.getTime(),
          second.occupiedEndsAt.getTime(),
        ),
      )
      if (startsAt >= endsAt || (now && endsAt <= now)) continue
      conflicts.push({
        firstId: first.id,
        secondId: second.id,
        startsAt,
        endsAt,
        buffersOnly:
          first.startsAt >= second.endsAt || second.startsAt >= first.endsAt,
      })
    }
  }
  return conflicts.sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.firstId.localeCompare(b.firstId) ||
      a.secondId.localeCompare(b.secondId),
  )
}

export const groupAppointmentConflicts = (
  conflicts: AppointmentConflict[],
): string[][] => {
  const groups: Set<string>[] = []
  for (const conflict of conflicts) {
    const matching = groups.filter(
      group => group.has(conflict.firstId) || group.has(conflict.secondId),
    )
    const group = new Set([
      conflict.firstId,
      conflict.secondId,
      ...matching.flatMap(group => [...group]),
    ])
    for (const previous of matching) groups.splice(groups.indexOf(previous), 1)
    groups.push(group)
  }
  return groups
    .sort(
      (a, b) =>
        conflicts.findIndex(c => a.has(c.firstId)) -
        conflicts.findIndex(c => b.has(c.firstId)),
    )
    .map(group => [...group])
}
