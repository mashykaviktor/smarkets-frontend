# Smarkets Frontend

A Next.js exchange frontend backed by the real Smarkets API, with event and
market browsing, event detail pages, regularly refreshed prices, and
authentication.

> Originally developed as a frontend engineering take-home exercise, with the
> implementation optimized for a focused six-hour scope. See
> [`docs/implementation-plan.md §11`](docs/implementation-plan.md) and
> [Known limitations](#known-limitations) below for what was deliberately
> left out and why.

## Overview

The app renders a homepage of live events and markets, an event detail page
with every market and contract, and login — all backed by the real Smarkets
API rather than fixtures. It works fully logged out (quotes are delayed, not
gated); logging in upgrades to live prices. Prices refresh on a polling
cycle, and the UI makes an explicit distinction between "no liquidity" and
"loading" instead of collapsing both into a blank state.

## Engineering highlights

- **Next.js as a load-bearing BFF**, not a default framework choice — the
  Smarkets API sends no `Access-Control-Allow-Origin` header (verified
  live), so the browser cannot call it directly. Route handlers under
  `/api/smarkets/*` are the only thing making this work same-origin.
- **Server-only credential handling** — the Smarkets session token lives in
  an httpOnly cookie and is attached to upstream requests entirely inside
  `server/smarkets/`, which is marked `server-only` and never bundled to the
  client.
- **Real API integration, verified live** — architecture decisions (auth
  gating, query param encoding, pagination caps) were checked against the
  running Smarkets API during planning, not assumed from docs alone. See
  [Research & API verification](#research--api-verification).
- **TanStack Query** for all server state — caching, polling
  (`refetchInterval`), and retry/error lifecycle, with no client-only global
  store since there's no meaningful client state to justify one.
- **Typed domain models with adapters at the boundary** — `features/*/adapters.ts`
  are the only code that converts Smarkets wire shapes (basis-point prices,
  snake_case fields, `bids`/`offers`) into the UI-facing domain model in
  `domain/`. Raw API shapes do not reach components.
- **Strict TypeScript, no `any`** across the API → domain → UI boundary.
- **Polling strategy isolated behind one hook** (`usePriceRefresh`) so a
  future WebSocket transport would touch one file, not every price-consuming
  component.
- **Accessible, semantic UI** — real buttons/links, labelled price controls
  (`aria-label`s like "Back"/"Lay"), a throttled `aria-live` region for price
  updates, and RTL-style tests that query by role/label.
- **Vitest + React Testing Library** for unit/component coverage, and
  **Playwright** for end-to-end flows against a real running app.

## Architecture

The Smarkets API sends no `Access-Control-Allow-Origin` header (verified
live), so the browser cannot call `api.smarkets.com` directly:

```
Browser (client components)
   │  same-origin fetch, no CORS, no token in JS
   ▼
Next.js Route Handlers  /api/smarkets/*
   │  attaches Session-Token from an httpOnly cookie, if present
   ▼
server/smarkets/{client,endpoints}.ts  (server-only)
   ▼
api.smarkets.com
```

Layering is one-directional: **route handler → Smarkets client
(`server/smarkets/`) → adapter (`features/*/adapters.ts`) → domain model
(`domain/`) → query hook (`features/*/queries.ts`) → component.** Raw
Smarkets shapes (basis-point prices, snake_case fields, the `bids`/`offers`
book) never reach a component; adapters are the only code that converts
between the wire format and the UI-facing domain model, and they're the most
heavily tested part of the codebase for exactly that reason.

```
src/
  server/smarkets/    fetch client, typed+chunked endpoints, error mapping,
                       session cookie (server-only, never bundled to the client)
  domain/              price.ts (basis points -> decimal odds), models.ts
  features/
    home/ events/ markets/ prices/ auth/
                       adapters.ts, queries.ts (TanStack Query), components/
  components/ui/       Card, Badge, Skeleton, ErrorState, EmptyState, Section
  app/                 pages + /api/smarkets/* route handlers
```

## Key engineering decisions

- **Price normalization.** Smarkets prices are percentage basis points
  (1–9999), not decimal odds — `domain/price.ts` is the only place that
  converts (`10000 / priceBp`), never rounds before dividing, and returns
  `null` outside the valid range rather than `Infinity`/a clamped value.
  Best back = **lowest** `offers` price, best lay = **highest** `bids`
  price — verified by overround on a real book (summed best offers ≈126.8%,
  summed best bids ≈97.4%), not assumed from the `side` naming, which is the
  single easiest thing to get backwards here.
- **Missing liquidity is a primary state, not an edge case.** ~39% of
  contracts in the verified sample had no liquidity at all. Empty
  `bids`/`offers` and a contract with no quote entry both resolve to
  `hasPrice: false`, rendered as a disabled "—", never `NaN`/blank.
- **Available amount, not "stake".** Each price button shows a small GBP
  figure next to the odds (`£245`), derived from the `quantity`/`price`
  conversion documented by the API (`quantity * priceBp / 100_000_000`) and
  applied the same way to both `bids` and `offers` ticks. It's presented as
  available level depth, not the user's own stake or liability — it's
  labelled "available" (in the button's `aria-label`), not "stake". The
  spec's separate `/v3/markets/{ids}/volumes/` endpoint treats "back stake"
  and "liability" as two distinct, summed quantities, so no claim is made
  here about which side bears what financial risk.
- **The join direction matters.** Quotes can include keys for contracts
  absent from the contracts endpoint (verified: 208 quote keys vs 133
  contracts for the same 19 markets). `toContractPrices` iterates contracts
  and looks up quotes by id — never the reverse — so an orphaned quote key
  can't surface as a nameless row.
- **Batching, not fan-out.** Every list endpoint chunks its id list against
  the verified caps (events 300, markets 50, contracts 100, quotes 200) and
  fans out with `Promise.all`; a homepage load costs **5 upstream calls (6
  when any category node needs resolving)** — never one per event or
  market, and never more regardless of how many ids get chunked within a
  stage.
- **Query-array params are repeated keys, not comma-joined.** Comma-joining
  `parent_id=a,b` is a verified hard 400 (`REQUEST_VALIDATION_ERROR`) on this
  API; a single `buildQuery` helper owns the distinction so it can't be
  gotten wrong per call site (path id lists stay comma-joined, which is a
  separate, correct convention for that position).
- **Auth via httpOnly cookie.** The session token lives only in an httpOnly,
  `SameSite=Lax` cookie, never in client JS. `secure` is
  environment-conditional — hard-coding `true` would silently break login on
  plain `http://localhost` (the browser drops a Secure cookie over HTTP with
  no visible error). The app is fully usable logged out, since quotes turned
  out not to be auth-gated (see below) — login is a price-quality upgrade,
  not a gate.
- **Polling, not a socket.** `refetchInterval: 5s` on a single quotes query
  per page (chunked, never per-market), backing off to 30s and surfacing a
  quiet notice on a `429`. A shared, visually-hidden `aria-live="polite"`
  region (`PriceUpdateAnnouncer`) announces "Prices updated" once per
  successful poll — throttled to that same 5s/30s cadence, not one
  announcement per contract.

## Testing

Vitest + React Testing Library, 59 tests, prioritized by risk:

1. `tests/domain/price.test.ts` — the conversion math, boundary ticks, invalid
   range handling.
2. `tests/features/prices/adapters.test.ts` — best-back/best-lay direction against
   a real recorded order book, the join-by-contract-id invariant.
3. `tests/features/home/adapters.test.ts` — category-node resolution, non-bettable
   exclusion.
4. `tests/features/markets/adapters.test.ts` — live-price merge over structural
   data.
5. `tests/server/endpoints.test.ts` — repeated-key query serialization, chunk
   sizes against the verified caps.
6. `tests/server/client.test.ts` / `tests/server/errors.test.ts` — HTTP status → error
   mapping (400/401/404/500), non-JSON error bodies, network failures
   (status `0`), the 204 short-circuit, the Authorization header.
7. Component tests — `ContractRow` (odds rendering, "—" state, extreme valid
   ticks, the "available" amount on both back and lay), `EventCard` (links
   to the right event), `ErrorState` (retry fires), `LoginForm` (server
   error surfaces, success navigates), the login page's external signup
   link, `PriceUpdateAnnouncer` (single throttled `aria-live` region).

**Playwright E2E** (`e2e/`, `npm run test:e2e`) covers three flows against a
real running app: the homepage renders a live event with at least one priced
contract (`home.spec.ts`), clicking through to an event page renders at
least one market and one priced contract — not just the page heading
(`event.spec.ts`), and a non-existent event shows a clean not-found state
rather than crashing. `login.spec.ts` covers the form surfacing a server
error / navigating home on success.

The homepage/event specs hit the real Smarkets API, consistent with this
project's "verify against live, don't mock" approach throughout —
assertions use stable roles/accessible names (`PriceButton`'s "Back "/"Lay "
prefix, `MarketCard`'s `<h3>`), never live team/event names, so they stay
resilient as the feed changes. `login.spec.ts` mocks the app's own
`/api/smarkets/session` route instead, since the real endpoint is
rate-limited to 5 requests/300s and shouldn't be hit on every CI run — the
real login flow (failure and success) was verified manually against the
live API instead (see the Auth bullet above).

Manual/browser QA (Chrome DevTools + Playwright MCP) was additionally used
throughout development to check 375/768/1280px layouts, keyboard focus
order, and console-clean polling over several cycles.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in SMARKETS_USERNAME/PASSWORD if you want to test login
npm run dev                  # http://localhost:3000
```

`SMARKETS_API_BASE_URL` defaults to `https://api.smarkets.com` if unset. The
app works fully logged out (quotes are delayed, not gated); login upgrades to
live prices.

```bash
npm run typecheck    # next typegen && tsc --noEmit
npm run lint          # eslint
npm test              # vitest run — 59 tests
npm run build         # production build
npm run test:e2e      # playwright test — needs `npx playwright install chromium` once
```

## Research & API verification

Verified live during planning; documented in
[`docs/implementation-plan.md §11`](docs/implementation-plan.md), because
they changed the architecture, not just an implementation detail:

1. Quotes are **not** auth-gated — 200 unauthenticated with full depth; only
   the delay differs.
2. IDs (`event.id`, `market.id`, `contract.id`, `parent_id`) are **strings**,
   not integers.
3. `event.type` only comes back as `{domain, scope}` with `with_new_type=true`
   — otherwise it's the legacy string enum, which can't distinguish a
   category node from a bettable event.
4. Query-array params must be **repeated keys**; comma-joining is a 400.
5. Unauthenticated `/v3/events/` paging is silently capped at 50 regardless
   of the requested `limit`.

This is one of the more valuable parts of the project: several of these
findings reshaped the architecture mid-plan (most notably, treating login as
a price-quality upgrade rather than a gate, since quotes aren't actually
auth-gated) rather than being discovered as bugs after implementation.

## Known limitations

- **No WebSocket transport.** Explicitly out of scope; the polling hook is
  isolated behind `usePriceRefresh` so this is a contained follow-up.
- **No order placement, portfolio/balance screens, or full category browse
  tree.** Read-only by design for this scope.
- **Homepage sections are capped at 8 events and a market strip at 6
  contracts** to keep the grid readable (a resolved category node can expand
  to 50+ children; a real market had 40 candidates) — the event page shows
  every market and every contract, uncapped.
- **Category-node resolution only reads the first page.** `parent_id`
  resolution returns `pagination.next_page`, but it isn't followed. In the
  verified sample this covered all 6 category nodes in one page; a feed
  with more/deeper category nodes could silently under-fill a section.
- **Two of three E2E specs depend on live API availability.** The
  homepage/event Playwright specs hit the real Smarkets API, so a live-API
  hiccup can fail them independently of the code; the CI job that runs them
  is non-blocking (`continue-on-error`) for that reason.
- **How "delayed" the delayed prices actually are** is unquantified by the
  spec and wasn't measured precisely — logged-out users see *some* real
  book, but the exact staleness window is unknown.

## What I'd improve next

- Follow the `parent_id` pagination cursor so category-node resolution
  can't silently under-fill a homepage section on a larger feed.
- Swap the HTTP polling transport for a WebSocket behind the existing
  `usePriceRefresh` boundary, now that the isolation is already in place.
- Add order placement and a portfolio/balance view once the read path is
  settled.
- Quantify the actual staleness window on delayed (logged-out) quotes
  instead of leaving it as an open question.
- Add Storybook or a small design system if the component surface grows
  past what ad hoc `components/ui` primitives can comfortably cover.
