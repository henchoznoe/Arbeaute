import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { contact, hours } from '@/lib/constants/contact'

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium tracking-[0.2em] text-rose-400/80 uppercase">
            Nous trouver
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Contact
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <MapPin className="size-5 text-rose-400" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={contact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {contact.address}
                </Link>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Phone className="size-5 text-rose-400" />
                    Téléphone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`tel:${contact.phoneRaw}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {contact.phone}
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Mail className="size-5 text-rose-400" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`mailto:${contact.email}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {contact.email}
                  </Link>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <Clock className="size-5 text-rose-400" />
                  Horaires d&apos;ouverture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hours.map(({ day, ranges }) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium">{day}</span>
                      <span className="text-muted-foreground">
                        {ranges.length > 0
                          ? ranges.map(r => `${r.start} – ${r.end}`).join(', ')
                          : 'Fermé'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center lg:text-left">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-8 text-base"
              >
                <Link
                  href={contact.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Réserver sur agenda.ch
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-lg">
            <iframe
              src={contact.mapsEmbed}
              width="100%"
              height="100%"
              className="min-h-100 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ar'Beauté — Rue de la Condémine 43A, 1630 Bulle"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
