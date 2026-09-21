# Smarkets Front-End Take-Home — Architecture & Implementation Plan

> Internal working document. This is the live source of truth for implementation —
> update the status table below as blocks complete. Not part of the final submission
> unless explicitly requested (the reviewer-facing write-up is `README.md`).

## Status

Approved 2026-09-21 with five corrections applied (multi-`parent_id` verified live,
quote chunking at 200, no price filtering, auth promoted to P0, env-conditional
cookie `secure` flag).

| # | Block | State |
|---|---|---|
| 0 | Scaffold (Next.js + TS + Tailwind + TanStack Query + Vitest) | ☑ done |
| 1 | Server layer (`client.ts`, `endpoints.ts`, errors) | ☑ done |
| 2 | Domain + adapters + tests ⭐ protected | ☐ not started |
| 3 | Homepage | ☐ not started |
| 4 | Event page | ☐ not started |
| 5 | Price refresh | ☐ not started |
| 6 | Auth ⭐ protected (P0) | ☐ not started |
| 7 | Polish pass ⭐ protected | ☐ not started |
| 8 | Component tests + README | ☐ not started |

## Context

The repo is greenfield: `docs/research/`, `LICENSE`, a README stub and `CLAUDE.md`. No application code exists.

The task is the Smarkets Front-End Engineer take-home (`docs/research/Front-end take-home-test.pdf`, read first-hand): a React site backed by the real Smarkets API, with **login**, a **homepage of events/markets whose contract prices update regularly**, and an **event page** with more detail and more markets. Hard limit: **6 hours**. Deliverable includes a brief written summary of choices, challenges and future improvements.

Before planning I verified every API assumption against both `docs/research/smarkets-openapi.json` and the **live production API**. Several findings materially change the architecture versus what the research dossier assumed — they are called out in §11.

---

## 1. Verified API facts (evidence, not assumption)

All endpoints below were called live during planning.

| Fact | Evidence |
|---|---|
| `/v3/popular/home/`, `/v3/events/`, `/v3/events/{ids}/markets/`, `/v3/markets/{ids}/contracts/` are **public** (no `security` in spec, 200 without token) | spec + live 200s |
| `/v3/markets/{ids}/quotes/` declares `security: api_key` but **returns 200 unauthenticated** with full depth; token only removes the delay | live `GET /v3/markets/142909169/quotes/` → 200 |
| **No `Access-Control-Allow-Origin` header is returned** for `Origin: http://localhost:3000` | live header dump — only `vary: Origin` |
| All IDs (`event.id`, `market.id`, `contract.id`, `parent_id`) are **strings**, not integers | spec: `"pattern": "^[0-9]+$", "type": "string"` |
| `event.type` is a `oneOf`: legacy string enum, **or** `{domain, scope}` only when `with_new_type=true` | spec |
| Price is **percentage basis points**, 1–9999; decimal odds = `10000 / price` | spec field description |
| `side: buy` = **backing**, `side: sell` = **laying** | spec `POST /v3/orders/` |
| Therefore **best back = lowest `offers` price**, **best lay = highest `bids` price** | empirically confirmed: summed best offers = **126.8%** (>100%), summed best bids = **97.4%** (<100%) |
| Quotes return **more contract keys than the contracts endpoint** (208 vs 133 for the same 19 markets) — hidden contracts appear in quotes | live comparison |
| Contracts with **no liquidity at all are common**, not an edge case (81/208 = 39%) | live |
| Batch caps: events `{event_ids}` **300**, markets `{event_ids}` **50**, contracts `{market_ids}` **100**, quotes `{market_ids}` **200** | spec `maxItems` |
| **Query-array params must be repeated, not comma-joined.** `parent_id=a,b` → **HTTP 400** `REQUEST_VALIDATION_ERROR`; `parent_id=a&parent_id=b` → 200. Path params (`event_ids`, `market_ids`) use commas; query arrays do not | live, both forms tested |
| Multi-`parent_id` resolution works: all 6 category nodes in **one** request → 50 bettable `single_event` children | live |
| Unauthenticated `/v3/events/` page limit is silently capped at **50** (`limit=100` returned 50); `pagination.next_page` cursor supplied | live |
| Rate limits: quotes **50 req/60s**, events **600 req/60s**, `POST /v3/sessions/` **5 req/300s**, global 1200/60s | spec |
| Session token valid **30 min**, auto-renewed by any authenticated call; MFA returns `factor: "totp"` | spec |
| `/v3/events/` supports `limit` + cursor pagination (`pagination.next_page`); `markets` supports `limit_by_event` | spec + live |
| `popular/home` returns 5 sections / 25 unique events, of which **6 are non-bettable `scope: category` nodes** | live |

