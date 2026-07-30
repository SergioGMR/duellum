## Exploration: public-og-results

### Current State

Duellum is a React 19 / TypeScript 5.9 / Vite 8 static SPA. `src/App.tsx` owns an in-memory view state with no URL router; `src/storage/appStorage.ts` persists private brackets and runs to `localStorage`; `src/main.tsx` always boots the SPA. There is no `api/` directory, `vercel.json`, server runtime, or public result route.

The completed result is derived locally from `DecisionBracket` and `TournamentSnapshot`. `src/screens/ResultScreen.tsx` currently prepares a 1200×630 PNG immediately for local download, but its Share, WhatsApp, and Telegram actions currently use `window.location.href`, which is the local SPA URL and does not identify the completed result to another device. `src/share/resultImage.ts` contains a browser-only Canvas renderer, Web Share helpers, and direct-platform URL builders. The Canvas renderer has useful visual primitives, but uses browser font fallbacks and has only approximate wrapping/truncation.

The working tree already contains unrelated/uncommitted bulk-option, sharing, component-test, package-manager, and test-configuration changes. They are the baseline and must remain untouched. The OpenSpec config confirms strict TDD, `pnpm test`, component tests through Testing Library/jsdom, and no E2E or coverage runner.

The approved product boundary is private-by-default: no public result is created when a tournament completes. Pressing a share action creates a seven-day public result represented only by a compact, opaque token. A stateless server validates/decrypts that token and serves both the HTML result page and a server-generated 1200×630 Open Graph image. No database, blob store, cleanup job, or early revocation is available.

Vercel evidence supplied and verified: Functions can be added to this Vite project; `vercel.json` can rewrite dynamic path segments to API routes; `ImageResponse` supports 1200×630 output, custom embedded fonts, and response headers. `ImageResponse` defaults to `public, immutable, max-age=31536000`, so the image route must override that header with the token's remaining lifetime.

### Affected Areas

- `src/screens/ResultScreen.tsx` — make each share intent lazily mint/reuse a public URL, keep the result private until intent, handle pending/retry states, and ensure native/WhatsApp/Telegram share the public route rather than the local SPA URL.
- `src/share/resultImage.ts` — retain the Canvas path for independent local download or replace it with a public-image download only after a token exists; extract pure result-data/formatting rules so browser and server renderers cannot silently diverge.
- `src/App.tsx`, `src/main.tsx` — keep local navigation/private persistence intact; do not make tournament completion or SPA boot publish anything.
- `api/` (new) — a creation endpoint and generic HTML/image handlers. The token codec must be shared by handlers but runtime-neutral.
- `vercel.json` (new) — order `/r/:token/og.png`, then `/r/:token`, then the catch-all `/index.html` SPA fallback. The public routes must win before the fallback.
- `api`/shared validation and formatter modules (new) — bounded input, Unicode-safe normalization, deterministic two-line wrapping/truncation, HTML escaping, cache calculation, and token version/key selection.
- `package.json`, `pnpm-lock.yaml` — add the server image dependency (likely `@vercel/og`) and any Vercel handler typings; these are already modified in the baseline, so changes must be isolated and reviewed carefully.
- `public/` or a server-bundled font asset (new) — provide a licensed embedded font for `ImageResponse`; no font asset currently exists, and the client only declares CSS fallbacks.
- `src/**/*.test.*`, `api/**/*.test.*` (new/updated tests) — strict TDD coverage for codec, routes, metadata, OG layout contracts, expiry, and ResultScreen behavior.

### Approaches

1. **Versioned authenticated-encrypted token (recommended)** — POST only on share intent; the server validates bounded result data and emits a token such as `v1.<kid>.<base64url(iv)>.<base64url(ciphertext+tag)>`. The compact payload contains only a schema version, expiry, title, winner, option count, and decision count. AES-256-GCM with a fresh 96-bit nonce hides the result and authenticates every field. A server-only active-key map is selected by `kid`; previous keys remain available for at least the seven-day lifetime plus rollout/clock safety.
   - Pros: satisfies the opaque/decrypt requirement; stateless; tamper-resistant; no result data in browser history or social URLs; supports key rotation and generic handlers.
   - Cons: larger and more operationally sensitive than a signature; Web Crypto/runtime compatibility and secret provisioning need explicit tests; bearer URLs cannot be revoked before expiry.
   - Effort: Medium/High

