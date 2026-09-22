# Smarkets Front-End Take-Home

A Next.js exchange front end backed by the real Smarkets API: a homepage of live
events and markets, an event detail page, regularly-refreshing prices, and
login. Built to a six-hour scope — see [§11](docs/implementation-plan.md) and
[Known limitations](#known-limitations--future-improvements) below for what
was deliberately left out and why.

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
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run — 59 tests
npm run build         # production build
npm run test:e2e      # playwright test — needs `npx playwright install chromium` once
```

## Architecture

The Smarkets API sends no `Access-Control-Allow-Origin` header (verified
live), so the browser cannot call `api.smarkets.com` directly — Next.js route
handlers are a load-bearing BFF, not a cosmetic choice:

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

## Why these tools

- **Next.js** — not just a React framework here: the CORS finding above
  means it's the BFF/proxy layer the browser has no alternative to, so this
  wasn't a default so much as a requirement.
- **TanStack Query** — server state (caching, polling via `refetchInterval`,
  request lifecycle/retry policy) without reaching for a global store; there
  is no meaningful client-only state in this app, so Redux would have been
  pure overhead.
- **TypeScript, strict, no `any`** — the Smarkets wire format (basis points,
  `bids`/`offers`, string ids) is easy to get backwards (see "Price
  normalization" below); types keep the API → domain → UI boundary honest
  end to end, not just self-documenting.
- **Tailwind CSS** — utility classes let spacing/border/contrast decisions
  (the explicit Nevis feedback focus) live next to the markup instead of in
  a separate stylesheet, which matters more than framework choice at a
  six-hour, no-design-system scope.
- **Vitest + React Testing Library** — fast, in-process feedback for the
  highest-value logic (price conversion, back/lay direction, adapters);
  RTL's query-by-role/label style also pushed the UI toward real semantic
  HTML rather than div soup.
- **Playwright** — the one thing unit tests can't cover: that the real
  pages render, navigate, and show real data end to end. Added once the
  core was done, not at the expense of it (see CLAUDE.md's "optional if
  time remains").

## Key decisions

- **Price normalization.** Smarkets prices are percentage basis points
  (1–9999), not decimal odds — `domain/price.ts` is the only place that
  converts (`10000 / priceBp`), never rounds before dividing, and returns
  `null` outside the valid range rather than `Infinity`/a clamped value.
  Best back = **lowest** `offers` price, best lay = **highest** `bids`
  price — verified by overround on a real book (summed best offers ≈126.8%,
  summed best bids ≈97.4%), not assumed from the `side` naming, which is the
  single easiest thing to get backwards here.
- **No price filtering.** Ticks `1` and `9999` are valid exchange prices per
  spec and render as-is (`1` → `10000.0`, `9999` → `1.00`); inventing a
  "noise" filter would mean showing something other than the real book.
- **Missing liquidity is a primary state, not an edge case.** ~39% of
  contracts in the verified sample had no liquidity at all. Empty
  `bids`/`offers` and a contract with no quote entry both resolve to
  `hasPrice: false`, rendered as a disabled "—", never `NaN`/blank.
- **Available amount, not "stake".** Each price button shows a small GBP
  figure next to the odds (`£245`). The displayed amount uses the
  `quantity`/`price` conversion documented by the API
  (`quantity * priceBp / 100_000_000`), applied the same way to both
  `bids` and `offers` ticks, and is presented as available level depth
  rather than as the user's own stake or liability — it's labelled
  "available" (in the button's `aria-label`), not "stake". The spec's
  separate `/v3/markets/{ids}/volumes/` endpoint treats "back stake" and
  "liability" as two distinct, summed quantities, so no claim is made here
  about which side bears what financial risk.
- **The join direction matters.** Quotes can include keys for contracts
  absent from the contracts endpoint (verified: 208 quote keys vs 133
  contracts for the same 19 markets). `toContractPrices` iterates contracts
  and looks up quotes by id — never the reverse — so an orphaned quote key
  can't surface as a nameless row.
- **Batching, not fan-out.** Every list endpoint chunks its id list against
  the verified caps (events 300, markets 50, contracts 100, quotes 200) and
  fans out with `Promise.all`; a homepage load costs **5 upstream calls (6
  when any category node needs resolving)** — popular/home, events,
  [optional parent_id resolution], markets, contracts, quotes — never one
  per event or market, and never more regardless of how many ids get
  chunked within a stage. Category nodes on the homepage (e.g. a "Brazil"
  nav shortcut) are resolved to their bettable children with **one** batched
  `parent_id` query, not one call per category — though only that query's
  first page is consumed (see Known limitations).
- **Query-array params are repeated keys, not comma-joined.** Comma-joining
  `parent_id=a,b` is a verified hard 400 (`REQUEST_VALIDATION_ERROR`) on this
  API; a single `buildQuery` helper owns the distinction so it can't be
  gotten wrong per call site (path id lists stay comma-joined, which is a
  separate, correct convention for that position).
- **Auth.** The session token lives only in an httpOnly, `SameSite=Lax`
  cookie, never in client JS. `secure` is environment-conditional —
  hard-coding `true` would silently break login on plain `http://localhost`
  (the browser drops a Secure cookie over HTTP with no visible error). MFA
  (`factor: totp`) is rejected with an explicit message, not a crash. The app
  is fully usable logged out, since quotes turned out not to be auth-gated
  (see below) — login is a price-quality upgrade, not a gate. Both the
  failure path (wrong credentials → friendly error, no cookie set) and a
  real successful login (cookie stored, header flips to "Live prices") were
  verified end-to-end against the live API; login is rate-limited to 5
  requests/300s, so this wasn't looped.
- **Price refresh is polling, not a socket.** `refetchInterval: 5s` on a
  single quotes query per page (chunked, never per-market), backing off to
  30s and surfacing a quiet notice on a `429`. The transport is isolated to
  one hook (`usePriceRefresh`) so swapping in a WebSocket later would touch
  one file, not every price-consuming component. A shared, visually-hidden
  `aria-live="polite"` region (`PriceUpdateAnnouncer`) announces "Prices
  updated" once per successful poll — throttled to that same 5s/30s
  cadence, not one announcement per contract.

## Corrections to the research dossier

Verified live during planning; documented in
[`docs/implementation-plan.md §11`](docs/implementation-plan.md), because
they change the architecture, not just an implementation detail:

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

## Testing

Vitest + React Testing Library, 59 tests, prioritized by risk:

1. `domain/price.test.ts` — the conversion math, boundary ticks, invalid
   range handling.
2. `features/prices/adapters.test.ts` — best-back/best-lay direction against
   a real recorded order book, the join-by-contract-id invariant.
3. `features/home/adapters.test.ts` — category-node resolution, non-bettable
   exclusion.
4. `features/markets/adapters.test.ts` — live-price merge over structural
   data.
5. `server/endpoints.test.ts` — repeated-key query serialization, chunk
   sizes against the verified caps.
6. `server/client.test.ts` / `server/errors.test.ts` — HTTP status → error
   mapping (400/401/404/500), non-JSON error bodies, network failures
   (status `0`), the 204 short-circuit, the Authorization header.
7. Component tests — `ContractRow` (odds rendering, "—" state, extreme valid
   ticks, the "available" amount on both back and lay), `EventCard` (links
   to the right event), `ErrorState` (retry fires), `LoginForm` (server
   error surfaces, success navigates), the login page's external signup
   link, `PriceUpdateAnnouncer` (single throttled `aria-live` region).

**Playwright E2E** (`e2e/`, `npm run test:e2e`) covers the three critical
flows against a real running app: the homepage renders a live event with at
least one priced contract (`home.spec.ts`), clicking through to an event
page renders at least one market and one priced contract — not just the
page heading (`event.spec.ts`), and a non-existent event shows a clean
not-found state rather than crashing. `login.spec.ts` covers the form
surfacing a server error / navigating home on success. The homepage/event
specs hit the real Smarkets API, matching this project's "verify against
live, don't mock" approach throughout — assertions use stable roles/
accessible names (`PriceButton`'s "Back "/"Lay " prefix, `MarketCard`'s
`<h3>`), never live team/event names, so they stay resilient as the feed
changes. `login.spec.ts` mocks the app's own `/api/smarkets/session` route
instead, since the real endpoint is rate-limited to 5 requests/300s and
shouldn't be hit on every CI run — the real login flow (failure and
success) was verified manually against the live API instead (see the Auth
bullet above). Manual/browser QA (Chrome DevTools + Playwright MCP) was
additionally used throughout development to check 375/768/1280px layouts,
keyboard focus order, and console-clean polling over several cycles.