---

## 2. Proposed architecture

The CORS finding is decisive: **the browser cannot call `api.smarkets.com` directly.** Next.js is therefore not cosmetic — it is the load-bearing piece. Every Smarkets call goes through a server-side layer.

```
Browser (React Client Components)
   │  same-origin fetch, no CORS, no token in JS
   ▼
Next.js Route Handlers  /api/smarkets/*        ← BFF / proxy
   │  attaches Session-Token from httpOnly cookie when present
   ▼
Smarkets HTTP client (server-only)
   │
   ▼
api.smarkets.com
```

Layering, strictly one-directional:

```
route handler → smarkets client → adapter (API model → domain model) → query hook → component
```

Key consequences:

- **The session token never reaches client JavaScript.** It lives in an httpOnly, SameSite=Lax cookie, read server-side. This is both the safest option and the only one that works given CORS.
- **UI components never see basis points, `bids`/`offers`, or raw API nesting.** Adapters convert at the boundary.
- **The transport is swappable.** Components consume a `ContractPrice` domain model from a query hook; replacing polling with a WebSocket later touches only the hook, satisfying the CLAUDE.md isolation requirement.
- Server Components render static shells (event metadata, market names); **Client Components own anything that polls.** This keeps the price-refresh boundary small.

---

## 3. Folder structure

```
src/
  app/
    layout.tsx
    page.tsx                          # homepage (RSC shell)
    events/[eventId]/page.tsx         # event page (RSC shell)
    login/page.tsx
    api/smarkets/
      home/route.ts                   # popular/home + child resolution
      events/[eventId]/route.ts       # event + markets + contracts
      quotes/route.ts                 # batched quotes (polled)
      session/route.ts                # POST login, DELETE logout, GET current

  server/
    smarkets/
      client.ts                       # fetch wrapper: base URL, token, errors, timeout
      endpoints.ts                    # typed URL builders + batch chunking
      session.ts                      # httpOnly cookie read/write
      errors.ts                       # SmarketsApiError, maps error_type → HTTP

  features/
    home/          { queries.ts, adapters.ts, types.ts, components/ }
    events/        { queries.ts, adapters.ts, types.ts, components/ }
    markets/       { queries.ts, adapters.ts, types.ts, components/ }
    prices/        { queries.ts, adapters.ts, types.ts, usePriceRefresh.ts }
    auth/          { queries.ts, types.ts, components/LoginForm.tsx }

  domain/
    price.ts                          # toDecimalOdds, quantity→stake, tick helpers
    models.ts                         # Event, Market, Contract, ContractPrice

  components/ui/
    Button, Card, Badge, Skeleton, ErrorState, EmptyState, PageHeader, Price, Section

  lib/
    queryClient.ts
    format.ts                         # odds, currency, datetime formatting

tests/
  domain/price.test.ts
  features/*/adapters.test.ts
  features/*/components/*.test.tsx
```

Rationale: `server/` is a hard boundary (never imported by client code); `features/` mirrors the API resource graph; `domain/` holds pure functions that are trivially testable and carry the highest-value logic.

---

## 4. API / query strategy

**Route handlers, not direct client calls.** Three read endpoints, each returning fully-adapted domain models so the client does zero Smarkets-specific transformation.

| Route | Upstream calls | Notes |
|---|---|---|
| `GET /api/smarkets/home` | `popular/home` → `events/{≤300 ids}?with_new_type=true` → `events/{≤50}/markets/?limit_by_event=1` → `markets/{≤100}/contracts/` | 4 sequential batched calls, **no N+1** |
| `GET /api/smarkets/events/[id]` | `events/{id}?with_new_type=true` → `events/{id}/markets/` → `markets/{ids}/contracts/` | 3 calls |
| `GET /api/smarkets/quotes?marketIds=…` | `markets/{≤200}/quotes/` **× ⌈n/200⌉** | the only polled route; one *logical* refresh, chunked |

