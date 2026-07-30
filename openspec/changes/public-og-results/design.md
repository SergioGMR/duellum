# Design: Public OG Results

## Technical Approach

Add three Edge Vercel Functions to the Vite SPA: intent-only minting plus HTML and 1200×630 PNG readers. They share stateless AES-256-GCM validation; the browser Canvas download stays local and independent.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Token, keys, time | Emit `v1.<kid>.<iv>.<ciphertext+tag>` with fresh 12-byte IV, 32-byte server-only key, and UTF-8 AAD `public-result:v1:<kid>`. Parse four ASCII/base64url segments; reject duplicate decoded key bytes as well as duplicate `kid`s. Set `iat=floor(now/1000)`, `exp=iat+604800`, then revalidate the authenticated payload. | AAD and unique bytes make version/`kid` tampering generic `404`. After authentication and structural validation, `iat > now` is `404` (no grace); only then is `now >= exp` `410`. |
| Mint boundary | Accept only `POST application/json` objects with exactly `title`, `winner`, `optionCount`, `decisionCount`. Count raw bytes and cancel at 4,097 before fatal UTF-8 decode/JSON parsing. Enforce title 1–256 UTF-8 bytes, winner 1–128 UTF-8 bytes, options integer 2–16, `decisionCount === optionCount - 1`; reject token length >2,048 URL-safe ASCII characters before decoding. | Enforces the specified wire contract and bounded processing. |
| Unicode | Before trimming, reject lone surrogate code units and C0/C1 controls, including JSON escapes. Remove only edge `[U+0020 U+00A0 U+1680 U+2000–U+200A U+2028 U+2029 U+202F U+205F U+3000]`, NFC-normalize, then byte-measure. Decode decrypted JSON fatally; do not collapse internal Unicode. | Escaped surrogates evade UTF-8 decoding; scanning first prevents controls being trimmed away while preserving valid content. |
| Absolute origin | `origin.ts` accepts only HTTPS, origin-only server configuration without credentials/query/fragment. Production requires `PUBLIC_RESULT_ORIGIN`; Preview uses it or validated `https://${VERCEL_URL}`. Invalid/missing configuration is `500, no-store`; never use `Host` or `VITE_`. | Canonical/OG URLs resist host poisoning and target the current preview or configured production deployment. |
| Fonts and image | Store curated SIL OFL 1.1 subsets of `Inter-Regular.ttf`, `Inter-Black.ttf`, and `OFL.txt` in `api/_assets/fonts/`. The subset covers Latin, accents, combining marks, punctuation, and card symbols; `font.ts` module-caches `fetch(new URL('../_assets/fonts/Inter-Regular.ttf', import.meta.url))` and `fetch(new URL('../_assets/fonts/Inter-Black.ttf', import.meta.url))`, checks `ok`, and supplies their buffers to `ImageResponse.fonts`. Derive exact cmap coverage from those same buffers before minting and before rendering; unsupported title/winner glyphs return bounded `422` publication errors without echoing text, while font/image failures remain generic `500, no-store`. Never remote-fetch or fall back. | Static literal subset URLs keep the Edge function below the Hobby size limit without `fs`; exact asset-derived coverage prevents `@vercel/og` from requesting remote subsets or producing illegible glyphs. |
| Readers and client | Rewrite image, HTML, then SPA fallback. Escape HTML and emit absolute required OG/Twitter metadata; deterministic grapheme-safe two-line layout uses 64px margins, 4.5:1 contrast, dominant winner, stats, branding. Success cache is `public, max-age=0, s-maxage=floor(exp-now), must-revalidate`; errors are `no-store`. `ensurePublicResult` coalesces unchanged data, invalidates changes, and runs only from native/WhatsApp/Telegram intent. Native sharing uses the explicit `idle`/`preparing`/`ready`/`failed` state machine below; direct targets remain separate and reserve a popup or use a post-mint anchor. | Preserves transient user activation, local-first privacy, cache expiry, route precedence, and independent download. |
| Toolchain | Set `tsconfig.json` `include` to `['src', 'api/**/*.ts', 'api/**/*.tsx', 'vite.config.ts', 'eslint.config.js']`. Set Vitest `include` to `['src/**/*.test.{ts,tsx}', 'api/**/*.test.{ts,tsx}']`, retain `environment: 'node'`, and require `// @vitest-environment jsdom` in browser/component files. | API tests remain Node; browser tests, such as `ResultScreen.test.tsx`, alone opt into jsdom; source and tests are checked/discovered. |

## Data Flow

```text
native click 1 (idle/failed) -> preparing -> bounded POST -> ready; no navigator.share
native click 2 (ready) --------------------> synchronous navigator.share({title,text,url})
WhatsApp/Telegram intent -> reserved popup or post-mint anchor -> bounded POST/reuse -> direct URL
render/completion/local Canvas download ----------------------------------------------> no mint
/r/token | /r/token/og.png -> ordered rewrite -> authenticate -> HTML/PNG
```

