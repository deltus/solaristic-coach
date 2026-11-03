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

## Round 2

18. **The roll starts with everyone "here"** (rows made when a session opens). Juniors mostly turn up, so the coach taps only the two or three who are missing or late. A player added after the session opened shows "Not marked" with a one-tap fix.
19. **Absences have a reason** (sick / injured / away / no-show) stored as `status: 'absent'` + `reason`, not as separate statuses. "Was the player there?" stays one check (`isPresent`), and patterns in round 3 can still tell a no-show from a sick day. Round 1's `away` is upgraded in place (database v2) and in old backups.
20. **One check per player per session replaces three rating cards.** Left = all good, up = star, right = note with chips. 12 swipes instead of 36, and chips say what actually happened, which is what patterns and profiles need. Round 1 ratings are kept and still count in the team builder and season summary.
21. **A quick swipe never wipes logged chips.** "Log now" during a session adds chips; swiping "all good" afterwards keeps them as a note (`combineCheck`). Losing an injury note to a fast thumb would be worse than an extra tap.
22. **Chips have a tone (good / amber / red) and a `safety` flag** in config, so the season dots and patterns (round 3) and the safety-officer prompt don't need a hard-coded list.
23. **Voice notes are stored on the device as an ArrayBuffer** (not a Blob) so they copy cleanly into tests and into backups (as base64 inside the encrypted file). 30 seconds max, one per player per session. Nothing is transcribed or sent anywhere.
24. **The training focus is a skill from the sport's skill list** (not a drill), so "nailed drill" / "struggled with drill" can later count towards that skill on the player's profile.
25. **Team sizes 4–15.** AFL keeps all 18 spots in its template (for drawings and preferences) but offers 12 or 15 a side. A team saved with more than 15 is shown as 15.
26. **The printed season summary leaves out wellbeing and injury chips.** It's coach-only, but a printout or PDF can travel; those stay in the app.
