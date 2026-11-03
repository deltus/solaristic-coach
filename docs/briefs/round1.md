# Round 1 brief

## Preview link

https://deltus.github.io/solaristic-coach/preview/round1/

(It has its own data on your phone and a pink PREVIEW strip at the top. Tap **Load demo team** in that strip to get the fictional Riverside Rockets U11 soccer team.)

## What changed

- New project set up from Radar's rules: CLAUDE.md, docs, lint/format/typecheck, CI, and previews with their own database.
- Sport templates: Aussie rules, soccer, netball, basketball, cricket, hockey and a custom sport, each with positions, a field drawing and game length. Teams can change players on the field, periods and minutes.
- Teams and players (first name, last initial, jersey number and preferred positions only).
- Trainings and games that open and close, with one-tap attendance (here, late, away).
- Games record the opponent, home or away, friendly or competition, and the score.
- Game time: a clock with quarters or halves, tap to sub, minutes and positions per player, "has played the least: sub on next" suggestions, and a check that the minutes add up.
- Line-ups: drag players onto a field drawing (or tap, then tap), a **Fair rotation** button, and who sits out each quarter or half.
- Quick ratings after a session: swipe right = great, left = needs work, up = skip, for effort, skills and teamwork, plus an optional note. Coach only.
- Team builder: 2–4 balanced teams from ratings and positions, with shuffle and swaps.
- Drills library by sport and age, with "worked well" or "didn't work" after each use.
- Season minutes view and "needs attention" list (fewest minutes, positions never played, away a lot, not rated lately).
- A printable season summary per player (coach only), and a team list to share in the parents' chat (first names only).
- Backup and restore to a file locked with a passphrase, and "delete everything".
- A fictional demo team: 12 players, 4 trainings, 3 games (one a friendly).

## How to test (on your phone)

**Set up**
1. Open the preview link. Tap **Load demo team** in the pink strip, then **OK**. You land on Riverside Rockets.
2. Check the top shows 3 played (won 1, drawn 1, lost 1) and a "Needs attention" list.
3. Tap **Season minutes**. Every player should have minutes, with coloured bars for goalkeeper, defence, midfield and attack. Go back.

**Run a full game with subs** (the main test)

4. Tap **Start game**. Type an opponent (e.g. "Test FC").
5. Under Attendance, tap **Away** for one player, then **Mark everyone else here**.
6. Tap **Line-up**, then **⚖ Fair rotation**. 9 players appear on the field and 2 on the bench. Try dragging a bench player onto a spot, and tap two spots to swap them.
7. Go back and tap **Game time**, then **Start the game**. The clock starts.
8. After a minute or so, tap a bench player, then a player on the field. They swap and the minute counts update.
9. Tap **Pause**, wait 30 seconds, then **Resume**. The paused time must not count.
10. Tap **End half** (OK), then **Start** for the second half. Do a couple more subs. A green "has played the least: sub on next" tip appears once someone has sat for 3+ minutes longer than the busiest player. Tap its **Sub** button.
11. Tap **Us** to add a goal for your team.
12. Tap **End game** (OK). Under "Minutes this game", check the line at the bottom: player-minutes = game time × 9 spots, with a ✓. Each player's minutes should look right (bench players fewer).
13. Tap **Close the game and rate players**.

**Ratings**

14. Swipe right (great), left (needs work) and up (skip) on a few cards. Try the buttons too. Type a note on the "Teamwork" card. Tap **← Previous** once to check it goes back.
15. Go back to the team and open **Season minutes**. The new game is counted (4 games).

**The rest**

16. **Start training**, mark attendance, then **+ Add a drill**, add one, and tap **Worked well** on it. Close the session. In **Drills**, that drill now shows "worked".
17. **Team builder**: tap **3 teams**, **Make teams**, then **🔀 Shuffle** a few times. Tap two players to swap them.
18. **Share team list**: it should open your phone's share sheet (or copy) with first names and numbers only, no last initials.
19. **Season summary**: tap **Print or save as PDF** and check it looks tidy.
20. **Settings → Back up**: choose a passphrase (8+ characters), save the file. Then **Restore** it with the wrong passphrase (should say "Wrong passphrase") and then the right one.
21. Make your own team from scratch (**Teams → + Add another team**), e.g. netball, and add 3 players. Check the field drawing on a game's line-up matches the sport.

## Not done / unsure

- **No push notifications** yet (they need the Android app, as in Radar). The only reminder is a banner on Home for a session or game left open.
- **Positions on the drawings are approximate.** Please check your sports look right. Netball positions are treated like any other sport (the app doesn't enforce netball zones).
- **Cricket** uses the clock as two innings and fielding positions. It works, but "fair minutes" means less in cricket. Batting order isn't tracked.
- **The live site shows a "Coming soon" holding page** until round 1 is merged, because main was empty.
- Season minutes count friendlies too. Tell me if friendlies should be shown separately.
- The "sub on next" tip waits for a 3-minute gap (`SUB_GAP_MINUTES` in `src/config/coaching.ts`). Easy to change.
- Ratings are one card per player per area (36 swipes for 12 players). If that's too many after a game, we could do one card per player with three quick taps.
- Drag-and-drop is tested in a desktop browser, not yet on a real phone. Tap-then-tap always works as a backup.
