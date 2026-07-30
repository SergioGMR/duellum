# Apply Progress: Public OG Results

**Mode:** Strict TDD · **Delivery:** auto-chain / feature-branch-chain · **Completed slices:** U1 Codec, U2 Readers, U3a Fonts/Loader, U3b OG/Routing, U4 Client Sharing, U3a-C Glyph Coverage · **Retry:** 1/1

**Judgment Day:** U1 and corrected U2 are approved; U3a starts from the approved U2 boundary.

## Completed Tasks
- [x] 1.1 U1 — bounded validation, stateless AES-256-GCM codec, and cache-header helpers.
- [x] 2.1 U2 — bounded mint handler, trusted-origin HTML reader, and shared no-store responses.
- [x] 3.1 U3a RED — exact bundled-font/cache/failure and `@vercel/og` configuration tests.
- [x] 3.2 U3a GREEN — exact dependency, generated lockfile, licensed Inter assets, and Edge-safe loader.
- [x] 3.3 U3a REFACTOR/verify — deterministic success cache, explicit failure, and focused/full checks.
- [x] 3.4 U3b RED — deterministic grapheme-safe layout and OG handler/rewrite contract tests.
- [x] 3.5 U3b GREEN — local-font 1200×630 PNG Edge handler and ordered Vercel rewrites.
- [x] 3.6 U3b REFACTOR/verify — compact wrapping/cache logic and focused/full verification.
- [x] 3.7 U3a-C RED — exact local-TTF cmap and unsupported-publication contract tests.
- [x] 3.8 U3a-C GREEN — asset-derived coverage gates for minting/OG plus bounded client feedback.
- [x] 3.9 U3a-C REFACTOR/verify — cached deterministic parser/gates and full validation.
- [x] 4.1 U4 — bounded client mint/reuse, explicit native two-gesture states, direct-service popup sharing, and stale-result guards.

