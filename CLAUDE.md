# Smarkets Take-Home

## Project goal

Build a polished Next.js/React/TypeScript implementation of the Smarkets
Front-End Engineer take-home assignment within a strict six-hour scope.

The assignment requires:

- homepage with events and markets
- event details page
- markets and contracts
- regularly updating prices
- Smarkets API integration
- login support
- responsive UI
- concise technical documentation

## Research and API sources

Before making API or architecture decisions, read:

- `docs/research/smarkets-research.md`
- `docs/research/smarkets-openapi.json`

The research document contains verified API investigation and architectural
findings.

The OpenAPI JSON is the downloaded Smarkets API specification and should be
treated as the authoritative API contract.

External references:

- Smarkets Front-End Engineer:
  https://smarkets.com/job/d24b8384-0894-46b3-834c-eeeba59274fd/

- Smarkets HTTP Trading API:
  https://docs.smarkets.com/

- Smarkets OpenAPI:
  https://api.smarkets.com/v0/control/openapi/

- Previous Nevis implementation:
  https://github.com/mashykaviktor/nevis-frontend

## Stack

- Next.js
- React
- TypeScript
- npm
- TanStack Query
- Tailwind CSS
- Lucide React
- Vitest
- React Testing Library

Optional only if time remains:

- Playwright
- lightweight GitHub Actions

## Architecture principles

- Use TanStack Query for server state.
- Do not add Redux unless a concrete requirement appears.
- Keep API access separate from UI components.
- Keep API models separate from UI/domain models where useful.
- Normalize Smarkets-specific price representation before it reaches UI.
- Prefer small composable components.
- Avoid unnecessary abstractions.
- Avoid dependency creep.
- Avoid N+1 API requests.
- Prefer supported batch endpoints.
- Do not invent API response shapes.

## Price handling

Smarkets prices are not decimal odds.

The API/domain layer must convert Smarkets price values into
user-facing decimal odds.

Do not expose raw Smarkets price units throughout the UI.

Contracts may have no bids/offers.

The UI must handle unavailable prices explicitly.

## Realtime / price updates

Use the documented HTTP quotes API with controlled refetch/polling for the
take-home.

Do NOT reverse-engineer or reproduce the internal Smarkets production
WebSocket protocol.

Keep the price transport isolated enough that a future realtime transport
could be introduced without rewriting presentation components.

## UI

Target a professional exchange/trading interface.

- light-first
- clean
- information-dense but readable
- restrained visual styling
- consistent spacing
- consistent typography
- subtle borders
- clear price states
- responsive down to approximately 375px
- accessible keyboard/focus behaviour

Do not clone the production Smarkets UI.

Do not make the application look like a casino.

## Accessibility

Prefer semantic HTML and native browser behaviour.

Include:

- meaningful headings
- native buttons/links
- keyboard support
- visible focus states
- accessible labels
- accessible loading/error states
- sufficient contrast

Avoid unnecessary ARIA complexity.

## Quality

- strict TypeScript
- no `any`
- no unnecessary casts
- no disabling lint/type errors without justification
- loading state
- error state
- empty state
- tests for important data mapping and UI behaviour
- responsive QA
- visual QA

## Previous Nevis lessons

Use the previous Nevis take-home feedback as a quality checklist.

Pay particular attention to:

- visual precision
- spacing consistency
- divider/border alignment
- frontend craft
- clean data-fetching architecture
- React Query usage

Do not automatically copy Nevis-specific infrastructure such as:

- Storybook
- React Compiler
- monorepo
- large design system

## Scope

The assignment has a six-hour implementation limit.

Prioritize:

1. real API integration
2. homepage
3. event page
4. markets/contracts/prices
5. price refresh
6. visual polish
7. responsive behaviour
8. accessibility
9. tests
10. README

Optional infrastructure must never compromise the core implementation.

## AI workflow

Before making significant implementation changes:

1. inspect the repository
2. read the research documents
3. verify API assumptions
4. propose the architecture
5. create a practical implementation plan
6. implement incrementally
7. run validation
8. perform visual QA
9. report unresolved assumptions

Do not silently make major architectural decisions.