2. **Readable signed payload** — encode the compact JSON payload in the URL and append an HMAC signature, for example `base64url(payload).signature`; validate the signature and expiry without decrypting.
   - Pros: simplest implementation, small CPU cost, easy debugging, straightforward key rotation.
   - Cons: leaks the title, winner, and counts to URLs, logs, browser history, and third-party previews; does not meet the approved opaque/decrypt boundary; still needs strict validation and expiry handling.
   - Effort: Medium

3. **Opaque random ID backed by storage** — generate a random ID and store the result server-side.
   - Pros: shortest URLs, easy revocation, payload can grow without URL concerns.
   - Cons: explicitly violates the approved stateless/no-storage architecture; requires a database/blob lifecycle and cleanup job; introduces availability and privacy coupling.
   - Effort: High; rejected

### Recommendation

Use approach 1 with a small, runtime-neutral token codec and two public read routes:

1. `POST /api/public-results` accepts only the result fields needed for the card. It enforces a small JSON body limit before parsing, trims and validates title/winner strings, rejects control characters/oversized UTF-8 payloads, and accepts only bounded integer counts (`2..16` options and the valid decision range). The server, never the client, sets `iat`/`exp` and encrypts the canonical payload. The client caches the successful URL by the current `resultKey`; repeated share clicks reuse it. A failed request may be retried and can produce a new token, because exact-once deduplication is impossible without state.
2. Public URLs should be `/r/<token>` and `/r/<token>/og.png`. Rewrite the image path first to an image handler, the HTML path second to an HTML handler, and the final `/(.*)` rewrite last to `/index.html`. This preserves the existing SPA for all other paths while ensuring crawlers never receive the SPA shell for a public result.
3. Both handlers should reject a malformed path/token before decryption (allowed token alphabet and a hard URL/token length cap, e.g. 2 KiB), select the key by `kid`, authenticate/decrypt, validate the payload again, and calculate `remainingSeconds` from the server clock. Malformed/authentication failures should return generic `404` with `Cache-Control: no-store`; a valid but expired token should return generic `410` with `no-store`. Do not reveal whether a token was once valid. Do not add an expiry grace period: a seven-day public exposure boundary is clearer than accepting expired bearer links.
4. Successful HTML and image responses should use `Cache-Control: public, max-age=0, s-maxage=<remainingSeconds>, must-revalidate` (or the closest Vercel-supported equivalent), with `<remainingSeconds>` derived from the token on every request and never greater than its remaining lifetime. Do not use `ImageResponse`'s one-year immutable default. Avoid stale-while-revalidate beyond expiry. Add a small not-found/expired response policy only if platform caching requires it; otherwise use `no-store` for errors.
5. The HTML route should escape every user value and emit a polished server-rendered result shell plus `title`, description, canonical URL, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width=1200`, `og:image:height=630`, and `twitter:card=summary_large_image`. The image route should use `ImageResponse`, an embedded licensed font, fixed 1200×630 dimensions, strong contrast, safe margins, winner-dominant hierarchy, stats/branding, and the same palette/copy as `ResultScreen`.
6. Do not import the DOM Canvas renderer into server functions. Keep it for local download unless product design later chooses to download the server image after publication. Extract shared pure data validation and deterministic text layout rules instead: word-boundary wrapping, hard-break handling, ellipsis truncation, and an explicit maximum of two question/winner lines. Tests should assert the layout model and coordinates/margins rather than rely on fragile pixel snapshots. This keeps local download resilient while giving social crawlers a deterministic, embedded-font image.
7. Treat every share control as an intent that can call `ensurePublicResult()`. Native Share should receive `{ title, text, url: publicUrl }`; WhatsApp and Telegram should be buttons/links built from the same `publicUrl`, never from `window.location.href`. For popup-blocker safety, open a blank named window synchronously on direct-platform click and navigate it after minting, or render the external anchor only after the URL exists. Show a retryable failure without exposing a local URL. The request should not run on ResultScreen render, completion, or image-preparation effects.
8. Use Web Crypto APIs in the shared codec so HTML/image/create functions can remain compatible with their selected Vercel runtime. Keep the create/HTML handlers in the default Node.js runtime unless the implementation proves a single Edge-compatible handler is simpler; isolate the OG handler and explicitly declare its supported runtime. Do not use `VITE_` secrets. Configure production and preview secrets separately, mint with the active `kid`, accept active plus previous keys, and remove an old key only after all tokens and cache entries using it have expired. Retain old keys during rollback.

#### Strict-TDD test plan

- **Token unit tests (RED first):** round-trip Unicode values; random nonces; wrong key and wrong `kid`; tampered version/nonce/ciphertext/tag; malformed base64url and overlong tokens; payload byte/body limits; invalid strings/counts; exact expiry boundary; future timestamp/clock behavior; active/previous key rotation.
- **Route handler tests:** method/content-type/body-size validation for creation; response URL shape; generic 404 for malformed/tampered input; 410 for valid expired input; escaped HTML and complete OG metadata; image handler passes 1200×630, embedded font, and bounded cache headers to `ImageResponse`; remaining lifetime is never exceeded, including sub-second boundaries.
- **Layout contract tests:** deterministic wrapping/truncation for long questions and winners, at most two lines, preserved legibility, ellipsis behavior, safe crop margins, winner-dominant sizing, stats/branding, and contrast tokens. Mock `ImageResponse` rather than snapshotting generated PNG bytes.
- **ResultScreen tests:** no create request on render; one request per result/share intent; successful URL reuse; retry after failure; native share receives the public URL; direct WhatsApp/Telegram builders receive the public URL; image-preparation failure does not block public sharing; changed result invalidates the cached URL. Existing local download tests remain baseline coverage.
- **Deployment smoke checks:** on a Vercel preview, request the HTML URL as a crawler and the image URL as a PNG, verify SPA routes still load, inspect headers near expiry, and exercise WhatsApp/Telegram URL targets. There is currently no E2E runner, so this must be an explicit preview/production verification step.

#### Delivery and rollback

This is a cross-boundary change (client, functions, routing, dependency, font, and tests) and is likely to exceed the configured 400 changed-line review budget. `auto-forecast` should therefore recommend chained PR slices unless the task breakdown proves otherwise: (1) codec/validation/tests, (2) HTML/image functions and rewrites, (3) share-flow integration and component tests, (4) deployment/docs/smoke verification. A static deployment rollback can restore the old SPA, but old public links will fail if the rollback removes the rewrites/functions. Preserve token keys and route compatibility during rollback; do not rotate away keys used by still-live seven-day links.

### Risks

- **Bearer-link exposure:** anyone with a public URL can view the result until expiry; there is no stateless revocation. The URL must contain no unnecessary data, and logs/analytics should avoid recording decrypted payloads.
- **Runtime mismatch:** `@vercel/og`, Vercel handler style, and Web Crypto must be tested in the selected function runtime; a Node-only codec imported by an Edge image handler would fail at build or request time.
- **Cache expiry drift:** default immutable image caching or `stale-while-revalidate` can outlive the token. Header calculation and near-expiry tests are mandatory.
- **Unbounded user text:** the current editor has no title/name length limit. Server-side byte and Unicode limits are required to control token size, HTML response size, social URL length, and OG layout.
- **Share activation timing:** an async mint request can lose native-share user activation or trigger popup blocking. The UI needs explicit pending/retry behavior and a blank-window/direct-link strategy.
- **Visual divergence:** Canvas and Satori have different measurement/layout models. Shared formatting rules, an embedded font, and layout-contract tests reduce drift but do not make the renderers pixel-identical.
- **Abuse without storage:** statelessness prevents application-level per-token counters and exactly-once creation. Body limits, bounded output, CDN caching, platform/WAF rate limiting, and conservative function limits are required.
- **Deployment rollback:** reverting routing or the server dependency breaks already distributed public URLs even though no stored records are lost.

### Ready for Proposal

Yes. The approved architecture is sufficiently constrained for a proposal/design phase. The proposal should explicitly lock the token schema/key-rotation contract, concrete title/winner/body/token limits, `/r/:token` route names, direct-link popup behavior, runtime choice for the OG handler, and the 400-line delivery forecast before implementation begins.