## TDD Cycle Evidence
| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1 | `api/_lib/{validation,codec}.test.ts` | Unit | ✅ retry baseline 13/13 (prior 44/44) | ✅ initial missing-module failure; retry canonical-byte assertion RED | ✅ 13/13 after canonical wire fix | ✅ exact 256/257, 128/129, 2/1, 1/17, authenticated malformed `exp`, rotation | ✅ canonical byte assertion; focused 13/13 |
| 2.1 | `api/{public-results,public-result}.test.ts` | Node handler/unit | ✅ focused U1/U2 baseline 18/18 | ✅ corrective RED: initial suite exposed missing Edge config, `{path}` response, and no 4,097-byte cancellation; post-config targeted run also exposed development `VERCEL_URL` fallback | ✅ Edge contract 1/1; corrected U2 7/7 | ✅ absolute opaque URL/no plaintext; exact cancellation; preview/production/development origin cases; partial cache TTL; complete escaped canonical/OG/Twitter metadata | ✅ no source refactor needed; focused U2 7/7 remained green |
| 3.1 | `api/_lib/font.test.ts` | Node unit | N/A (new test) | ✅ test first failed because `@vercel/og` was absent; after dependency install it re-failed with missing `./font` (2/2) | ✅ 3/3 after U3a loader/assets | ✅ exact local Regular/Black URLs, descriptor weights/buffers, non-OK and transport failures | ✅ loader error/cache cleanup verified in 3.3 |
| 3.2 | `api/_lib/font.test.ts` | Node unit | ✅ pre-U3a `pnpm test` 65/65 | ✅ missing `./font` after dependency-only install | ✅ 2/2 with exact dependency, descriptor, and no-fallback behavior | ✅ completed by the transport-failure case in 3.3 | ✅ no behavior change during 3.3 |
| 3.3 | `api/_lib/font.test.ts` | Node unit | ✅ 2/2 before triangulation/refactor | ✅ approval coverage: 2/2 before source cleanup | ✅ 3/3 after extracting explicit error constant | ✅ transport rejection proves the same explicit failure path | ✅ focused 3/3 after deterministic cache/error cleanup |
| 3.4 | `api/_lib/layout.test.ts`, `api/public-result-og.test.tsx` | Node unit/handler | N/A (new files) | ✅ focused command failed with both missing `./_lib/layout` and `./public-result-og` modules | ✅ 7/7 after layout/handler/rewrite implementation and mock-harness correction | ✅ spaced/unspaced graphemes; valid, malformed, expired, font-failure, and rewrite-order cases | ✅ extracted `lastWhitespace`; focused 7/7 |
| 3.5 | `api/public-result-og.test.tsx` | Node handler | N/A (new handler) | ✅ missing handler module | ✅ mocked `ImageResponse` observed 1200×630, bundled descriptors, cache headers, and visible winner | ✅ valid, route-shape, expiry, render failure, and no-fetch cases | ✅ spread readonly font descriptors only at the mutable `ImageResponse` boundary; 7/7 |
| 3.6 | `api/_lib/layout.test.ts`, `api/public-result-og.test.tsx` | Node unit/handler | ✅ U3a safety net 24/24 | ✅ existing behavior was constrained by the new contract tests | ✅ 7/7 focused | ✅ all U3b acceptance branches in 7 tests | ✅ post-refactor focused 7/7; full suite/lint/build/check green |
| 3.7 | `api/_lib/font.test.ts`, `api/public-results.test.ts`, `api/public-result-og.test.tsx`, `src/share/publicResult.test.ts`, `src/screens/ResultScreen.test.tsx` | Node unit/handler + jsdom component | ✅ 5 files / 22 tests | ✅ test-first run: 5 files / 30 tests, 7 failed and 23 passed because coverage exports, mint/OG gates, and client mapping were absent | ✅ 5 files / 30 tests | ✅ real bundled Regular/Black assets accept `Café`/`Árbol`, reject Arabic/keycap coverage, reject malformed cmap, and cover mint/OG/client rejection boundaries | ✅ parser/gates implemented only after RED |
| 3.8 | Same focused coverage/API/OG/client files | Node unit/handler + jsdom component | ✅ RED evidence above | ✅ prior RED retained | ✅ 5 files / 30 tests | ✅ `422` opaque mint failure, generic authenticated OG failure before `ImageResponse`, exact-only client error recognition, and direct-popup cleanup | ✅ post-GREEN compact parser and bounded error path retained focused green |
| 3.9 | Same focused coverage/API/OG/client files | Node unit/handler + jsdom component | ✅ 5 files / 30 tests | ➖ verification/refactor task; prior 3.7 RED governs production behavior | ✅ 5 files / 30 tests | ✅ malformed parser, remote-free local URL fetch seam, stale URL remint, native retry, and private local download remain covered | ✅ corrected cmap format-4 binary search/delta handling; lint/build/diff check and full suite green |
| 4.1 | `src/share/publicResult.test.ts`, `src/screens/ResultScreen.test.tsx` | Node unit + jsdom component | ✅ existing `ResultScreen` safety net 7/7 | ✅ new client test failed on missing `./publicResult`; combined suite then failed on unresolved client import | ✅ final focused 2 files / 11 tests after client/state/popup implementation, expiry remint, and mock-export correction | ✅ pending/reused/changed/malformed client inputs; expiry remint; first/second native gestures; cancellation retry; stale success/failure; WhatsApp/Telegram success/failure | ✅ reused `buildResultShareText`; replaced render-time ref mutation with layout-effect synchronization; focused suite remained green |

## Verification
- Safety net before corrective U2 work: `pnpm exec vitest run api/_lib/validation.test.ts api/_lib/codec.test.ts api/public-results.test.ts api/public-result.test.ts` — 18/18 passed.
- Corrective RED: new tests failed before source changes on Edge config, authoritative `{ url, expiresAt }`, byte-4,097 cancellation, and development `VERCEL_URL` fallback. The strengthened reader assertions passed as approval coverage because the existing renderer already supplied the required fields and remaining-lifetime cache behavior.
- GREEN: `pnpm exec vitest run api/public-results.test.ts api/public-result.test.ts` — 7/7 passed.
- Focused U1/U2: `pnpm exec vitest run api/_lib/validation.test.ts api/_lib/codec.test.ts api/public-results.test.ts api/public-result.test.ts` — 20/20 passed.
- Full suite: `pnpm test` — 11 files / 64 tests passed.
- Quality: `pnpm run lint`, `pnpm run build`, and `git diff --check` passed.

