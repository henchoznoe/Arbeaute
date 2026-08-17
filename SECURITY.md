# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do NOT open a public issue.**

Instead, send an email to the repository owner or use [GitHub's private vulnerability reporting](https://github.com/henchoznoe/Arbeaute/security/advisories/new).

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 72 hours acknowledging receipt. A fix will be prioritized based on severity.

This site stores appointment data for real clients (names, emails, phone
numbers). Reports touching authentication, the admin console, or customer
identification are treated as highest severity.

## Customer identification is e-mail only — a deliberate trade-off

Since v2, the personal area (`/mes-rendez-vous`) opens with an **e-mail address
alone**. No password, no code, no second factor.

**What someone who knows an address can do:** read that person's appointment
history (name, treatment, dates, prices), move a future appointment, and cancel
it.

**Why it is accepted:**

- Identification previously required the e-mail *and* the exact phone number.
  Real customers were locked out because they had given `079 123 45 67` when
  booking and typed `+41791234567` later. The salon then had to be phoned — which
  is the very thing the personal area exists to avoid.
- No payment method, card, address or health record is stored. The most sensitive
  item is the name of a beauty treatment and a date.
- Nothing is destroyed: a cancellation frees a slot and is visible in the admin
  console, in the activity feed and in the audit log.

**What limits the exposure:**

- The session cookie lasts 15 minutes and carries an opaque record id, never a
  coordinate.
- Identification is rate limited to 10 attempts per IP per 15 minutes
  (`lib/services/rate-limit.ts`), on top of a honeypot field.
- Every mutation re-checks the session, the same origin, and its own rate limit.
- There is no password to steal, reuse or leak, and no account to take over
  permanently: revoking access is a matter of correcting the address, which
  invalidates open sessions through the `customer_identity_version_trigger`
  database trigger.

**What would change this:** storing payments, medical details, or opening the
area to more than one practitioner's clientele. Any of those should bring back a
second factor — a one-time code sent by e-mail is the natural next step, and the
`identityVersion` mechanism is already in place to expire sessions.

## Supported Versions

Only the current `main` branch is supported with security updates.
