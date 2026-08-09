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
| Booking date bounds | `lib/reservation/booking-window.ts` | — (`cacheLife('hours')`) | time only |

Availability **slots are never cached** — stale slots would cause double bookings.

### Availability engine (`lib/reservation/availability.ts`)

The hot path of the app. Structured so any number of days costs the same four
queries:

- `loadAvailabilityWindow()` — the only function that touches the database
  (service timings, weekly availability, exceptions, appointments over the range
  with a ±24 h margin for preparation/cleanup spilling across days).
- `computeSlotsForDay()` — pure; merges openings, subtracts blocked intervals,
  walks the day in `SLOT_INTERVAL_MINUTES` steps. Unit-testable without a DB.
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

### Auth and access control

- Two independent HMAC-signed cookie sessions (`lib/core/session.ts`,
  `lib/core/session-cookies.ts`): `admin` (30 days, single shared password) and
  `customer` (15 min, subject = an HMAC digest of email + phone, so no PII in the
  cookie).
- `proxy.ts` (Next middleware) gates every `/admin/*` path except those listed in
  `PUBLIC_ADMIN_PATHS` — currently the login page and the admin PWA manifest,
  which browsers fetch without cookies.
- Server actions that mutate re-check the session *and* `hasSameOrigin()`
  (`lib/utils/request.ts`) as CSRF defence.
- Sensitive actions go through `checkRateLimit` (`lib/services/rate-limit.ts`),
  a DB-backed fixed-window counter keyed by an HMAC of the IP or identity.

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