## U3a Fonts/Loader
- Safety net: `pnpm test` before U3a — 11 files / 65 tests passed.
- RED: `pnpm exec vitest run api/_lib/font.test.ts` first failed because `@vercel/og` was missing; after installing the exact dependency it re-established RED with both cases failing on missing `./font`.
- GREEN: added the exact `@vercel/og@0.11.1` dependency, generated lock entries, Inter Regular/Black TTFs, OFL text, and `loadOgFonts`; focused test passed 2/2.
- TRIANGULATE: added a rejected-`fetch` case; focused test passed 3/3 and proves non-OK and transport failures both surface `Unable to load bundled OG font` without a filesystem, remote, or default-font fallback.
- REFACTOR: extracted the explicit error factory/constant while preserving a module-level successful-load promise that reuses the same `ArrayBuffer` descriptors and clears only a failed load for retry.
- Focused U3a: `pnpm exec vitest run api/_lib/font.test.ts` — 3/3 passed.
- Focused U1–U3a: `pnpm exec vitest run api/_lib/validation.test.ts api/_lib/codec.test.ts api/public-results.test.ts api/public-result.test.ts api/_lib/font.test.ts` — 24/24 passed.
- Full suite: `pnpm test` — 12 files / 68 tests passed.
- Quality: `pnpm run lint`, `pnpm run build`, and `git diff --check` passed.
- Compatibility proof: the focused test imports `ImageResponse` from `@vercel/og`, asserts exact manifest version `0.11.1`, and observes the two static `new URL(..., import.meta.url)` file URLs; current Vercel documentation supports this Edge-safe font-loading pattern.

## U3b OG/Routing
- Safety net: `pnpm exec vitest run api/_lib/validation.test.ts api/_lib/codec.test.ts api/public-results.test.ts api/public-result.test.ts api/_lib/font.test.ts` — 5 files / 24 tests passed before U3b changes.
- RED: `pnpm exec vitest run api/_lib/layout.test.ts api/public-result-og.test.tsx` — 2 suites failed before production code because `./layout` and `./public-result-og` did not exist.
- GREEN: added deterministic `Intl.Segmenter` two-line layout, the Edge image handler, and ordered rewrites; the focused suite passed 2 files / 7 tests after correcting test-harness matcher and mock reset defects discovered during the first run.
- TRIANGULATE: tests cover spaced and unspaced overflow, ZWJ grapheme preservation, truncation ellipsis, card geometry/contrast/type hierarchy, valid cached PNG behavior, malformed/expired/generic no-store errors, local-font descriptors, no `fetch`, and rewrite order.
- REFACTOR: extracted reverse whitespace lookup for ES2022 compatibility and spread the readonly local-font result only at `ImageResponse`'s mutable descriptor boundary; the focused suite remained 2 files / 7 tests passed.
- Focused U3b: `pnpm exec vitest run api/_lib/layout.test.ts api/public-result-og.test.tsx` — 2 files / 7 tests passed.
- Runtime harness: `pnpm exec vitest run api/public-result-og.test.tsx` — 1 file / 4 tests passed; exercises signed valid/malformed/expired requests through the handler and captures its `ImageResponse` invocation. A deployed Vercel preview smoke remains intentionally in U5.
- Full suite: `pnpm test` — 14 files / 75 tests passed.
- Quality: `pnpm run lint`, `pnpm run build`, and `git diff --check` passed.

