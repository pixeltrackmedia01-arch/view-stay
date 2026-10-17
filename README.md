# ViewStay

**Choose your room, not just your room category.**

ViewStay is a hotel booking marketplace where travellers pick the *exact physical room* on a floor map, much like picking a seat on an airline seat map. They can choose the sea-facing corner room on floor 4, the balcony room away from the lift, or the same room they stayed in last time.

## What works

End-to-end journey (covered by an automated browser test):

> Destination search → hotel results → hotel details → floor map → exact room selection → 10-minute room hold → guest details → dummy payment → confirmation → My Bookings → rebook the same room

The same booking then shows up in the customer account, the partner dashboard and the admin console.

| Area | Features |
| --- | --- |
| **Traveller** | Search by destination, dates and guests. Filter by view, balcony and star rating; sort by price, rating or view score. Interactive floor map with live availability (refreshes every 15 s) and a map/list toggle. Room filters: view, balcony, corner, away from lift, accessible, verified view. Room panel shows view score, features and per-room pricing. Checkout has a hold countdown. Bookings can be cancelled (refunded), rebooked in one click and reviewed after the stay. There is also a wishlist. |
| **Inventory** | Room holds lock a room for one user for `HOLD_MINUTES`. Per-room PostgreSQL advisory locks serialise concurrent hold and checkout attempts. A Postgres **exclusion constraint** makes overlapping active bookings for the same room impossible, even when application checks are bypassed. Stays are half-open intervals, so back-to-back stays are allowed. |
| **Pricing** | Room-type base price plus a per-room premium or discount, +15% on Friday and Saturday nights, and 12% tax. Amounts are stored in paise and rounded to whole rupees. |
| **Partner** | KPIs (revenue, active bookings, 30-day occupancy) and a revenue chart. Room inventory editor covering status, price adjustment, view type/score/verification, balcony, corner, accessibility, windows and notes. Date blocks for maintenance, refused when they clash with a booking. Bookings list with filters and cancellation. An "add property" flow generates floors, a corridor, lift and stairs, and numbered rooms. New properties wait for admin approval. |
| **Admin** | Marketplace KPIs and GMV chart, approve or suspend hotels, activate or deactivate users, search all bookings, and an audit trail. |
| **Auth** | Email and password (bcrypt). Signed, httpOnly JWT session cookie. Roles: `CUSTOMER`, `PARTNER`, `ADMIN`. Middleware guards pages, and every API route re-checks the user and role against the database. |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Lucide icons · React Hook Form + Zod · TanStack Query · Recharts · Prisma 6 + PostgreSQL · jose + bcryptjs · Vitest · Playwright.

UI primitives (button, inputs, card, badge) are small accessible components in `src/components/ui`, written in the shadcn style.

## Getting started

Requirements: Node 20+ and PostgreSQL 14+ (the `btree_gist` extension must be available; it ships with Postgres).

```bash
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy     # create schema
npm run db:seed               # demo data (wipes existing rows)
npm run dev                   # http://localhost:3000
```

### Demo accounts

The password for every account is `Password123!`.

| Email | Role |
| --- | --- |
| `customer@viewstay.dev` | Traveller with past, upcoming and cancelled bookings |
| `guest@viewstay.dev` | Second traveller |
| `partner@viewstay.dev` | Owns Azure Bay (Goa), Pinecrest (Manali), Marine Crown (Mumbai) |
| `partner2@viewstay.dev` | Owns Udaipur and Munnar hotels, plus a *pending* Jaipur hotel |
| `admin@viewstay.dev` | Super administrator |

### Dummy payment cards

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined (the room stays held, so you can retry) |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry (MM/YY) and any 3-digit CVC. No real payment provider is involved. The gateway is a local adapter in `src/server/payments.ts`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit + integration tests (Vitest). Uses `TEST_DATABASE_URL`, default `postgresql://postgres:postgres@localhost:5432/viewstay_test`. Migrates and re-seeds that database. |
| `npm run test:e2e` | Playwright browser tests against `next start` (run `npm run build` first; uses the `DATABASE_URL` database) |
| `npm run db:migrate` / `db:seed` | Apply migrations / load demo data |

## Project layout

```
prisma/              schema, migrations (incl. exclusion constraint), seed entry
src/app/             pages (App Router) and REST API route handlers under app/api
src/components/      UI: room map, checkout, dashboards, forms
src/lib/             db client, auth/session, validation (Zod), pricing, dates, API helpers
src/server/          domain services: availability, holds, bookings, payments, search, partner, admin, seed data
tests/unit           pricing, dates/validation, payment gateway
tests/integration    holds, booking, concurrency, cancellation, partner inventory, search (real Postgres)
tests/e2e            full customer journey + smoke tests (Playwright)
```

### API

| Method & path | Who | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` | anyone | Session management |
| `GET /api/hotels?city&checkIn&checkOut&guests&view&balcony&minStars&sort` | anyone | Search |
| `GET /api/hotels/:slug/rooms?checkIn&checkOut&guests` | anyone | Floor plans with per-room live status and pricing |
| `POST /api/holds`, `DELETE /api/holds/:id` | signed in | Hold or release a specific room |
| `POST /api/bookings` (`holdId`, `guest`, `card`), `GET /api/bookings` | signed in | Checkout / my bookings |
| `POST /api/bookings/:code/cancel` · `review` | owner / partner / admin | Cancel (refund) / review a completed stay |
| `POST`/`DELETE /api/wishlist/:hotelId` | signed in | Wishlist |
| `PATCH /api/partner/rooms/:id`, `POST /api/partner/rooms/:id/blocks`, `DELETE /api/partner/blocks/:id`, `POST /api/partner/hotels` | partner (own hotels) / admin | Inventory |
| `PATCH /api/admin/hotels/:id` · `users/:id` | admin | Moderation |
| `GET /api/health` | anyone | Liveness + DB check |

Errors use the shape `{ error: { code, message, fields? } }` with matching HTTP status codes (400/401/403/404/409/410/402).

## Deployment notes

* Set `DATABASE_URL`, `AUTH_SECRET` (32+ random chars) and optionally `HOLD_MINUTES`.
* `SEED_ON_EMPTY=1` loads demo data at server start, but only when the database has no users. This is useful for hosted demos.
* The hosted demo runs on Hostinger Node.js hosting with a Supabase Postgres database. Its tables live in a private `viewstay` schema that is not exposed through Supabase's REST API, and the app connects as a dedicated least-privilege role (`DATABASE_URL=...?schema=viewstay`).

## Assumptions and MVP limits

* Single currency (INR); taxes are a flat 12%; free cancellation until the day before check-in.
* Hotel imagery is generated, with illustrative gradient covers, so the MVP has no external image dependency.
* Payments, emails and SMS are not connected to real providers. The payment gateway is a deterministic local adapter, and confirmation is shown on screen and recorded.
* Expired holds are ignored by every availability query and cleaned up lazily, so no background worker is needed.
* Stays whose check-out date has passed are marked `COMPLETED` lazily when dashboards load.
* `npm audit` reports advisories in transitive dependencies (Next's bundled `postcss`, `sharp`) that the current Next 15 line does not yet patch. None of them affect runtime request handling in this app.