## Known limitations / future improvements

- **How "delayed" the delayed prices actually are** is unquantified by the
  spec and wasn't measured precisely — logged-out users see *some* real
  book, but the exact staleness window is unknown.
- **No WebSocket transport.** Explicitly out of scope; the polling hook is
  isolated behind `usePriceRefresh` so this is a contained follow-up.
- **No order placement, portfolio/balance screens, or full category browse
  tree.** All explicitly out of scope for a read-only, six-hour build.
- **Homepage sections are capped at 8 events and a market strip at 6
  contracts** to keep the grid readable (a resolved category node can expand
  to 50+ children; a real market had 40 candidates) — the event page shows
  every market and every contract, uncapped.
- **Category-node resolution only reads the first page.** `parent_id`
  resolution returns `pagination.next_page`, but it isn't followed — a
  deliberate six-hour-scope decision, not an oversight (see the comment on
  `fetchEventsByParentIds`). In the verified sample this covered all 6
  category nodes in one page; a feed with more/deeper category nodes could
  silently under-fill a section. Since sections are already capped to 8
  events, following the cursor would add complexity without changing what
  the homepage shows in the common case.
- **No Storybook, no design system** — deliberately not carried over from
  prior take-home infrastructure per the brief's scope. A lightweight CI
  (`.github/workflows/ci.yml`) *was* added: typecheck/lint/unit
  tests/build gate every push and PR, with the Playwright E2E suite as a
  separate, non-blocking job (`continue-on-error`) since two of its three
  specs depend on the live Smarkets API being reachable from the runner.

## Biggest challenges

- The research dossier's assumptions didn't all hold against the live API —
  most consequentially, that quotes require auth (they don't) and that
  `parent_id` batching works with comma-joining (it 400s; needs repeated
  keys). Both were caught by testing against the real API during planning
  rather than trusting the docs, which reshaped the auth story from "gate"
  to "quality upgrade" and made the category-resolution flow work in one
  request instead of many.
- CSS Grid's default `align-items: stretch` plus a fixed column-count
  breakpoint produced two real layout bugs during QA: cards stretching to
  match a much taller sibling (dead white space), and a lone market on the
  event page getting stuck at 1/3 width with truncated names while
  two-thirds of the page sat empty. Fixed by switching to
  `repeat(auto-fill, minmax(320px, 1fr))`, which sizes column count off the
  content's minimum width instead of a viewport breakpoint.
