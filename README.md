# ViewStay

**Your stay. Your room. Your view.**

ViewStay is a hotel marketplace where travellers choose the *exact physical room* they will stay in. They explore an illustrative 3D model of the building, its 2D floor plan or a plain room list, then hold and book that specific room. Nothing is substituted silently.

> **This is a demo.** All 350 properties are fictional. Imagery and 3D models are generated illustrations and are labelled as such. Payments go through a simulator, the 12% tax is a demo rate, and prices are not live commercial rates.

## What works

| Area | Features |
| --- | --- |
| **Discovery** | Homepage (hero search, destinations, featured stays, room showcases by view and value, FAQ). 35 Indian destinations × 10 properties = 350. Search filters: price, rating, stars, property type, amenities, view, balcony, corner, floor, bed type, size, accessibility and free cancellation. Removable filter chips; mobile bottom sheet; six sort orders; list/map toggle with a clearly labelled *simulated* map. |
| **Property page** | Photo mosaic with a categorised lightbox, amenities, room types, policies, simulated location map, and reviews. A stay editor sits in a sticky card. |
| **Room explorer** | Three modes share one selection: **3D Explore** (procedural model per template: mountain lodge, heritage boutique, city modern, coastal resort, garden retreat; orbit/zoom/pan, presets, whole/cutaway/exploded floors, availability or exterior colours), **2D Floor Plan** (SVG, zoom/pan, legend, patterns as well as colour, keyboard navigation) and **Room List**. Also: room filters, a room detail panel or mobile sheet, a database-backed room photo gallery, an illustrative 3D interior preview, compare up to 3 rooms, rule-based recommendations with stated reasons (no AI), and URL-synced selection. Falls back to the plan without WebGL. |
| **Booking** | Multi-room holds (up to 4 exact rooms, 10 minutes) under per-room advisory locks. Checkout offers Flexible or Non-refundable (−10%) rates, a price breakdown and a hold timer. If the price changes, payment is refused until the guest confirms the new total. Checkout is idempotent per hold group (concurrent duplicates return the same booking). A Postgres exclusion constraint makes double-booking impossible. The app never substitutes a room. |
| **Account** | Register, sign in, password reset (token hashed, 30-minute expiry), profile and password. Bookings in Upcoming, Past and Cancelled tabs. Booking detail, cancellation by policy, reviews after a stay, wishlist, and "stay in this room again" with an availability check and labelled alternatives. |
| **Partner** | Overview analytics, properties, creating a property from a template (pending approval), profile and policies, room-type prices, per-room edits, a **floor-plan editor** (drag, resize, add and remove rooms; live validation; save or discard; 3D preview of the unsaved draft), room photo management (upload with content sniffing, reorder, set cover, delete), an availability calendar with closures, and bookings. |
| **Admin** | Platform overview, approvals, properties (approve, feature, suspend), destinations, users (deactivate), booking search, commission report, audit log, and an email outbox with reset tokens redacted. Every action needs confirmation and is audit-logged. |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Fraunces + Inter · Lucide · three.js / React Three Fiber / drei · Zustand · TanStack Query · React Hook Form + Zod · Recharts · Prisma 6 + PostgreSQL · jose + bcryptjs · Vitest · Playwright.

## How the catalogue is generated

- `src/data/destinations.ts` defines 35 destinations with their views, scenes and price levels.
- `src/lib/layout/templates.ts` builds deterministic floor layouts per template: wings, corridors, lifts, rooms with window, balcony and outlook sides. **The same stored layout drives the 2D plan, the 3D model and each room's photos.**
- `src/lib/media/*` paints illustrative SVG artwork (scenes, interiors, exteriors) on demand at `/media/library/<key>.svg`. It is cached immutably and served with a strict CSP. No external image URLs are used.
- `src/server/seed-data.ts` is idempotent. It seeds 350 hotels, about 11,000 rooms, about 65,000 room-photo rows, demo bookings and reviews. `--reset` wipes the database first.

## Getting started

Requirements: Node 20+ and PostgreSQL 14+ (with the `btree_gist` extension available).

```bash
cp .env.example .env          # DATABASE_URL, AUTH_SECRET
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts        # add --reset to wipe first
npm run dev
```

Optional settings: `HOLD_MINUTES` (default 10), `UPLOAD_DIR` (default `storage/uploads`) and `SEED_ON_EMPTY=1`, which seeds an empty database on first boot (used for the hosted demo).

### Demo accounts (password `Password123!`)

| Email | Role |
| --- | --- |
| `customer@viewstay.dev` | Traveller with upcoming, past and cancelled bookings |
| `guest@viewstay.dev` | Second traveller |
| `partner@viewstay.dev` … `partner8@viewstay.dev` | Property partners |
| `admin@viewstay.dev` | Administrator |

### Test cards

`4242 4242 4242 4242` succeeds; `4000 0000 0000 0002` is declined; `4000 0000 0000 9995` returns insufficient funds. Use any future expiry and any CVC.

## Quality checks

```bash
npm run typecheck && npm run lint
npm test            # Vitest: unit + integration against a dedicated *_test database (reset + seeded per run)
npm run build
npm run test:e2e    # Playwright against `next start` (desktop + Pixel 7)
```

- **Integration tests** cover holds, conflicts, the DB exclusion constraint, idempotent and concurrent checkout, price-change refusal, declined cards, expired holds, multi-room bookings, cancellation rules, rebook alternatives, the room-photo service and HTTP endpoint, layout validation, partner isolation, closures and upload validation.
- **E2E tests** cover the full journey (search → room → sign-in redirect → hold → declined then successful payment → account), 3D ↔ 2D ↔ list selection sync via the `window.__viewstay3d` test hook, the gallery (API, categories, keyboard), compare, role guards, and layouts at 1440, 1280, 1024, 768, 390 and 360 px.

## Known limitations

- Everything listed above under "This is a demo" applies: fictional properties, illustrative imagery and models, simulated payments, and demo prices and tax rate.
- Emails are written to an outbox table, not sent.
- Rate limiting is in memory (per process).
- Uploads use local disk via a small storage adapter. Use object storage for multi-instance hosting.
- In dev mode a hydration-mismatch warning occasionally appears and has not been reproduced on a clean load.
- A missing property renders the not-found page with HTTP 200, not 404, because the loading skeleton streams first. Next adds a `noindex` tag in that case.
- The 3D view needs WebGL. Without it the app shows the floor plan and room list, which have the same rooms and selection.
