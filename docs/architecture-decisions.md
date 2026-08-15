# Journi architecture decisions

## ADR-001 — Security patch versions override vulnerable locked patch lines

**Status:** accepted

The product specification names React Router 6.24.x. The initial dependency audit
reported high-severity redirect and cross-site scripting advisories in that line.
No maintained 6.x release clears all current advisories: the remaining patched
release is 7.18.2. Journi therefore uses React Router 7.18.2 while preserving the
selected library and verifying the route API through strict typechecking and build
tests.

The Supabase JavaScript client was not assigned a version in the specification. It
uses 2.112.3 because the initially selected 2.45.1 transitively included a vulnerable
authentication package.

This is a narrow security exception, not permission to replace locked libraries or
change product behavior. Future version changes require passing all repository gates
and a new dependency audit.

Development-only Vite, Vitest, PostCSS, and Supabase CLI pins use audited releases
identified by the package registry. These tools are not product stack substitutions;
pinning them prevents known local-server, file-read, and archive extraction
vulnerabilities in the development toolchain.

TypeScript 5.9.3 replaces the specified 5.5.x compiler because the audited Vite
plugin publishes standards-compliant declaration syntax introduced after 5.5. The
project retains every strictness flag and verifies the same application contracts.

## ADR-002 — Base44 remains the host, Supabase remains the data authority

**Status:** accepted

Journi uses Base44 for the SPA build and hosting lifecycle. The locked specification
still assigns authentication, Postgres data, storage, realtime subscriptions, and
Edge Functions to Supabase. Base44 entities and functions must not silently duplicate
those resources.

The required Base44 CLI currently pins vulnerable patch releases of Esbuild and
Undici transitively. Package overrides retain the current CLI while applying patched,
API-compatible releases until Base44 updates its own dependency pins.
