# Duellum

Duellum is a private, local-first decision bracket. Create 2 to 16 named options, compare one matchup at a time, undo choices, resume later, and share the final winner as an image.

## Toolchain

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4 through `@tailwindcss/vite`
- Vitest 4
- pnpm 10.34.5

Use the pinned pnpm version without changing global tooling:

```bash
npx --yes pnpm@10.34.5 install
npx --yes pnpm@10.34.5 dev
```

Run all checks:

```bash
npx --yes pnpm@10.34.5 check
```

## Architecture

- `src/domain/tournament.ts` owns shuffle, bracket sizing, balanced byes, progression, validation, and undo. It is pure apart from an injected random source.
- `src/state/appState.ts` owns persistent bracket transitions and the edit-invalidates-run policy.
- `src/storage/appStorage.ts` owns the versioned local storage envelope and safe recovery.
- `src/share/resultImage.ts` owns Canvas image generation, Web Share, and download fallback.
- `src/screens/` and `src/components/` render the product workflow without bracket math.

Each run stores only immutable seed order and winner IDs. Every matchup and round is derived from that history, so reload and undo reproduce the same bracket. Editing a bracket clears its run to prevent stale decisions from targeting changed options.

## Data and deployment

All data stays in browser `localStorage` under `duellum.app-state`. Unsupported or corrupt data is ignored safely; a valid bracket definition is preserved when only its run is incompatible.

The app is a static Vite SPA with no URL router or backend. Vercel can deploy it using automatic Vite and pnpm detection; no custom Vercel configuration is required.