## U3b Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run api/_lib/layout.test.ts api/public-result-og.test.tsx` — exit 0; 2 files / 7 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec vitest run api/public-result-og.test.tsx` — exit 0; 1 file / 4 tests passed, invoking the signed URL handler with mocked `ImageResponse`; preview deployment smoke is U5 scope. |
| Rollback boundary | Revert only `api/_lib/layout.ts`, `api/_lib/layout.test.ts`, `api/public-result-og.tsx`, `api/public-result-og.test.tsx`, and `vercel.json`; U1–U3a and unrelated dirty files remain intact. |

## U3b Review Budget
- Handwritten implementation and test text: +248/-0 lines across layout, image handler, focused tests, and rewrites. This is below the 400-line U3b forecast and uses no generated-file exception.

## U2 Judgment Day Correction Round 1
- Finding: `U2-JD-001` — the rounded-second cache clock could emit `s-maxage=1` one millisecond before token expiry.
- Pre-fix snapshot: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-public-og-results-u2-20260729/fix-round-1-before/`.
- Safety net: focused U2 baseline passed 7/7 before the regression test was added.
- RED: the exact `exp×1000−1ms` reader test remained a valid `200` response but received `s-maxage=1` instead of `s-maxage=0`.
- GREEN: the targeted regression passed 1/1; focused U2 passed 8/8; focused U1+U2 passed 21/21.
- Boundary proof: the existing exact-expiry test remains explicit and passes with `410` plus `Cache-Control: no-store`.
- Implementation: shared `cacheHeaders(exp, nowMs)` now computes `max(0, floor((exp×1000−nowMs)/1000))`; it is body-agnostic and remains reusable by U3 image responses.
- Verification: `pnpm test` passed 11 files / 65 tests; `pnpm run lint`, `pnpm run build`, and `git diff --check` passed.

## U2 Snapshot and Review Budget
- Original U2 baseline: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-public-og-results-u2-20260729/`
- Pre-correction canonical U2 target: `u2-jd-round1-target.patch` — SHA-256 `559fd2f01c8967e100c9da1c72a65269f9c3e62ce3498023edd90d79e8d139bd`, 339 changed lines.
- Retry-only delta: `u2-retry-1.patch` — SHA-256 `bc723eb77e302a70f157d8b59b3937c8740275b5a8e5a854a06c4e89b0172514`, 196 lines.
- Pre-correction full U2 authored review count: 338 additions + 1 deletion = 339 changed lines.
- Round-1 fix-only delta: `u2-jd-round1-fix.patch` — SHA-256 `8d6743330086232cce631f31a06a153dbc41f7bc709db7fdb5de17a9e7badb48`, 13 additions + 5 deletions = 18 changed lines.
- Corrected canonical full U2 patch: `u2.patch` — SHA-256 `4dc1c38ee96ee77f7e911208f1b0ccddcdd65c5fc10b31bbaed8c6e225d35188`, 349 additions + 4 deletions = 353 changed lines (within the 400-line cap).

## U3a Snapshot and Review Budget
- Pre-U3a baseline snapshot: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-public-og-results-u3a-20260730/baseline/` (tracked diff, dirty status, untracked hashes, and copies of every pre-existing touched file).
- Implementation-only patch: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-public-og-results-u3a-20260730/u3a.patch` — SHA-256 `8544dac1340bc8d4eb590b65724fdf71896a03ef81c7704f2070a155e94e7483`; `git apply --check --reverse` passed.
- Generated exception: `pnpm-lock.yaml` is exactly +452/-0 lines relative to the snapshot. This is the sole approved `size:exception`, limited to generated `@vercel/og` resolution data.
- Handwritten implementation text: +191/-0 lines: `package.json` +1, `font.ts` +42, `font.test.ts` +56, and `OFL.txt` +92. This is below the 400-line handwritten review budget; no exception covers it.
- Binary assets: `Inter-Regular.ttf` 411,640 bytes, SHA-256 `40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82`; `Inter-Black.ttf` 419,968 bytes, SHA-256 `6342d3ea6dc088b43867f615e807d898adf100c93edb978b8e52c5eb71a264da`.
- Scope check: no layout, OG handler, `ImageResponse` invocation, `vercel.json`, client, or documentation changes; no staging, commit, branch, or PR.

