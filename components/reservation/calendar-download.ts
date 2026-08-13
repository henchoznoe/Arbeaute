const CALENDAR_MIME_TYPE = 'text/calendar;charset=utf-8'

const downloadCalendar = (calendar: string, filename: string): void => {
  const blob = new Blob([calendar], { type: CALENDAR_MIME_TYPE })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

type CalendarOpenResult = 'SHARED' | 'DOWNLOADED' | 'CANCELLED'

export const openCalendar = async (
  calendar: string,
  filename: string,
): Promise<CalendarOpenResult> => {
  const file = new File([calendar], filename, { type: CALENDAR_MIME_TYPE })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Rendez-vous Arbeauté',
        text: 'Ajouter mon rendez-vous Arbeauté au calendrier',
      })
      return 'SHARED'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError')
        return 'CANCELLED'
    }
  }

  downloadCalendar(calendar, filename)
  return 'DOWNLOADED'
}
