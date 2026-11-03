# Solaristic Coach: how we work

Claude Code reads this file at the start of every chat. Follow it for every change. (Adapted from Solaristic Radar's CLAUDE.md.)

## Who I am
I'm Azeem. I have very limited coding experience. Explain what you're doing in plain English, keep summaries short, and tell me exactly what to tap or type when I need to do something. Thomas is my co-founder; he tests on his phone and gives feedback.

## The app
Solaristic Coach (repo `deltus/solaristic-coach`) is a phone-first team and squad manager for junior sport coaches: teams and players, sessions and games that open and close, one-tap attendance, fair game time with a game clock and subs, line-ups on a field drawing, quick swipe ratings, a team builder, a drills library, and season summaries. It is the sister app of Solaristic Radar (`deltus/solaristic-pulse`) and reuses its stack and conventions. Key docs: docs/PRODUCT_SPEC.md, docs/ARCHITECTURE.md, docs/BUILD_STATUS.md, docs/DECISIONS.md. Editable lists and settings (sports, drills, rating areas) live in src/config/.

## How every round works
1. **Branch.** Each round gets its own branch named after it (e.g. `round2`), made from the latest main. Never commit straight to main.
2. **Plan.** Do the work in the round's prompt (in docs/prompts/). Before writing code, give me a short plan (5–10 lines) and wait for my OK.
3. **Test.** `npm test`, `npm run lint` and `npm run typecheck` must pass. Add tests for new logic. Use fictional data only.
4. **Preview.** Push the branch. That publishes a preview at `https://deltus.github.io/solaristic-coach/preview/<branch>/`, separate from the live app (its own database and storage, no service worker, and a pink "PREVIEW" banner). Wait for the GitHub Action to finish and check the link loads.
5. **Brief.** Write `docs/briefs/<branch>.md` and commit it to the branch, with these sections:
   - **Preview link**
   - **What changed** (plain English, one line each)
   - **How to test** (numbered steps on a phone)
   - **Not done / unsure** (anything skipped, guessed or worth a second look)

   Then reply to me with the link and the "What changed" list.
6. **Adjust.** If I ask for changes, make them on the same branch, push again (the preview updates), and add an "Adjustments" section to the brief.
7. **Merge only when I say "merge".** Then merge the branch into main and push (this updates the live app), update docs/BUILD_STATUS.md, and tell me it's live.

## Keeping chats small (to save usage)
- After every merge, write docs/HANDOVER.md, commit it, and tell me: "Ready for a fresh chat: type /clear and paste the start prompt." HANDOVER.md should be under one page: current branch and state, what the last round changed, anything unfinished or uncertain, and the next prompt in docs/prompts/.
- Also do this mid-round if the chat has become long (lots of files read, many back-and-forths, or you notice you're re-reading things), and say why.
- At the start of a chat, read docs/HANDOVER.md and the prompt for the round, and only open the files they point to. Don't re-read the whole codebase.

## Code quality
- TypeScript strict. ESLint and Prettier: `npm run lint`, `npm run format`, `npm run typecheck`. CI runs lint, typecheck and tests, and nothing publishes if they fail.
- Keep files under about 400 lines, split by feature. Every file starts with a short comment saying what it is for.
- Pure logic goes in src/logic (tested), database reads and writes in src/services, screens in src/ui/screens.
- Each technical choice worth explaining goes in docs/DECISIONS.md. Anything copied or adapted from Radar goes in docs/REUSED_FROM_RADAR.md.

## Safety rules
- Never push to main without my "merge".
- Previews must never touch live data. Keep the database name, storage keys and service worker separate (src/preview.ts, vite.config.ts).
- **Players are mostly children.** Collect as little as possible: first name, last initial, optional jersey number and preferred positions. No birth dates, photos, addresses, phone numbers or school names unless a round's prompt says so and we've talked about privacy first.
- **Player data stays on the device.** Nothing is sent anywhere unless the coach exports or shares it. No analytics. No network requests at runtime.
- Player data stays out of the repo. Demo and test data are fictional (made-up names).
- Ratings and coach notes are for the coach only: never shown to players or parents, and never in anything meant for sharing (the parents' team list is first names only).
- **Injury notes (when added) are sensitive:** encrypted if ever synced, never in shared exports, and kept out of any de-identified or AI data.
- Backups are always encrypted with the coach's passphrase.
