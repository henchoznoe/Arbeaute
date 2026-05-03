import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { contact } from '@/lib/constants/contact'
import { services } from '@/lib/constants/services'

export function Services() {
  return (
    <section id="services" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium tracking-[0.2em] text-rose-400/80 uppercase">
            Ce que nous proposons
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Nos prestations
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Découvrez notre gamme complète de soins esthétiques. Consultez nos
            tarifs et réservez directement en ligne.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(service => (
            <Card
              key={service.title}
              className="group border-border/50 bg-card/80 transition-all duration-300 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100/50"
            >
              <CardHeader>
                <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-400 transition-colors group-hover:bg-rose-100">
                  <service.icon className="size-6" />
                </div>
                <CardTitle className="text-lg">{service.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
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
              Voir les tarifs et réserver
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
