# Developing

For a developer new to the project. Read `docs/ARCHITECTURE.md` first.

## Setup and commands

Node.js 20+ (CI uses 24).

```bash
npm install                 # app dependencies
npm run lint:install        # lint/format tools (tools/lint, see DECISIONS.md #3)
npm run dev                 # http://localhost:5173
npm test                    # all tests (Vitest)
npm run typecheck           # tsc --noEmit
npm run lint                # ESLint
npm run format              # Prettier, writes changes
npm run build               # typecheck + production build into dist/
npm run icons               # regenerate public/icons
```

Run a local build as a preview (own database, no service worker): `VITE_PREVIEW=local npm run dev`.

## Tests

| File | Covers |
|---|---|
| `tests/gameTime.test.ts` | clock, subs, swaps, minutes adding up, suggestions |
| `tests/planning.test.ts` | sport templates, Fair rotation, team builder, drills |
| `tests/services.test.ts` | the database layer (fake-indexeddb): a full game with subs, ratings, demo data, encrypted backup, preview isolation |

Tests use fictional data only. There are no browser end-to-end tests; UI changes are checked by hand on the preview (see each round's brief).

## Branches, rounds, previews

See `CLAUDE.md`. Every push to `main` or a `round*` branch runs `.github/workflows/pages.yml`: lint, typecheck, test, then publish main at the root and every `round*` branch at `/preview/<branch>/`.

## Adding a database version (Dexie)

1. One above the highest version on `main` **and** every open round branch (today: v1, so next is v2).
2. Add `this.version(N).stores({...})` in `src/db.ts` with a comment (what, which round). Never edit an older version.
3. Data changes go in `.upgrade(tx => …)`, with a test on an old-shape database.
4. New table? Add it to `CoachDB` and to `TABLES` (backups) unless it must stay out.
5. Merge rounds in database-version order.

## Adding a sport

Add an entry to `SPORTS` in `src/config/sports.ts`: positions with a role and x/y on the drawing (team attacks towards the top), the full-size `onField`, any junior `formats`, periods and minutes. `tests/planning.test.ts` checks every template is consistent.
