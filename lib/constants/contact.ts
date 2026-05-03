export const contact = {
  name: 'Arbeauté',
  owner: 'Arzu Yurdakul',
  address: 'Place du marché 25, 1630 Bulle',
  phone: '+41 79 675 67 66',
  phoneRaw: '+41796756766',
  email: 'info@arbeaute.ch',
  bookingUrl: 'https://arbeaute.agenda.ch',
  website: 'https://arbeaute-bulle.ch',
  mapsUrl: 'https://maps.app.goo.gl/CTmCBxPJNNqZ6wXx5',
  mapsEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3189.9594854233746!2d7.055952776781569!3d46.61949387111656!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478e6263023ba245%3A0x7ff81da403209e73!2sRue%20du%20March%C3%A9%2025%2C%201630%20Bulle!5e1!3m2!1sfr!2sch!4v1777838719042!5m2!1sfr!2sch',
  social: {
    facebook: 'https://www.facebook.com/p/arbeautebulle-100065180371044/',
    instagram: 'https://www.instagram.com/arbeaute.bulle/',
  },
} as const

type TimeRange = { start: string; end: string }

type DaySchedule = {
  day: string
  ranges: TimeRange[]
}

export const hours: DaySchedule[] = [
  {
    day: 'Lundi',
    ranges: [
      { start: '08:00', end: '11:30' },
      { start: '13:30', end: '18:30' },
    ],
  },
  {
    day: 'Mardi',
    ranges: [
      { start: '08:00', end: '11:30' },
      { start: '13:30', end: '18:30' },
    ],
  },
  {
    day: 'Mercredi',
    ranges: [
      { start: '08:00', end: '11:30' },
      { start: '13:30', end: '18:30' },
    ],
  },
  { day: 'Jeudi', ranges: [] },
  { day: 'Vendredi', ranges: [] },
  { day: 'Samedi', ranges: [] },
  { day: 'Dimanche', ranges: [] },
]

export const bio =
  "Je m'appelle Arzu, esthéticienne passionnée résidant à Bulle. J'adore mon travail et je m'efforce d'offrir des soins de qualité à chacun de mes clients. Toujours curieuse et en quête de perfection, je suis régulièrement des formations complémentaires pour rester à la pointe des nouvelles techniques et tendances."
