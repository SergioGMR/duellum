# Public Result Sharing Specification

## Purpose

Defines seven-day publication preserving private persistence.

## Requirements

### Requirement: Explicit publication and sharing

Results MUST stay private until native, WhatsApp, or Telegram intent. Unchanged intents MUST coalesce/reuse URLs; changes MUST invalidate. First native gesture MUST only prepare; matching completion MUST ready the URL. Stale outcomes MUST alter neither state nor feedback. A distinct second gesture MUST call `navigator.share({ title, text, url })` before any `await`. Failure MUST retain readiness/allow retry, MUST NOT substitute SPA URL, and MAY remint. Completion/rendering/download MUST NOT mint; download MUST remain independent.

#### Scenario: Private and publication-blocked results

- GIVEN a completed result
- WHEN completion/render/download occurs or unsupported text requests publication
- THEN mint/URL/share MUST NOT occur; rejection MUST be clear/bounded
- AND private result and local PNG/download MUST remain

#### Scenario: Native two-gesture lifecycle

- GIVEN no ready URL
- WHEN the first native gesture runs
- THEN minting MUST show “Preparing link…” without sharing; only matching completion readies “Share result”
- WHEN a second gesture/retry runs
- THEN sharing MUST be synchronous; stale outcomes ignored; cancellation/failure MUST retain the URL

#### Scenario: Reuse and direct services

- GIVEN unchanged/changed/direct-service intents
- WHEN publication runs
- THEN unchanged intents MUST coalesce/reuse `/r/:token`; changes MUST invalidate/remint
- AND direct services MUST use reserved popup/anchor, never native sharing; failure MUST retry without local substitution

### Requirement: Bounded mint input and opaque token

Mint bodies MUST be `POST application/json`, ≤4,096 UTF-8 bytes; trimmed title/winner MUST be 1–256/1–128 bytes. Unicode MUST round-trip; invalid Unicode/C0/C1 MUST fail. Before token creation, each required character MUST match exact bundled assets or approved asset-derived data; broad ranges MUST NOT qualify. Unsupported text MUST yield no-store `422` JSON `{ "code": "unsupported_publication_glyphs" }` without token/URL, text/code-point echo, sensitive log, or remote request. `optionCount` MUST be integer 2–16; `decisionCount = optionCount - 1`. Read tokens MUST be URL-safe ASCII ≤2,048 characters. Minting MUST set server `iat`, `exp = iat + 604800`, creating a fresh stateless authenticated-encrypted opaque token without storage.

#### Scenario: Accepted and rejected input

- GIVEN bounded input
- WHEN minting runs
- THEN valid covered Unicode MUST round-trip without URL disclosure
- AND invalid input MUST yield bounded no-store error without result text/code point
- AND unsupported coverage MUST yield the stable code without token/URL/log/fetch

### Requirement: Lifetime, keys, and caching

At `now < exp`, tokens MUST read; expiry MUST return generic `410`. Malformed/tampered/overlong/future-issued/unknown-version-or-key/wrong-key/invalid-payload tokens MUST return generic `404`. Errors MUST be `no-store`; successes MUST use `public, max-age=0, s-maxage=floor(exp-now), must-revalidate` without stale serving. Minting MUST use active server-only key; reads MUST accept active/previous keys. Secrets MUST NOT reach clients. Previous keys/routes MUST outlive tokens/caches. Third-party retention after origin expiry is accepted/non-revocable.

#### Scenario: Reads and rotation

- GIVEN configured-key/invalid/expired tokens
- WHEN public routes read them
- THEN valid MUST succeed, invalid return `404`, expired return `410`
- AND caching MUST be bounded/`no-store`; minting MUST use active key

### Requirement: Public HTML and social image

`/r/:token` MUST return escaped fields, absolute canonical/metadata URLs, title/description, `og:{type,title,description,url,image,image:width=1200,image:height=630}`, and `twitter:{card=summary_large_image,title,description,image}`. OG MUST return 1200×630 PNG using exact bundled licensed local fonts/assets, 64-pixel margins, 4.5:1 contrast, dominant winner, stats, branding. Title/winner MUST use ≤2 lines; wrapping MUST be deterministic/grapheme-safe, hard-break unspaced text, ellipsize overflow. Mint/OG rendering MUST NOT fetch remote fonts, images, or text-bearing fallbacks.

#### Scenario: Complete deterministic representations

- GIVEN maximum supported HTML-significant, spaced/unspaced Unicode
- WHEN routes repeatedly render one token
- THEN HTML MUST be escaped/complete with canonical/image URLs
- AND PNG MUST repeat legibly without split graphemes/remote requests

### Requirement: Routing, deployment, and rollback

Image/HTML routes MUST precede SPA fallback; other SPA URLs MUST persist. Preview/production MUST verify public representations, caches, SPA routes. Rollback MAY stop minting but MUST preserve routes, compatible keys, secrets until links expire.

#### Scenario: Route preservation

- GIVEN deployment/rollback with live links
- WHEN public/non-public URLs are requested
- THEN public behavior and SPA loading MUST persist
