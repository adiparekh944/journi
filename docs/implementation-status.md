# Journi implementation status

This checklist follows the locked build order in the implementation specification.
An item is complete only when its acceptance criteria have been verified.

## Base44 frontend authority

- [x] Base44 confirmed as the frontend host and application builder
- [x] Hosted Journi app creation started in Base44
- [ ] Inspect the completed Base44 build against every required route and screen
- [ ] Apply the typed domain and Supabase contracts to the hosted Base44 app

The local React source is a typed domain-test and export contract for Base44. It is
not a second frontend deployment target.

## Phase 0 — Foundation

- [x] React 18, TypeScript 5.5, and Tailwind source structure
- [x] Strict TypeScript, ESLint, Prettier, Ruff, and mypy configuration
- [x] Supabase client, React Query provider, auth state, and sign-in surfaces
- [x] Protected router and five-tab application shell
- [x] Initial schema, triggers, transactional rating RPCs, RLS, and storage policies
- [x] Badge definitions and public profile projection
- [ ] Generate database types after linking the Supabase project
- [ ] Verify Google OAuth and magic-link sign-in against hosted Supabase
- [ ] Verify authenticated and anonymous place access against hosted Supabase

## Phase 1 — Seed and places

- [x] Exact CSV contract and strict typed seed validator
- [x] Read-only place detail query and route contract
- [x] Fuzzy `search_all` RPC and debounced search contract
- [ ] Curate and validate all 150 NYC place records
- [ ] Import seed data and verify the 300 ms search acceptance target

## Phase 2 — Rating engine

- [x] Binary insertion ladder, including “too close to call”
- [x] Pure score-bucket mirror and required unit coverage
- [x] Transaction-safe `log_visit`, delete/shift, and rescore RPCs
- [ ] Build rating screens A through D in Base44
- [ ] Run database concurrency integration tests

## Phase 3 — Onboarding

- [x] Likert normalization and modifier mapping with unit tests
- [ ] Build the complete Base44 wizard and seed-tap blending
- [ ] Implement `taste-vector-refresh`

## Phases 4–9

- [x] Map and feed RPC foundations
- [x] Taste-match and shared-rating agreement unit tests
- [ ] Map, photos, social, recommendations, badges, and polish in Base44
- [ ] Complete browser, accessibility, and manual demo acceptance checks

## Environment-dependent work

Creating Supabase resources, configuring OAuth, setting secrets, generating database
types, and testing deployed edge functions require project credentials. No secret is
stored in this repository.
