'use client'

import { faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link'

import { Animate } from '@/components/ui/animate'
import { Separator } from '@/components/ui/separator'
import { contact } from '@/lib/constants/contact'
import { getAppVersion } from '@/lib/utils/app-version'
import { getCommitHash } from '@/lib/utils/commit-hash'

const socials = [
  { icon: faFacebook, href: contact.social.facebook, label: 'Facebook' },
  { icon: faInstagram, href: contact.social.instagram, label: 'Instagram' },
]

export function Footer() {
  const appVersion = getAppVersion()
  const commitHash = getCommitHash()

  return (
    <footer className="bg-muted/50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Animate animation="fade-in">
          <div className="flex flex-col items-center gap-6 text-center">
            <Link href="/" className="font-heading text-2xl font-bold">
              Arbeauté
            </Link>

            <div className="flex gap-5">
              {socials.map(social => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <FontAwesomeIcon icon={social.icon} className="size-4" />
                </Link>
              ))}
            </div>

            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link
                href="#services"
                className="transition-colors hover:text-foreground"
              >
                Prestations
              </Link>
              <Link
                href="#about"
                className="transition-colors hover:text-foreground"
              >
                À propos
              </Link>
              <Link
                href="#contact"
                className="transition-colors hover:text-foreground"
              >
                Contact
              </Link>
              <Link
                href={contact.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Réserver
              </Link>
            </nav>

            <Separator className="w-full max-w-md" />

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                &copy; {new Date().getFullYear()} {contact.name} —{' '}
                {contact.address}
              </p>
              <p>
                Créé par{' '}
                <Link
                  href="https://henchoznoe.ch/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  Noé Henchoz
                </Link>{' '}
                &middot; v{appVersion} &middot; {commitHash}
              </p>
            </div>
          </div>
        </Animate>
      </div>
    </footer>
  )
}
