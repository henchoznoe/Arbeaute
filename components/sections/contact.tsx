import {
  CalendarCheck,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import Link from 'next/link'

import { Animate } from '@/components/ui/animate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { contact } from '@/lib/constants/contact'
import { getOpeningHours } from '@/lib/reservation/opening-hours'

export async function Contact() {
  const hours = await getOpeningHours()

  return (
    <section id="contact" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Animate>
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium tracking-[0.2em] text-brand uppercase">
              Nous trouver
            </p>
            <h2 className="font-heading text-title font-bold">Contact</h2>
          </div>
        </Animate>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Animate animation="fade-left" delay={100}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <MapPin className="size-5 text-brand" />
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
                  <p className="mt-4 flex items-start gap-2 rounded-lg border border-brand-line bg-brand-subtle p-3 text-sm font-medium text-brand-strong">
                    <CalendarCheck className="mt-0.5 size-4 shrink-0" />
                    Uniquement sur rendez-vous : merci de réserver en ligne ou
                    par téléphone, aucune visite à l’improviste n’est possible.
                  </p>
                </CardContent>
              </Card>
            </Animate>

            <Animate animation="fade-left" delay={200}>
              <div className="grid gap-6 sm:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base">
                      <Phone className="size-5 text-brand" />
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
                      <Mail className="size-5 text-brand" />
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
            </Animate>

            <Animate animation="fade-left" delay={300}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <Clock className="size-5 text-brand" />
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
                            ? ranges
                                .map(r => `${r.start} – ${r.end}`)
                                .join(', ')
                            : 'Fermé'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Animate>

            <Animate animation="fade-up" delay={400}>
              <div
                data-primary-booking-cta
                className="text-center lg:text-left"
              >
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full px-8 text-base"
                >
                  <Link href={contact.bookingUrl}>Réserver en ligne</Link>
                </Button>
              </div>
            </Animate>
          </div>

          <Animate animation="fade-right" delay={200}>
            <Link
              href={contact.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-2xl border bg-[linear-gradient(90deg,transparent_24%,rgba(146,123,89,0.08)_25%,rgba(146,123,89,0.08)_26%,transparent_27%,transparent_74%,rgba(146,123,89,0.08)_75%,rgba(146,123,89,0.08)_76%,transparent_77%),linear-gradient(0deg,transparent_24%,rgba(146,123,89,0.08)_25%,rgba(146,123,89,0.08)_26%,transparent_27%,transparent_74%,rgba(146,123,89,0.08)_75%,rgba(146,123,89,0.08)_76%,transparent_77%)] bg-[length:48px_48px] shadow-sm lg:hidden"
            >
              <span className="rounded-2xl border bg-card/95 p-5 text-center shadow-lg backdrop-blur-sm">
                <MapPin className="mx-auto size-8 text-brand" />
                <span className="mt-3 block font-heading text-lg font-bold">
                  Place du marché 25
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  1630 Bulle
                </span>
                <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
                  Ouvrir dans Maps <ExternalLink className="size-4" />
                </span>
              </span>
            </Link>
            <div className="hidden h-full overflow-hidden rounded-2xl shadow-lg lg:block">
              <iframe
                src={contact.mapsEmbed}
                width="100%"
                height="100%"
                className="min-h-100 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Arbeauté — Place du marché 25, 1630 Bulle"
              />
            </div>
          </Animate>
        </div>
      </div>
    </section>
  )
}