## U4 Client Sharing
- Safety net: `pnpm exec vitest run src/screens/ResultScreen.test.tsx` — exit 0; 1 file / 7 tests passed before U4 test changes.
- RED: `src/share/publicResult.test.ts` was added before its production module and failed on the missing `./publicResult` import. The expanded component/client command then failed both suites on the unresolved new module import; a transient JSX trailing-comma test-harness error was corrected before the final RED run.
- GREEN: added the deterministic injectable `PublicResultClient`, then the result screen's idle/preparing/ready/failed flow, with direct-service reserved popups. The focused command passed 2 files / 10 tests after adding the required fingerprint mock export.
- TRIANGULATE: client tests prove pending coalescing, settled reuse, changed-result reminting, exact POST data, and fixed malformed-response errors. jsdom tests prove no render/download mint, prepare-only native click one, same-stack native click two, cancellation retry without reminting, stale success/failure discard, and WhatsApp/Telegram public-only popup URLs with mint-failure cleanup.
- REFACTOR: reused `buildResultShareText` for native payload parity and used `useLayoutEffect` for the committed fingerprint ref, avoiding render-time ref mutation and cascading reset effects while preserving stale-settlement guards.
- Focused U4: `pnpm exec vitest run src/share/publicResult.test.ts src/screens/ResultScreen.test.tsx` — exit 0; 2 files / 11 tests passed.
- Runtime harness: `pnpm exec vitest run src/screens/ResultScreen.test.tsx` — exit 0; 1 jsdom component file / 8 tests passed, exercising real click handler sequencing, deferred mint promises, popup targets, and navigator-share mocks. A deployed preview smoke remains U5 scope.
- Full suite after U4 expiry correction: `pnpm test` — exit 0; 15 files / 79 tests passed.
- Quality: `pnpm run lint`, `pnpm run build`, and `git diff --check` — exit 0.

## U4 Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run src/share/publicResult.test.ts src/screens/ResultScreen.test.tsx` — exit 0; 2 files / 11 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec vitest run src/screens/ResultScreen.test.tsx` — exit 0; 1 jsdom component file / 8 tests passed, exercising the two-click native contract, deferred stale mint completions, and reserved direct-service windows. |
| Rollback boundary | Revert only `src/share/publicResult.ts`, `src/share/publicResult.test.ts`, and U4 portions of `src/screens/ResultScreen.tsx` / `src/screens/ResultScreen.test.tsx`; preserve local Canvas helpers, U1–U3b files, and unrelated dirty work. |

## U4 Review Budget
- Manual client/UI/test scope remains the U3b → U4 child slice; it introduces no generated assets or lockfile exception and does not include U5 documentation or deployment smoke work.

## U4 Expiry Remint Correction
- Finding: the client could reuse a matching public URL after its server-provided `expiresAt`, causing a long-lived result screen to share a link that already returns `410`.
- RED/GREEN: added an injectable-clock test at exact expiry; `PublicResultClient` now clears the settled cache and remints when `Date.parse(expiresAt) <= now` while preserving pending coalescing.
- Verification: the focused U4 suite passed 2 files / 11 tests and the full suite passed 15 files / 79 tests before the U3a-C coverage correction.

