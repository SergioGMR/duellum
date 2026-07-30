# Review Ledger: Public OG Results

## Target

Judgment Day review of the corrected SDD planning set, round 0.

| Artifact | SHA-256 |
|---|---|
| `proposal.md` | `e14d33a75309f61b6faad12eeec716498528366392cbec2832d8c91392118bc4` |
| `specs/public-result-sharing/spec.md` | `584204b20050fcce96dc01d5315a5676587ddfaa182a18d2105a2dff0e8f3d8e` |
| `design.md` | `11084df2e730ec3f0cd8e2de30e66c4b390780271de30f1000e752ed7c39d001` |
| `exploration.md` | `7805871e17e6eb5fc02725116f659a7a39174dfb5f9703b7d6d5c519c4eb1d1d` |

## Round 0 Findings

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| JD-001 | judgment-day | `design.md:16,43`; `spec.md:9-19` | CRITICAL | verified | **Confirmed by both judges and verified after round 2.** Only completion for the still-current fingerprint may update readiness, failure, or feedback; stale success and failure are ignored. The distinct second-gesture native-share contract remains intact. |
| JD-002 | judgment-day | `design.md:16,39,43`; `spec.md:33-42` | CRITICAL | info | **Suspect — judge A only.** Same-result URL reuse does not explicitly invalidate a cached URL at `expiresAt`, so a long-lived ResultScreen could reuse a link that now returns `410`. |
| JD-003 | judgment-day | `design.md:13,15,43`; `spec.md:21-29,44-53` | BLOCKER | open | **Confirmed by U3a runtime gate.** Real Arabic text triggered `@vercel/og` dynamic Google-font fetching, including rendered text in the request; blocking that network still returned an image response with missing/illegible-glyph risk. The accepted Unicode/no-remote/visual-quality contracts cannot all hold with Inter-only assets. |
| JD-004 | judgment-day | `design.md:13`; `spec.md:23,27` | CRITICAL | info | **Suspect — judge B only.** NFC normalization changes canonically equivalent input bytes, while the specification says valid Unicode round-trips. |
| JD-005 | judgment-day | `proposal.md:32-39`; `design.md:27-35,41-47` | CRITICAL | info | **Suspect — judge A only.** The routes/OG delivery slice lacks a concrete line forecast and may not remain below the 400-line review budget. |

## Review State

- Confirmed severe findings: 1
- Suspect severe findings: 4
- Contradictions: 0
- Informational findings: 4
- Correction round: 2 of 2 applied and verified
- Maximum correction rounds: 2

## Round 1 Fix Delta

- Patch: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-og-jd-round1.patch`
- Corrected spec SHA-256: `ea6d1cf0084e1cdcf6bbc570df66af7c47872f34e4aa45c6ba91bf2be0a0fbfe`
- Corrected design SHA-256: `4e98ef902fdaae36f57f67293ec190cfc4689a82f826e77226d50127342a4616`

## Round 1 Scoped Re-judgment

- Judge A: JD-001 remains open because “mint completion MUST make the URL ready” is not explicitly limited to the still-current result fingerprint.
- Judge B: JD-001 verified; it reads the stale-completion rule as sufficient context.
- Fix-caused candidate `JDA-R1-001`: CRITICAL, contradiction, status `info` until human resolution.
- Recommended round 2 correction: state normatively that only completion for the still-current fingerprint may enter ready state; stale completion MUST NOT.

## Round 2 Fix Delta

- Patch: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-og-jd-round2.patch`
- Corrected spec SHA-256: `535229f7498b705577c6ea5de8df20aada62399150dc11fdb98740bb09d637e7`
- Corrected design SHA-256: `0ae60326df43a1f9b69d9ea1360e610cc00b9baef30184c1e1415913169db363`

## Final Scoped Re-judgment

- Round-2 patch SHA-256: `38897c4013d30516839773ebf470bb4be849372f7c8b230ee92add4798ca5694`
- Judge A: JD-001 verified; JDA-R1-001 refuted/verified; no fix-caused defects.
- Judge B: JD-001 verified; JDA-R1-001 refuted; no fix-caused defects.
- Terminal state: `approved`

**JUDGMENT: APPROVED ✅**

## U1 Post-Apply Judgment Day

- Target: isolated U1 codec patch
- Patch SHA-256: `a8177f377dca963d25ea6be2955362ee29aa0e299c30294ab8aa90797673bc2a`
- Review budget: 347 changed lines
- Judge A ledger: empty
- Judge B ledger: empty
- Focused verification: 13/13 tests passed
- Full verification: 57/57 tests, lint, type-check, build, and diff check passed
- Terminal state: `approved`

**U1 JUDGMENT: APPROVED ✅**

## U2 Post-Apply Judgment Day

- Target: isolated U2 mint/HTML patch
- Patch SHA-256: `559fd2f01c8967e100c9da1c72a65269f9c3e62ce3498023edd90d79e8d139bd`
- Review budget: 339 changed lines

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| U2-JD-001 | judgment-day | `api/public-result.ts:28-29`; `api/_lib/http.ts` | CRITICAL | verified | **Confirmed by both judges and verified after round 1.** TTL uses the unrounded millisecond clock; at `exp×1000−1ms` the valid response has `s-maxage=0`, and exact expiry remains `410/no-store`. |

- Confirmed severe findings: 1
- Correction round: 1 of 2 applied
- Scoped re-judgment: both judges verified; no fix-caused defects
- U3 status: unblocked

## U2 Round 1 Fix Delta

- Pre-fix snapshots: `/var/folders/9r/yzfrmz754r9bdgrkvt5chsjw0000gn/T/opencode/duellum-public-og-results-u2-20260729/fix-round-1-before/`
- Immutable target: `u2-jd-round1-target.patch` — SHA-256 `559fd2f01c8967e100c9da1c72a65269f9c3e62ce3498023edd90d79e8d139bd`, 339 changed lines
- Fix-only patch: `u2-jd-round1-fix.patch` — SHA-256 `8d6743330086232cce631f31a06a153dbc41f7bc709db7fdb5de17a9e7badb48`, 18 changed lines
- Corrected full U2 patch: `u2.patch` — SHA-256 `4dc1c38ee96ee77f7e911208f1b0ccddcdd65c5fc10b31bbaed8c6e225d35188`, 353 changed lines
- RED: exact `exp×1000−1ms` test received `s-maxage=1`; GREEN: targeted 1/1, U2 8/8, U1+U2 21/21
- Exact expiry remains explicit at `410` with `Cache-Control: no-store`
- Full verification: 11 files / 65 tests, lint, build, and diff check passed

**U2 JUDGMENT: APPROVED ✅**

## U3a Apply Gate

- Status: blocked before Judgment Day
- U3a implementation tests/checks: 68/68 full suite, lint, build, and diff check passed
- Blocking contract: bundled Inter does not cover all accepted Unicode; `@vercel/og@0.11.1` performs an implicit remote Google-font fallback that can disclose result text and is not deterministic
- Automatic apply retry: not yet used; a product/design decision is required before correction
- U3b status: blocked

## U3a-C Local Glyph Coverage Correction

- JD-003 is addressed by the approved product decision: public OG publication accepts only title/winner code points proven by exact bundled Inter cmap coverage; unsupported text is not minted or rendered.
- The corrective implementation derives coverage from the same literal local TTF buffers passed to `ImageResponse`, returns only the stable opaque mint `422` for unsupported publication, and makes authenticated OG rejection generic/no-store before rendering.
- This is a factual implementation record, not a new Judgment Day verdict. U5 deployment smoke and any subsequent review remain pending.
