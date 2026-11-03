# Reused from Radar

What was copied or adapted from Solaristic Radar (`deltus/solaristic-pulse`, read at its main branch on 3 Nov 2026). "Copied" = same code with names changed; "adapted" = same idea or structure, rewritten for sport.

| Coach file | Radar source | How |
|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | Adapted: same round workflow, handover and keeping-chats-small rules; safety rules rewritten for children's sport data. |
| `.github/workflows/pages.yml` | `.github/workflows/pages.yml` | Adapted: same lint → typecheck → test → build live + every `round*` preview. Supabase variables and the old-main service worker patch removed; a holding page while main is empty. |
| `src/preview.ts` | `src/preview.ts` | Copied (database name changed). |
| `vite.config.ts` | `vite.config.ts` | Adapted: same PWA setup, previews without a service worker, `/preview/` kept out of the live service worker. |
| `tsconfig.json`, `.prettierrc.json`, `.editorconfig`, `.gitattributes`, `eslint.config.js`, `tools/lint/*` | same files | Copied. |
| `src/logic/swipe.ts` | `src/logic/swipe.ts` | Copied (issue-screen part dropped). |
| `src/ui/Swipe.tsx` | `src/ui/Swipe.tsx` | Adapted: same drag, flick, fly-off ghost and colour wash; icons changed; `allow` and `keyboard` options dropped. |
| `src/ui/hooks.ts` | `src/ui/hooks.ts` | Copied, plus a wake lock hook for game time. |
| `src/ui/PreviewBanner.tsx` | `src/ui/PreviewBanner.tsx` | Adapted: loads the demo team. |
| `src/main.tsx` | `src/main.tsx` | Adapted: no sync, relief mode or cloud. |
| `src/db.ts` | `src/db.ts` | Adapted pattern: versioned Dexie schema, `TABLES` list, swappable `db`, settings helpers. |
| `src/services/backup.ts` | `src/services/backup.ts` | Adapted: same collect / replace-all restore, now always encrypted. |
| `src/logic/backupCrypto.ts` | `src/sync/crypto.ts` | Adapted: same AES-GCM layout (12-byte IV + ciphertext), with a passphrase-derived key (PBKDF2) instead of a stored key. |
| `src/files.ts` | `src/files.ts` | Adapted: the web download part only; Android comes later. |
| `src/styles/*.css` | `src/styles.css` | Adapted: same design tokens (colours, radius, fonts), preview banner and swipe card styles; everything else new. |
| `scripts/make-icons.mjs` | `scripts/make-icons.mjs` | Adapted: same sizes, new field drawing instead of the Radar mark. |

## Ideas carried over (new code)

| Radar idea | Coach version |
|---|---|
| Lessons that open and close | Sessions and games (`src/services/events.ts`, `EventScreen.tsx`) |
| "Who needs attention" ranking | Fair game time and attention (`needsAttention` in `src/logic/season.ts`, shown on the team hub and season view) |
| Seating plan editor | Line-up on a field (`LineupScreen.tsx`, `Field.tsx`, `dragDrop.ts`, `src/logic/lineup.ts`) |
| Brain breaks with a track record | Drills library (`src/config/drills.ts`, `src/logic/drills.ts`, `DrillsLibrary.tsx`) |
| Lesson reminders | In-app banner on Home for a session or game left open (no push notifications yet; those need Capacitor) |

Not reused yet: Capacitor/Android, Supabase sync and accounts, relief passes, XLSX/SQL exports, PIN lock.
