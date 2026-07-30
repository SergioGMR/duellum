# Tasks: Public OG Results

Baseline: preserve all current uncommitted changes; do not reset, format, stage, commit, or absorb them.

## Review Workload Forecast

| Field | Value |
|---|---|
| Total estimate | ~2,050 text lines + 2 binary fonts |
| 400-line budget risk | High overall; U3a/U3b handwritten scope <400 |
| Chained PRs | Yes; 7 work units including one corrective unit |
| Delivery / chain | auto-chain / feature-branch-chain |
| Exception | U3a only: 452 generated `pnpm-lock.yaml` lines for `@vercel/og` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

No other size exception is approved. The restored U3 candidate (683 text additions plus two binary fonts) is blocked-attempt planning evidence only; it retained no U3 changes or completed progress.

| Unit / base | Scope and estimate | Verify / runtime harness | Rollback |
|---|---|---|---|
| U1 / tracker | Codec, actual 347 | `pnpm test`; N/A unit | U1 files |
| U2 / U1 | Readers, actual 353 | focused API tests; N/A handler | U2 files |
| U3a / U2 | fonts/loader; 452 generated + ~180 handwritten | font tests; N/A Edge unit | manifest, lock, assets, loader |
| U3b / U3a | layout/handler/routes; ~260 handwritten | OG tests; mock `ImageResponse` (preview in U5) | layout, handler, rewrites |
| U4 / U3b | Client, ~320 | `pnpm test`; jsdom | U4 files |
| U3a-C / U4 | exact local-TTF coverage and bounded unsupported-publication gates; no generated assets | focused font/API/OG/client tests | coverage parser, gates, error paths |
| U5 / U4 | Preview proof, ~140 | test/check/build + curl | docs only |

Each child targets its immediate parent branch; rebase/retarget polluted diffs before review.

## Phase 1: Foundation

- [x] 1.1 **U1:** RED add `api/_lib/{validation,codec}.test.ts` (bytes, Unicode, counts, AAD, TTL, expiry/future, rotation); GREEN add `api/_lib/{validation,codec,http}.ts` plus API test discovery/dependency changes in `package.json`, lockfile, `tsconfig.json`, `vite.config.ts`; REFACTOR clocks/keys.

## Phase 2: Mint and HTML

- [x] 2.1 **U2:** RED add `api/{public-results,public-result}.test.ts` (exact POST, origin, opaque URL, 404/410, escaped metadata/cache); GREEN add `api/_lib/{origin,html}.ts` and `api/public-{results,result}.ts`; REFACTOR shared responses without weakening `no-store` failures.

## Phase 3: OG and Routing

- [x] 3.1 **U3a RED (depends U2):** add `api/_lib/font.test.ts` for literal bundled URLs, module caching, buffers, failure/no fallback, and `@vercel/og` config.
- [x] 3.2 **U3a GREEN:** add `@vercel/og` to `package.json`/`pnpm-lock.yaml`, `api/_assets/fonts/{Inter-Regular.ttf,Inter-Black.ttf,OFL.txt}`, and Edge-safe `api/_lib/font.ts`.
- [x] 3.3 **U3a REFACTOR/verify:** keep deterministic cache; run focused font/config tests. Roll back only U3a files; the 452 generated-lock-line exception excludes all handwritten lines.
- [x] 3.4 **U3b RED (depends U3a):** add `api/_lib/layout.test.ts` and `api/public-result-og.test.tsx` for graphemes/two lines, 1200×630, headers, expiry/error `no-store`, and rewrite order.
- [x] 3.5 **U3b GREEN:** add `api/_lib/layout.ts`, `api/public-result-og.tsx`, and ordered image/HTML/SPA rewrites in `vercel.json`.
- [x] 3.6 **U3b REFACTOR/verify:** preserve deterministic layout/cache semantics; run focused OG tests with mocked `ImageResponse`. Roll back only layout, handler, and rewrites.
- [x] 3.7 **U3a-C RED:** add exact bundled-TTF cmap coverage tests and mint/OG unsupported-glyph tests for stable `422` publication errors without text/code-point echo or remote fetch.
- [x] 3.8 **U3a-C GREEN:** derive glyph coverage from the loaded local font buffers; block unsupported publication before token creation and before OG rendering; surface a bounded client error while preserving private/local behavior.
- [x] 3.9 **U3a-C REFACTOR/verify:** preserve local-font failure semantics, deterministic coverage caching, no remote fallback, and focused/full validation. Roll back only coverage and its call sites/tests.

## Phase 4: Client Sharing

- [x] 4.1 **U4:** RED add `src/share/publicResult.test.ts` and extend `src/screens/ResultScreen.test.tsx` (no implicit mint, coalescing/invalidation, two gestures, synchronous second native share, retry, stale-mint fingerprint success/failure); GREEN add `src/share/publicResult.ts` and update `ResultScreen.tsx` for prepare-only click one, ready click two, and popup/anchor direct targets; REFACTOR states, preserving local `resultImage.ts` download.

## Phase 5: Preview Verification

- [ ] 5.1 **U5:** document `docs/public-result-sharing.md` with Preview/Production active+previous keyrings and `PUBLIC_RESULT_ORIGIN` names only, seven-day rollback retention, and Vercel preview curl smoke for both public routes, headers, and SPA fallback; execute `pnpm test && pnpm run check && pnpm run build`, record no secrets/tokens.