## U3a-C Local Glyph Coverage Correction
- Product decision: publication is limited to code points proven by bundled Inter TTF bytes. Unsupported title/winner text is not minted or exposed to `@vercel/og`; the private result and local Canvas download remain available.
- RED: after the 5-file / 22-test safety net, tests were written before production code. `pnpm exec vitest run api/_lib/font.test.ts api/public-results.test.ts api/public-result-og.test.tsx src/share/publicResult.test.ts src/screens/ResultScreen.test.tsx` reported 5 failed files, with 7 failed and 23 passed tests; the missing pieces were cmap coverage exports, mint/OG gates, and client feedback.
- GREEN: the same focused command passed 5 files / 30 tests. Tests derive buffers from the actual bundled TTF assets, exercise the existing literal local URLs, accept `Café`/`Árbol`, reject Arabic and an unsupported code point inside a keycap grapheme cluster, and fail closed for malformed cmap data.
- Implementation: `font.ts` caches parsed format-4/format-12 Unicode cmap coverage from the exact `loadOgFonts()` buffers. It returns `false` for unsupported coverage and rejects loader/parser failures. Minting gates after bounded validation and before token creation, returning only `422`, `Cache-Control: no-store`, JSON `{ "code": "unsupported_publication_glyphs" }`; no token, URL, text, code point, log, or remote resource is emitted. Authenticated OG gates before `ImageResponse`; unsupported or font/parser failures are generic `500, no-store` and never render.
- Client: only an exact `422` stable code is recognized. ResultScreen gives bounded Spanish feedback without echoing result text; other errors retain the existing retry message. WhatsApp/Telegram still close their reserved popup; native sharing, expiry remint, private rendering, and local Canvas download retain U1–U4 behavior.
- REFACTOR/verification: corrected cmap format-4 binary search/range-offset delta handling. Focused suite passed 5 files / 30 tests; handler runtime harness `pnpm exec vitest run api/public-results.test.ts api/public-result-og.test.tsx` passed 2 files / 12 tests; `pnpm test` passed 15 files / 87 tests; `pnpm run lint`, `pnpm run build`, and `git diff --check` passed.

### U3a-C Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run api/_lib/font.test.ts api/public-results.test.ts api/public-result-og.test.tsx src/share/publicResult.test.ts src/screens/ResultScreen.test.tsx` — exit 0; 5 files / 30 tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec vitest run api/public-results.test.ts api/public-result-og.test.tsx` — exit 0; 2 files / 12 tests passed, exercising bounded POST rejection before token entropy and authenticated OG rejection before mocked `ImageResponse`. No deployed preview smoke was run; that remains U5. |
| Rollback boundary | Revert only U3a-C cmap/coverage code in `api/_lib/font.ts`, its mint/OG call sites and focused tests, and U3a-C error handling/tests in `src/share/publicResult.ts` and `src/screens/ResultScreen.tsx`; retain U1–U4 expiry remint, private rendering, local Canvas download, and unrelated dirty work. |

### U3a-C Changed Files
| File | Action | Change |
|---|---|---|
| `api/_lib/font.ts`, `api/_lib/font.test.ts` | Modified | Cached TrueType cmap coverage from bundled buffers and actual-asset/malformed-data tests. |
| `api/public-results.ts`, `api/public-results.test.ts` | Modified | Stable opaque `422` mint gate before token issuance and generic coverage-failure proof. |
| `api/public-result-og.tsx`, `api/public-result-og.test.tsx` | Modified | Authenticated coverage gate before `ImageResponse` with generic no-store failures. |
| `src/share/publicResult.ts`, `src/share/publicResult.test.ts` | Modified | Exact stable-code error recognition without response-text exposure. |
| `src/screens/ResultScreen.tsx`, `src/screens/ResultScreen.test.tsx` | Modified | Bounded Spanish publication feedback with direct popup cleanup retained. |

### U3a-C Review Budget
- One feature-branch-chain correction work unit; no dependency, lockfile, or generated-asset changes. Its rollback is limited to coverage and the listed call-site/test lines; the preserved dirty baseline is outside this review slice.

## Artifact Parity
This full progress body, including U1, U2, U3a, U3b, U3a-C, and U4 evidence, is persisted identically in `apply-progress.md` and Engram topic `sdd/public-og-results/apply-progress`.

## Boundary
Latest correction: U3a-C exact local-font publication coverage and narrow client/API/OG error paths. U1-U4, including expiry remint, remain preserved; no U5 documentation/deployed smoke work, dependency/lockfile changes, local Canvas download contract changes, staging, commits, branches, or PRs. Existing dirty baseline was preserved.

## Next
U5 remains: preview/production deployment documentation and curl smoke proof. The completed feature-branch-chain boundary now includes the U3a-C corrective unit after U4; any later branch work must target the immediate child branch, not `main`, when authorized.
