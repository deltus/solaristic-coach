# Product spec: Solaristic Coach

Working name "Solaristic Coach". A team and squad manager for junior sport coaches. Sister app to Solaristic Radar (classrooms); same stack and conventions, different product: sport, not classrooms.

## Who it's for

1. **First: volunteer coaches.** Mostly parents coaching a junior team for a season or two. Busy, not tech people, using it on their phone at the ground.
2. **Later: school PE and sport teachers,** who have classes instead of teams. Designed for now (see "Designing for later"), not built in round 1.

It must work for any team sport: squads of 4–5 up to 15+, with positions and field shapes set per sport in config.

## Round 1 (all on the device)

1. **Sports and teams**
   - Sport templates in `src/config/sports.ts`: Australian rules football, soccer, netball, basketball, cricket, hockey, and a custom option. Each has its team size on the field (and smaller junior formats), positions, a field shape and the usual game length.
   - Create a team: name, sport, season (e.g. "Winter 2027"), age group, and the team's own numbers (players on field, periods, minutes).
   - Players: first name and last initial only, optional jersey number, preferred positions. No birth dates, photos, addresses or phone numbers.
2. **Sessions and games**
   - Open a training session or a game and close it when it's done (like Radar's lessons).
   - Attendance with one tap each: here, late, away.
   - Games also record the opponent, home or away, the score, and friendly (scrim) or competition.
3. **Fair game time** (the heart of the app: junior sport expects everyone to get a fair go)
   - A game timer with quarters or halves from the sport template.
   - Tap to sub players on and off. The app tracks minutes and positions played.
   - Live suggestions like "Sam has played the least, sub on next", and a season view of minutes and positions per player.
4. **Line-ups**
   - Drag players onto positions on a field drawing.
   - A "Fair rotation" button suggests line-ups so everyone plays a mix of positions and similar minutes across the season.
5. **Quick player ratings** after a session or game
   - Radar-style swipe cards: right = great, left = needs work, up = skip.
   - Areas from config (default: effort, skills, teamwork). Optional one-line note.
   - Coach only, never shown to players or parents.
6. **Team builder** for scrims and training games
   - Split the squad into 2–4 balanced teams using ratings and positions, with shuffle and manual swaps.
   - Simple maths on the device, no AI. (An AI team draft could be a PRO feature later.)
7. **Drills library**
   - Warm-ups, skills drills and games by sport and age group, in config.
   - "Worked well" or "Didn't work" after each use, like Radar's brain break track record.
8. **Season summary and exports**
   - Season summary per player (games, minutes, positions, attendance, coach notes) as a printable page.
   - A team list to share in the parents' group chat (first names only).
   - Backup and restore to a file, encrypted with a passphrase.

Demo data: a fictional under-11 soccer team of 12 players with 4 trainings and 3 games played (one a friendly), including minutes, ratings and attendance.

No accounts, sync or AI in round 1.

## Later rounds (designed for, not built)

- **Parents:** availability per game ("Can't make Saturday"), reminders, and a roster duty list (oranges, canteen, goal umpire).
- **PE teacher mode:** classes instead of teams, several classes, and assessment notes against the Victorian Curriculum Health and Physical Education.
- **Accounts and sync** (Supabase, encrypted), then an assistant coach sharing the team.
- **PRO:** an AI team draft and season insights, using de-identified data only, with privacy dealt with first.
- **Pricing** (not built): a per-season fee for volunteer coaches and a monthly plan for teachers.

## Designing for later (what round 1 already does)

- `Team.kind` is `'team'`; PE mode adds `'class'` on the same table, so screens and season maths carry over.
- Every record carries `teamId`, so sync can later be per team (and shared with an assistant coach).
- Ratings and notes are separate records from attendance and minutes, so they can be encrypted or left out of shared/de-identified data on their own.
- Attendance is per event and per player, so parent availability can become a "planned" status on the same record.

## Privacy and trust

- Players are mostly children: collect as little as possible.
- Everything stays on the coach's device unless the coach exports or shares it.
- Ratings and notes are for the coach only.
- Injury notes, if added later, are sensitive: encrypted if synced and never in shared exports.