## Client State Machine and UI Contract

| State | Native UI and transition |
|---|---|
| `idle` | No URL is ready. The native action starts `ensurePublicResult`, immediately enters `preparing`, communicates “Preparing link…”, and returns without calling `navigator.share()`. |
| `preparing` | One mint is in flight for the captured result fingerprint. Further unchanged intents coalesce. At completion, the handler MUST read the current result fingerprint and compare it with the captured fingerprint before any state or feedback write. Only an equal-fingerprint success stores `{ url, expiresAt }` and enters `ready`; only an equal-fingerprint failure enters `failed`. A stale success or failure is ignored without changing the current state or feedback. |
| `ready` | The URL and matching result fingerprint are retained and the native control reads “Share result”. A distinct click MUST call `navigator.share({ title, text, url })` synchronously in the event handler before any `await`; only the returned promise is awaited for feedback. Cancellation or failure keeps the state and URL `ready`, so another click retries without reminting. |
| `failed` | No URL is ready. The native retry action starts minting, immediately enters `preparing`, and communicates “Preparing link…” without calling `navigator.share()`. |

A changed result invalidates any `ready` URL, advances the result fingerprint, and returns native sharing to `idle`. Each mint completion MUST compare its captured fingerprint with the current result fingerprint at settlement before updating state or feedback; a stale success or failure MUST be ignored and MUST NOT overwrite the newer result's state or feedback. Rendering, result completion, and local PNG download MUST NOT call `ensurePublicResult` or otherwise mint. WhatsApp and Telegram remain direct-service branches: each uses the same unchanged-result coalescing but follows the synchronously reserved popup or post-mint anchor contract and never calls `navigator.share()`.

## File Changes

| File | Action | Description |
|---|---|---|
| `api/_lib/{codec,validation,origin,http,html,layout,font}.ts` | Create | Edge contracts, crypto, URLs, rendering, cache. |
| `api/public-{results,result,result-og}.ts[x]`, `api/**/*.test.{ts,tsx}` | Create | Mint/read handlers and TDD tests. |
| `api/_assets/fonts/{Inter-Regular.ttf,Inter-Black.ttf,OFL.txt}` | Create | Bundled licensed fonts. |
| `src/share/publicResult.ts`, `src/screens/ResultScreen.tsx` | Create/Modify | Intent, reuse/retry, public sharing. |
| `vercel.json`, `package.json`, lockfile, `tsconfig.json`, `vite.config.ts` | Create/Modify | Routes, dependency, checking. |

## Interfaces / Contracts

`POST /api/public-results` receives only `{ title, winner, optionCount, decisionCount }` and returns `201 { url, expiresAt }`. Unknown version/key, malformed/AAD/authentication, Unicode, future, and invalid payload failures are `404`; only authenticated, valid expired payloads are `410`.

## Testing Strategy

Strict TDD begins RED. Unit/handler cases assert 4,096/4,097-byte bodies; 2,048/2,049-char tokens; title 256/257 and winner 128/129 byte limits; exact keys; `decisionCount === optionCount - 1`; TTL 604800; `iat=now+1` `404`; authenticated expiry `410`; malformed expiry `404`; nonce/rotation; and AAD version/`kid` tampering `404` or duplicate-key configuration rejection. Unicode cases cover invalid UTF-8, escaped surrogates, C0/C1 before trim, permitted edge trim/NFC, and unchanged internal multilingual whitespace. Test Host-independent preview/prod origins; bundled font/OFL, 1200×630, and load `500 no-store`; no render/completion/download mint, reuse/invalidation/retry, native/direct URLs, layout/metadata/cache/rewrite behavior. Client RED tests use a deferred mint promise and same-stack sentinel to prove the first native click never calls `navigator.share()`, same-fingerprint mint completion enters `ready` and changes the control to “Share result”, and the distinct second click invokes `navigator.share({ title, text, url })` synchronously before awaited work. Rejected/cancelled share promises MUST preserve the ready URL for a new-gesture retry. Race tests MUST change the result fingerprint before settling deferred mint success and failure, then assert that neither stale completion overwrites the newer result's state or feedback. WhatsApp/Telegram tests MUST retain the popup/anchor behavior and MUST NOT call `navigator.share()` or require the native second gesture. Mock `ImageResponse`, not PNGs. Preview smoke tests crawl both routes and SPA fallback; no E2E runner exists.

## Migration / Rollout

No migration. Deploy keys, origins, fonts, functions, and rewrites before UI; use separate Preview/Production keyrings. Rollback may stop minting but retains readers and active/previous keys through token/cache lifetime. Ship codec/tests, routes/OG, client flow, and smoke documentation in slices below 400 changed lines.

## Open Questions

None.