Rules enforced in `endpoints.ts`:
- Always pass `with_new_type=true` so `type.scope` is available (the legacy string enum cannot distinguish a category from a match).
- Chunk any ID list against its verified `maxItems` cap before building a URL — **including quotes at 200**. A "refresh" is a logical operation that may span several upstream calls; the route handler fans out with `Promise.all`, merges the keyed objects, and returns one response. The client stays unaware of chunking.
- **Query-array params are serialised as repeated keys** (`parent_id=a&parent_id=b`), never comma-joined — comma form is a verified 400. Path ID lists remain comma-joined. A single `buildQuery` helper owns this distinction so it cannot be got wrong per-call-site.
- **Never** issue one request per contract or per market.

TanStack Query config:
- `staleTime`: 5 min for events/markets/contracts (near-static), `0` for quotes.
- Query keys: `['home']`, `['event', id]`, `['quotes', sortedMarketIds]`.
- Server-side upstream caching via `next: { revalidate: 300 }` on structural calls; `cache: 'no-store'` on quotes.

---

## 5. Data flow

```
popular/home                    5 sections, 25 event_ids (6 are category nodes)
   │
   ├─ batch GET /v3/events/{25 ids}/?with_new_type=true
   │     ├─ bettable === true  ──────────────────────────► keep
   │     └─ type.scope === 'category' ──► GET /v3/events/
   │                                       ?parent_id=a&parent_id=b&parent_id=c …
   │                                       &type_scope=single_event
   │                                       &state=upcoming&state=live
   │            VERIFIED: repeated keys, NOT comma-joined (comma → HTTP 400).
   │            ONE extra call resolved all 6 nodes → 50 bettable children.
   │            Unauth page cap is 50; follow pagination.next_page if needed.
   ▼
 bettable leaf events
   │
   ├─ batch GET /v3/events/{ids}/markets/?limit_by_event=1&sort=display_order
   ▼                                        (homepage: 1 headline market per event)
 markets
   │
   ├─ batch GET /v3/markets/{ids}/contracts/
   ▼
 contracts  ── JOIN ──►  GET /v3/markets/{ids}/quotes/   (polled)
   │
   │  join direction: iterate CONTRACTS, look up quote by contract.id
   │  (never iterate quote keys — they include hidden contracts: 208 vs 133)
   ▼
 ContractPrice domain model ──► UI
```

Event page is the same chain minus `limit_by_event`, so all markets for the event are shown — which is precisely the "more available markets" the brief asks for.

---

## 6. Authentication — **P0**

Login is an explicit functional requirement in the brief ("Users should be able to log into their Smarkets account"), so it ranks alongside the homepage and event page, **not** with optional polish. It is never the first thing sacrificed.

**Chosen: real BFF session, no MFA path** (per decision; surface a clear error if MFA is required).

```
LoginForm (client)
  → POST /api/smarkets/session  { username, password }
      → POST https://api.smarkets.com/v3/sessions/  { username, password, remember: true }
      → 201 { token, stop, factor }
          factor === 'complete' → Set-Cookie: sm_session=<token>
                                    httpOnly: true
                                    sameSite: 'lax'
                                    secure: process.env.NODE_ENV === 'production'
                                    path: '/', maxAge ≈ 30min
          factor === 'totp'     → 409 + "This account has MFA enabled, which is out
                                    of scope for this exercise" (explicit, not a crash)
  → DELETE /api/smarkets/session → upstream DELETE /v3/sessions/ + clear cookie
  → GET    /api/smarkets/session → { authenticated: boolean }  (never returns the token)
```

