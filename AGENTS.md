# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Copilot, Cursor, etc.) when working with this repository.

`CLAUDE.md` is a symlink to this file.

## Fast Start

- Website and booking system for **Arbeauté**, a beauty salon in Bulle
  (Switzerland). Single Next.js 16 App Router app, TypeScript strict, deployed
  on Vercel (Hobby plan — cost matters, see [Cache Components](#cache-components-is-enabled)).
- Two audiences: the **public site** (`/`, `/reservation`, `/mes-rendez-vous`)
  and the **admin console** (`/admin/*`) used by the owner.
- All user-facing copy is in **French (fr-CH)**, and so are the code comments.
  Match that when adding anything.
- Boundaries:
  - `app/` — routes; `app/admin/` is gated by `proxy.ts`
  - `components/sections/` — public landing sections; `components/reservation/` —
    booking wizard and customer cards; `components/admin/` — admin forms;
    `components/ui/` — shadcn primitives; `components/pwa/` — install banner + SW
  - `lib/actions/` — Server Actions (mutations, all origin- and session-checked)
  - `lib/catalog/`, `lib/reservation/`, `lib/admin/` — domain logic
  - `lib/core/` — infrastructure (env, prisma, sessions)
  - `lib/config/` — site metadata, SEO, PWA manifests
  - `prisma/` — schema, migrations, seed and `verify-*` scripts
  - `proxy.ts` — Next middleware (admin route protection)

## Commands

```bash
pnpm db:up          # start local Postgres (docker, port 5434) — required before dev
pnpm dev            # Next dev server on :3000
pnpm check:com      # the full gate: prisma generate + biome + knip + tsc + vitest + build
```

Individual steps:

```bash
pnpm check          # biome check --write (format + lint + organize imports)
pnpm knip           # dead-code / unused-export analysis (CI-blocking)
pnpm exec tsc --noEmit
pnpm test           # vitest run
pnpm exec vitest run tests/reservation/availability.test.ts   # a single file
pnpm exec vitest run -t 'next open day'                        # a single test by name
```

Database:

```bash
pnpm db:migrate     # create + apply a migration in dev
pnpm db:seed        # seed catalogue and availability
pnpm db:reset       # drop and rebuild
pnpm db:studio
pnpm db:verify-concurrency   # scripted checks against the local DB
pnpm db:verify-rate-limit
```

Prisma reads `.env.local` through `prisma.config.ts` and uses
`DATABASE_URL_UNPOOLED` for migrations. Tests need no database: `vitest.config.ts`
injects fake env vars, and every test mocks the Prisma client.

CI runs exactly the `check:com` steps. `main` is released by semantic-release, so
**PR titles must follow Conventional Commits** (`feat`, `fix`, `chore`, `ci`,
`docs`, `refactor`, `test`, `perf`). `develop` is the working branch.

### No end-to-end tests — do not add any

**Vitest unit tests are the only automated suite.** Do not add Playwright,
Cypress, WebdriverIO, Puppeteer, a headless browser, a driven browser, or
reference screenshots. Do not add an `e2e` script, an `e2e` workflow step, or a
throwaway database for testing.

A Playwright recipe existed and was removed. On a single-practitioner salon it
cost a browser to install in CI, an ephemeral PostgreSQL, reference screenshots
to regenerate and two CI steps — and its screenshots went stale on the very
first typography change, before catching a single real regression. The
maintenance outweighed the benefit.

What replaces it:

- `vitest run` for every piece of domain logic, with Prisma mocked;
- `scripts/verify-build-quality.ts`, called by `pnpm build`, which reads the
  `next build` output and fails when a public route stops being prerendered or
  when a JavaScript or image budget is exceeded;
- manual checks in the browser during development.

If a regression escapes, add a unit test on the function responsible — not a
browser.

## Architecture

### Cache Components is enabled

`cacheComponents: true` in `next.config.ts`. This is the most important thing to
know before touching any route:

- Every route **must produce a static shell**, or the build fails.
- Nothing is cached unless marked `'use cache'`. Route segment configs
  (`dynamic`, `revalidate`, `fetchCache`, `dynamicParams`) are rejected.
- Any uncached DB read, runtime API (`cookies()`, `headers()`, `searchParams`,
  `params`) or `new Date()` reached during prerender must sit inside `'use cache'`
  or behind a `<Suspense>` boundary.
- `next build` prints which routes are `○ Static`, `◐ Partial Prerender` and
  `ƒ Dynamic`. Treat a route slipping to `ƒ` as a regression — the whole point is
  that public pages are served from the CDN without a function invocation
  (the project runs on a Vercel **Hobby** plan).

Cached data is centralised and tagged, then invalidated from server actions with
`updateTag`:

| Data | Module | Tag | Invalidated by |
|---|---|---|---|
| Service catalogue | `lib/catalog/queries.ts` | `CATALOG_TAG` | `refreshCatalog()` in `lib/actions/catalog.ts` |
| Opening hours | `lib/reservation/opening-hours.ts` | `OPENING_HOURS_TAG` | `refreshAvailability()` in `lib/actions/admin-agenda.ts` |
| Booking rules | `lib/reservation/booking-settings.ts` | `BOOKING_SETTINGS_TAG` | `saveBookingSettings()` in `lib/actions/admin-booking-settings.ts` |
| Booking date bounds | `lib/reservation/booking-window.ts` | `BOOKING_SETTINGS_TAG` (`cacheLife('hours')`) | settings or time |

Availability **slots are never cached** — stale slots would cause double bookings.

### Availability engine (`lib/reservation/availability.ts`)

The hot path of the app. Structured so any number of days costs the same four
queries:

- `loadAvailabilityWindow()` — the only function that touches the database
  (service timings, weekly availability, exceptions, appointments over the range
  with a ±24 h margin for preparation/cleanup spilling across days).
- `computeSlotsForDay()` — pure; merges openings, subtracts blocked intervals,
  walks the day using the configured slot interval. Unit-testable without a DB.
- Public entry points: `getAvailableSlots` (one day), `getAvailableSlotsByDate`
  (a range, used by the booking calendar to load a whole week at once) and
  `findNextAvailableSlot` (scans up to 100 days in memory).

Keep new features on top of `computeSlotsForDay` rather than adding queries per
day. `tests/reservation/availability.test.ts` asserts the range and single-day
paths agree — that test is the guard rail.

### Booking concurrency (`lib/reservation/appointments.ts`)

Two layers, both required:

1. Serializable transactions retried up to `MAX_SERIALIZABLE_ATTEMPTS` on
   Postgres serialization failures (Prisma `P2034`).
2. A GIST exclusion constraint `appointment_no_confirmed_overlap` on
   `tstzrange(occupiedStartsAt, occupiedEndsAt)` where `status = 'CONFIRMED'` —
   the last-resort guard. `occupiedStartsAt/EndsAt` widen the appointment by its
   preparation and cleanup buffers and **must be kept in sync** whenever
   `startsAt` changes.

Appointments snapshot the service name, price and duration so past bookings stay
accurate after a catalogue edit.

### Time handling (`lib/reservation/time.ts`)

Everything is anchored to `RESERVATION_TIME_ZONE` (`Europe/Zurich`), never the
visitor's zone. Dates are passed around as **date keys** (`'YYYY-MM-DD'` strings)
and converted with `localDateMinuteToUtc` / `getLocalDayBounds`. The customer
change deadline is counted in *business* hours (weekends skipped) by
`getCustomerChangeDeadline`.

### Booking settings

The singleton `BookingSettings` row is the source of truth for **six** settings:
`minBookingNoticeHours`, `bookingHorizonMonths`, `customerChangeCutoffHours`,
`slotIntervalMinutes`, and — added by late booking phase 1 —
`lateRequestsEnabled` and `lateRequestFloorHours`. Public reads go through the
tagged cache in `lib/reservation/booking-settings.ts`; the admin mutation updates
the row and audit event in one transaction, then invalidates every public view.

### Last-minute requests (`lib/reservation/late-requests.ts`)

When `lateRequestsEnabled` is on, an hour that is still free but too close to be
booked online is not hidden any more: it is offered `ON_REQUEST`, and someone can
ask for it. `lateRequestFloorHours` is the absolute floor below which no hour
shows at all, on request or otherwise — Arzu is with a client and does not read
her mail.

- **A request is not an appointment.** It lives in its own `AppointmentRequest`
  table so that nothing — agenda, weekly digest, exports, metrics — has to filter
  it out. It is therefore **outside** the `appointment_no_confirmed_overlap`
  exclusion constraint: two people may request the same hour, and it is the
  acceptance that arbitrates. The constraint then protects the appointment write
  itself.
- **Statuses** are `PENDING`, `ACCEPTED`, `DECLINED`, `WITHDRAWN`. A fifth state
  — expired — is **deduced at read time** by `isLateRequestExpired` (pending, and
  the requested hour has passed). **No job sweeps expired requests**: the only
  cron slot the Hobby plan gives is already taken by the Sunday digest, and a
  comparison is enough.
- **Two limits.** `checkRateLimit` allows **three requests per 24 hours**, keyed
  by IP *and* by e-mail address (`lib/actions/late-requests.ts`); on top of that,
  a customer may have at most **two pending requests**
  (`MAX_PENDING_REQUESTS_PER_CUSTOMER`).
- **Three e-mails**, all queued like the others and none of them resendable:
  `LATE_REQUEST_SUBMITTED` warns Arzu, `LATE_REQUEST_RECEIVED` acknowledges to
  the person that it is *not yet* an appointment, `LATE_REQUEST_DECLINED` closes
  it. Their bodies depend on the request rather than on an appointment, which is
  why `/admin/emails` cannot rebuild them — see `isResendableKind`.
- **`/admin/demandes`** is where Arzu answers. Pending requests come first,
  decided and expired ones below. Accepting writes the appointment through the
  ordinary serializable path, so all the booking guarantees still apply.

### Auth and access control

- Two independent HMAC-signed cookie sessions (`lib/core/session.ts`,
  `lib/core/session-cookies.ts`): `admin` (30 days, single shared password) and
  `customer` (15 min, subject = the customer record id, so no PII in the cookie).
- **Customers are identified by e-mail alone.** `Customer.emailNormalized` is
  unique — one address, one person — which is what makes the booking `upsert`
  atomic under concurrency. `identityVersion` is bumped by the
  `customer_identity_version_trigger` database trigger whenever the address or
  phone changes, which expires open sessions even for edits made in SQL. The
  security trade-off is documented in `SECURITY.md`; before the change,
  identification required the exact phone number too and locked real customers
  out. **There is no duplicate-merge screen any more**: one address is one
  person, so the admin console has nothing to reconcile. The `MERGED` audit
  action survives in the enum for the rows written before the unique index —
  dropping an enum value would be a destructive migration.
- **Schema changes ship in two steps when they remove something.** The Vercel
  build runs `prisma migrate deploy` *before* the new code serves traffic, so a
  migration that drops a column the live code still writes breaks bookings for
  the length of the deployment. Add and backfill in one release, remove in the
  next — see the record in `docs/data-operations.md`. This rule survives the
  database split below: production still migrates itself before serving.
- **One database per environment.** The Neon `main` branch is scoped to
  *Production* in Vercel; a separate Neon database is scoped to *Preview*. Every
  deployment migrates its own database, which is why `build` is an ordinary
  `prisma generate && prisma migrate deploy && next build` again — a preview can
  no longer touch real bookings, and no code has to tolerate a missing table.
  **The seed is deliberately not part of `build`**, unlike some sibling
  projects: `prisma/seed.ts` upserts with a full `update`, so running it on
  production would overwrite edited prices and descriptions, force
  `preparationMinutes`/`cleanupMinutes` back to 0 and un-archive archived
  services. Seed a fresh preview database once, by hand.
- `proxy.ts` (Next middleware) gates every `/admin/*` path except those listed in
  `PUBLIC_ADMIN_PATHS` — currently the login page and the admin PWA manifest,
  which browsers fetch without cookies.
- Server actions that mutate re-check the session *and* `hasSameOrigin()`
  (`lib/utils/request.ts`) as CSRF defence.
- Sensitive actions go through `checkRateLimit` (`lib/services/rate-limit.ts`),
  a DB-backed fixed-window counter keyed by an HMAC of the IP or identity.

### Transactional emails

`lib/email/` sends through Resend over plain `fetch` — no SDK, the project
counts its kilobytes. The layering matters:

- `templates.ts` is pure (subject, text, HTML) and unit-tested;
- `client.ts` only knows the envelope, with a ten-second timeout;
- `send.ts` writes one `EmailDelivery` row per attempt and **never throws**;
- `notifications.ts` queues the send with `after()`, so a booking never waits
  on Resend and a Resend outage cannot fail a reservation.

`RESEND_API_KEY`, `RESEND_FROM` and `ADMIN_NOTIFICATION_EMAIL` are **optional**
in `lib/core/env.ts`: without them the app behaves exactly as before, silently
sending nothing. Free-tier limits (100/day, 3000/month) are
counted from successful sends and surfaced at `/admin/emails`, where a failed
message can be resent — its body is rebuilt from the appointment rather than
stored.

**Eight templates exist** in `lib/email/templates.ts`. Four are triggered by a
booking — confirmation, series confirmation, reschedule, cancellation — three by
a last-minute request (see below), and one by the clock: Arzu's weekly summary,
sent Sunday evening by the single cron in `vercel.json`. The day-before reminder
and the nightly digest were removed in v3: the owner does not want a daily
message.
`APPOINTMENT_REMINDER` and `DAILY_DIGEST` remain in the `EmailKind` enum because
past `EmailDelivery` rows carry them and dropping an enum value would be a
destructive migration; `emailKindLabels` still translates them so the history
reads in French, but `isResendableKind` excludes them — no template can rebuild
them any more. The three `LATE_REQUEST_*` kinds are excluded too, for a
different reason: their body depends on the request, not on an appointment, so
`/admin/emails` cannot rebuild them either. Only the three `BOOKING_*` kinds are
resendable.

**Cron schedules are UTC and ignore daylight saving.** `0 18 * * 0` fires at
20:00 in Bulle in summer and 19:00 in winter, and Hobby triggers within the hour
rather than to the minute — so nothing in `runWeeklyDigest` depends on an exact
time: the covered week comes from local date keys, never from "the last 168
hours". Vercel injects `CRON_SECRET` only while a cron is declared in
`vercel.json`; without it the route answers 503 rather than running
unauthenticated.

**A blank optional env var means "absent".** `lib/core/env.ts` wraps optional
variables in a helper mapping `''` to `undefined`: `.optional()` alone only
covers a *missing* variable, so `CRON_SECRET=""` in a `.env.local` used to fail
`.min(16)` and break the build.

### PWA

Two separately installable apps, defined in `lib/config/pwa.ts` and served by
route handlers at `/manifest.webmanifest` and `/admin/manifest.webmanifest`.
They differ by `id` / `start_url` / `scope` (`/` vs `/admin`), which is what lets
both live on the same home screen; `app/admin/layout.tsx` swaps the
`<link rel="manifest">` for admin routes. `public/sw.js` is a deliberately
content-free service worker whose only jobs are satisfying Chrome's
installability criteria and serving `/offline`.

### Environment

`lib/core/env.ts` validates all env vars with Zod at import time and throws on
startup if anything is missing — add new variables there and to `.env.example`.

## Conventions

- Biome formats and lints: no semicolons, single quotes, no parens on single
  arrow params, trailing commas. Run `pnpm check` rather than hand-formatting.
- **knip is CI-blocking**: don't export something that nothing imports. Helpers
  used only inside their module stay module-private.
- Prisma client is generated to `prisma/generated/prisma` (import from
  `@/prisma/generated/prisma/client`), not from `@prisma/client`.
- Comments explain *why*, in French, and are used sparingly on non-obvious
  decisions (caching choices, concurrency, timezone rules). Follow that density.
- **User-facing wording follows [docs/vocabulaire.md](docs/vocabulaire.md).**
  Neither the owner nor her clients have ever administered a website, so no
  screen may expose the data model's vocabulary. Check the banned-terms table
  before writing a label, a setting description or an error message.
