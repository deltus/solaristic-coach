# Decisions

Each technical choice and why, for a future developer. Newest at the bottom.

## Round 1

1. **Same stack as Radar** (Preact, TypeScript, Vite, Dexie, vite-plugin-pwa, Vitest). One founder team maintains both apps; shared conventions mean code and fixes can move between them. Preact keeps the bundle small for phones on patchy ground Wi-Fi.
2. **Offline-first, on the device only (Dexie / IndexedDB).** Coaches are at grounds with poor signal, and the players are children: keeping data on the coach's phone is the simplest privacy story. No accounts or sync until a later round.
3. **Lint tools in `tools/lint/` with their own package.json** (copied from Radar). typescript-eslint doesn't support TypeScript 7 yet; the linter gets TypeScript 6 for parsing while `npm run typecheck` uses the app's TypeScript 7. Remove the folder when typescript-eslint supports v7.
4. **Previews under `/preview/<branch>/` on the same GitHub Pages site** (copied from Radar). Same origin means shared IndexedDB, so previews use their own database name and storage keys (`src/preview.ts`) and have no service worker (`vite.config.ts`), so they never touch or cache over live data.
5. **The workflow publishes a holding page at the root until `main` has the app.** The repo started empty and round 1 is pushed before anything is merged, so there's no live build yet. Once main has a `package.json`, the root is the real app.
6. **Game time is stored as "stints" on the game clock** (player, position, start ms, end ms), not as totals. Totals can always be recomputed, subs can be fixed later, positions played come for free, and pausing the clock pauses everyone. The alternative (counting minutes per player as you go) drifts when the app is closed mid-game.
7. **The clock stores `runningSince` (a wall-clock time) plus elapsed ms**, not a ticking counter. If the phone sleeps or the app is closed, the time is still right when it reopens.
8. **Every sub is one database transaction** (close the old stint, open the new one), so minutes always add up even if the app is killed.
9. **Sport templates in config with per-team overrides** (`src/config/sports.ts`). Junior formats vary by league and age (9-a-side U11 soccer, 12-a-side Auskick-age footy), so a team picks its own number on the field, periods and minutes. Positions carry a `role` (defence, midfield…) so fair rotation balances kinds of positions, not exact spots.
10. **Fair rotation is a simple, explainable algorithm** (`src/logic/lineup.ts`): those with the most season minutes sit first (rotating), then a greedy assignment plus pairwise swaps steers each starter to the roles they've played least, with a small nudge for preferred positions. No AI: coaches need to trust and explain it to parents.
11. **Team builder = snake draft + swaps** (`src/logic/teamBuilder.ts`) on a strength score from recent ratings and preferred roles. Shuffle reseeds and adds a little noise so each tap differs but stays balanced.
12. **Ratings are +1 / −1 per area, skip leaves it out.** Matches the swipe gesture, is quick at the ground, and avoids a 1–10 scale that would feel like grading children.
13. **Players: first name + last initial only**, cleaned on save (`cleanName`). The parents' team list uses first names (and jersey numbers) only.
14. **Backups are always encrypted** (PBKDF2-SHA-256, 310,000 iterations → AES-GCM 256, `src/logic/backupCrypto.ts`). A backup file sitting in Downloads or shared by mistake shouldn't expose children's data. There's deliberately no "unencrypted export" in round 1.
15. **Season summary is a printable HTML page** (browser Print / Save as PDF) rather than a PDF library, to keep the bundle small. Marked "coach only".
16. **Seeded random** (`src/logic/random.ts`) for the demo data and shuffles, so tests and the demo are repeatable.
17. **`Team.kind` field from day one** so PE teacher mode can add `'class'` without a new table or migration.