- Every proxied upstream call attaches `Authorization: Session-Token <token>` **if the cookie exists**. The app works fully logged-out; logging in upgrades quotes from delayed to live.
- The UI states this honestly: a header badge reading "Delayed prices" vs "Live prices — signed in". This turns the verified delayed/live distinction into a visible product feature rather than hiding it.
- `secure` is **environment-conditional**: hard-coding `secure: true` would silently break login on `http://localhost:3000`, because the browser refuses to store a Secure cookie over plain HTTP and the failure is invisible (no error, the session just never persists). Production keeps the flag; local dev stays functional. `httpOnly` and `sameSite` are unconditional.
- Error mapping is explicit for the documented `error_type` values: `INVALID_CREDENTIALS`, `PASSWORD_RESET_NEEDED`, `RATE_LIMIT_EXCEEDED`, `CLIENT_JURISDICTION_MISMATCH`, `IP_NOT_TRUSTED`.
- **Testing caution:** `POST /v3/sessions/` is limited to **5 requests per 300 seconds**. Login must be tested deliberately, not in a loop. Credentials go in `.env.local` only (already gitignored) — never committed.

---

## 7. Price normalization

All in `src/domain/price.ts`, pure and fully unit-tested.

```ts
type Side = { decimalOdds: number; priceBp: number; stake: number };

type ContractPrice = {
  contractId: string;
  back: Side | null;   // from LOWEST offers price
  lay:  Side | null;   // from HIGHEST bids price
  hasPrice: boolean;
};
```

Conversions:
- `toDecimalOdds(bp) = 10000 / bp` — guard `bp <= 0` and `bp > 9999` → `null`.
- Round for display to 2 dp; **never** round before arithmetic.
- `quantity` is 1/10000 of a currency unit; back stake = `quantity * price / 100_000_000` (spec formula). Display as GBP.
- Best back = `min(offers.price)`, best lay = `max(bids.price)` — **verified by overround**, not assumed. This is documented in a code comment with the 126.8%/97.4% evidence, because it is the single easiest thing to get backwards.
- Empty `bids`/`offers` → `null` side, `hasPrice: false`. The `Price` component renders an explicit em-dash "no price" state. Given 39% of contracts have no liquidity, this is a primary state, not a fallback.
- **No price filtering.** `1` and `9999` are valid exchange ticks within the spec's documented `minimum: 1, maximum: 9999` range. The API does not document them as synthetic, so the UI displays whatever the book contains. Inventing a "noise" heuristic would mean showing the user something other than the real best available price — a correctness bug dressed up as polish. Extreme odds are handled by *formatting* (e.g. `1.00` / `500.0` render cleanly), never by hiding levels.

---

## 8. Price refresh

- **Polling via TanStack Query `refetchInterval`**, on the quotes query only. No WebSocket — explicitly excluded by CLAUDE.md.
- Interval **5s**, derived from the verified budget: quotes allow 50 req/60s and the proxy shares one IP budget. 5s = 12 req/min per active page, leaving ~4× headroom.
- **Chunking counts against that budget.** A refresh covering >200 markets costs ⌈n/200⌉ upstream calls, so the effective ceiling is ~4 chunks at a 5s interval. Realistic page loads sit well inside one chunk (the homepage needs 19 markets), but `endpoints.ts` enforces the split rather than relying on that.
- `refetchIntervalInBackground: false` and a `document.visibilityState` guard so hidden tabs stop polling — real rate-limit protection, not decoration.
- One quotes request per page covering **all** visible markets (≤200), never per-market.
- `placeholderData: keepPreviousData` so the grid never collapses into a skeleton mid-poll.
- **Price movement feedback:** a `usePreviousPrice` hook diffs decimal odds between renders and applies a ~600ms subtle background tint (green up / red down) plus a small directional arrow. Restrained, exchange-like, no casino flashing. Announced politely to screen readers via a throttled `aria-live="polite"` region rather than one live region per cell.
- On `429`, back off to 30s and surface a quiet "prices throttled" notice rather than hammering.

---

## 9. Component hierarchy

