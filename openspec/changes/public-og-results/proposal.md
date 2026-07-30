# Proposal: Public OG Results

## Intent

Decision makers need to share a completed local outcome; today recipients/crawlers receive only the SPA. They can explicitly publish a seven-day link.

**Product boundary:** private/local by default. A minted URL is an unrevocable bearer link; third-party caches may retain previews after origin expiry (accepted limitation).

## Scope

### In Scope
- Mint/reuse an opaque encrypted/authenticated stateless token only after Share/WhatsApp/Telegram/native intent; no result database/blob.
- Serve `/r/:token` and `/r/:token/og.png`: escaped page metadata and a deterministic 1200×630 card: embedded licensed font, two-line question, dominant winner, safe margins, stats/branding, contrast.
- Keep local PNG download independent; use the public URL with pending/retry and popup-safe direct sharing.

### Out of Scope
- Automatic publication, revocation, accounts, analytics, storage, cleanup jobs, or expiry grace.
- Pixel-identical renderers, changing private persistence, or an E2E runner.

## Capabilities

### New Capabilities
- `public-result-sharing`: Explicit, expiring public result links, page, OG image, and share behavior.

### Modified Capabilities
None.

## Approach

Use versioned AES-256-GCM tokens with server-set seven-day `iat`/`exp`, active/previous key IDs, fresh nonces. Validate at mint/read; malformed/tampered tokens return generic `404`, expired `410`, errors `no-store`. Successful cache lifetime never exceeds remaining token life.

## Proposal Decisions / Design Dependencies

| Topic | Decision / dependency |
|---|---|
| Input limits | Design MUST set body/token and title/winner UTF-8 caps; counts are 2–16 with valid decisions. |
| Runtime | Design MUST select/test compatible Node/Edge runtimes; secrets are server-only, never `VITE_`. |
| Failure/retry | No request on completion/render; retry may mint a new token (no exactly-once creation). |
| Delivery | Chain codec, routes/OG, share UI, deployment smoke slices; likely over 400 lines. |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/screens/ResultScreen.tsx`, `src/share/resultImage.ts` | Modified | Sharing; preserve download. |
| `api/`, `vercel.json`, font asset | New | Routes, rewrites, OG rendering. |
| `src/**/*.test.*`, `api/**/*.test.*` | Modified/New | Privacy/expiry/layout/retry TDD. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Bearer exposure/cache drift | Med | Opaque tokens, expiry-bounded headers, documented limitation. |
| Runtime/routing regression | Med | Ordered rewrites, compatibility tests, preview smoke checks. |

## Rollback Plan

Preserve public routes and active/previous keys for every live seven-day token before restoring the SPA; otherwise distributed links fail. Revert share UI independently to stop new publication.

## Dependencies

- Vercel Functions/rewrites, compatible `@vercel/og`, server secrets, licensed font.

## Success Criteria

- [ ] No result is public before explicit share; all targets receive `/r/:token`.
- [ ] Valid links and 1200×630 cards work for seven days; origin/cache do not outlive expiry.
- [ ] Local download works; tests cover token, expiry, metadata/layout, and retries.