```
RootLayout
└── AppHeader            ← auth state, "Delayed/Live prices" badge, logout
    │
    ├── HomePage (RSC shell)
    │   └── HomeFeed (client, polls)
    │       └── CategorySection ×5          "Football", "Politics", …
    │           └── EventCard               name, start time, state badge, link
    │               └── MarketPriceStrip    headline market
    │                   └── ContractRow ×n
    │                       └── PriceButton (back) | PriceButton (lay)
    │
    ├── EventPage (RSC shell: header/metadata)
    │   ├── EventHeader                     name, start time, live/upcoming badge
    │   └── MarketList (client, polls)
    │       └── MarketCard ×n               name, state, winner_count
    │           └── ContractRow ×n
    │               └── PriceButton ×2
    │
    └── LoginPage → LoginForm
```

- `ContractRow` and `PriceButton` are the only components that touch prices — the polling blast radius is two components.
- `PriceButton` is a native `<button>` (focusable, keyboard-operable) and renders a disabled "—" state when `hasPrice` is false.
- Every async surface has `Skeleton` / `ErrorState` (with retry) / `EmptyState` siblings.

---

## 10. Testing strategy

Vitest + React Testing Library. Priority order, highest value first:

1. **`domain/price.test.ts`** (non-negotiable) — `10000/5000 → 2.0`, `6667 → 1.50`; boundary `1` and `9999`; invalid `0`/negative → null; stake conversion against the spec's own worked example (`100000 × 5000 / 100000000 = £5`).
2. **`prices/adapters.test.ts`** — best back is the *lowest* offer and best lay the *highest* bid (fixture drawn from the real Lula book: bids `[3788, 3676, 3597]`, offers `[4032, 4098, 9999]` → back 2.48, lay 2.64). Empty arrays → `hasPrice: false`. **A quote key with no matching contract is ignored** (the 208-vs-133 case).
3. **`home/adapters.test.ts`** — non-bettable `scope: category` events are excluded from the leaf list; children resolution merges correctly.
4. **`server/endpoints.test.ts`** — `buildQuery` emits **repeated** keys for array query params (`parent_id=a&parent_id=b`, never `a,b`), path ID lists stay comma-joined, and chunking splits at the verified caps (quotes 200, contracts 100, markets 50, events 300). These are exactly the mistakes that produce silent 400s.
5. **Component tests** — `ContractRow` renders odds; renders "—" with no liquidity; renders extreme-but-valid ticks (`1` → `10000.0`, `9999` → `1.00`) without hiding them; `ErrorState` retry fires refetch; `EventCard` links to the right href.
6. **Interaction** — login form validation and error-message surfacing with a mocked route handler.

Fixtures are captured from the **real** responses recorded during this planning session, saved at `docs/research/api-samples/*.json` (popular-home, event-single/batch, markets-single/batch, contracts-single/batch, quotes-single/batch, events-children-by-parent), so tests assert against genuine payload shapes rather than invented ones. No Playwright unless everything else is done and polished.

---

## 11. Uncertainties, assumptions to verify, and deliberate exclusions

### Corrections to the research dossier
These contradict `docs/research/smarkets-research.md` and should be treated as authoritative:

1. **Quotes are NOT auth-gated.** The dossier implies a session is needed; live testing returned 200 with full depth unauthenticated. The app therefore works logged-out, and login becomes a price-quality upgrade.
2. **The dossier never states which side is back and which is lay.** Verified here: back = lowest offer, lay = highest bid.
3. **IDs are strings, not integers.** Modelling them as `number` would break on comparison and is a silent bug risk.
4. **`type.scope` only exists with `with_new_type=true`.** The dossier's `type.scope: category` example is only reachable with that flag set.
5. **Quotes include hidden contracts** absent from the contracts endpoint. Joining in the wrong direction surfaces nameless rows.
6. **Query-array params must be repeated keys.** Comma-joining `parent_id` is a hard 400. The dossier's batching advice covers path params only and does not generalise to query arrays.
7. **Unauthenticated event paging is capped at 50** regardless of the requested `limit`, silently.

### Still uncertain — verify during implementation
- **How "delayed" the delayed prices actually are.** Unquantified by the spec. If the delay is large, the logged-out experience may look static; I will measure once and note it in the README.
- **Whether the account has MFA enabled.** Per decision, the no-MFA path is assumed with an explicit error if `factor: 'totp'` comes back. Ten-minute fix if it turns out to be needed.
- **`CLIENT_JURISDICTION_MISMATCH` / `IP_NOT_TRUSTED` on login.** The dossier records a VPN-dependent registration; login may be similarly location-sensitive. Mapped to a clear message, not a crash.
- **Whether `popular/home` needs a `jurisdiction` param** for stable results. It returned data without one; will pass `UKGC` if results look inconsistent.
- **Homepage composition volatility.** The feed is live — sections may be thin at some hours. Empty states must be genuinely good, not an afterthought.
- **Unauthenticated `limit` ceiling on `/v3/events/`** is server-controlled and undocumented; cursor pagination is handled but the page size cannot be relied upon.

### Deliberately excluded (6-hour constraint)
WebSocket/realtime transport · order placement or any write operation to the exchange · `last_executed_prices`, volumes, cash-out, multiples, each-way · full navigation tree / category browse pages · Redux · Storybook · React Compiler · Docker · Sentry · a large design system · Playwright E2E · sophisticated CI/CD · dark mode (light-first per CLAUDE.md) · account/balance/portfolio screens.

---

## 12. Six-hour implementation plan

| # | Block | Time | Output |
|---|---|---|---|
| 0 | **Scaffold** — `create-next-app` (TS, Tailwind, App Router), TanStack Query provider, Vitest + RTL, strict tsconfig, `.env.local` | 0:00–0:30 | app boots, one green test |
| 1 | **Server layer** — `smarkets/client.ts`, `endpoints.ts` with batch chunking, error mapping, typed API models from the spec | 0:30–1:15 | typed, batched, CORS-free access |
| 2 | **Domain + adapters + tests** ⭐ | 1:15–2:00 | `price.ts` + adapters **with tests written first** — highest-value correctness, done while fresh |
| 3 | **Homepage** — `/api/smarkets/home` incl. category-child resolution, `HomeFeed`, `EventCard`, `MarketPriceStrip` | 2:00–3:00 | homepage renders real events + real prices |
| 4 | **Event page** — route handler, `EventHeader`, `MarketList`, `MarketCard` | 3:00–3:45 | click-through works end to end |
| 5 | **Price refresh** — chunked quotes query, 5s interval, visibility guard, movement tint, `aria-live` | 3:45–4:15 | prices visibly and politely update |
| 6 | **Auth (P0)** ⭐ — session route handler, env-conditional cookie, `LoginForm`, header badge, logout | 4:15–5:00 | real login against the real API |
| 7 | **Polish pass** ⭐ — spacing/divider audit (the explicit Nevis lesson), 375px responsive QA, focus rings, loading/error/empty states, contrast | 5:00–5:40 | the craft signal the previous review flagged |
| 8 | **Remaining component tests + README** | 5:40–6:00 | green suite, reviewer-facing summary |

**If time runs short**, sacrifice in this order: component tests (8) → event-page market breadth → homepage category-child resolution (fall back to filtering category nodes out).

**Never sacrifice:** §2 domain correctness, §6 auth (explicit in the brief), or §7 visual polish (the two things the Nevis feedback specifically called out). Blocks 2, 6 and 7 are the protected core.

TypeScript and lint must be clean at every block boundary, not just at the end.

---

## 13. Verification

- `npm run typecheck` — zero errors, no `any`, no suppressions.
- `npm run lint` — clean.
- `npm test` — all green; price conversion and back/lay mapping covered.
- `npm run dev` and manually confirm:
  - homepage lists real events with real decimal odds across all 5 sections;
  - odds visibly change within ~15s (watch a liquid market such as the Brazil election book);
  - clicking an event opens its page with more markets than the homepage showed;
  - contracts with no liquidity render "—", not `NaN`, `Infinity` or a blank cell;
  - login succeeds over plain `http://localhost:3000` and the header flips to "Live prices" — confirm the cookie is actually stored in DevTools → Application → Cookies (this is where a hard-coded `secure: true` would fail silently); mind the 5-per-300s limit;
  - DevTools Network shows **no** per-contract or per-market request fan-out, and **no 400s** from query-param serialisation;
  - responsive at 375 / 768 / 1280; keyboard tab order reaches every price button with a visible focus ring.
- Spot-check one contract by hand: `10000 / bestOfferPrice` must equal the displayed back odds.
