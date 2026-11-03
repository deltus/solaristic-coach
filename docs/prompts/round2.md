# Round 2 prompt (and the plan for rounds 3–7)

From Azeem, 3 Nov 2026. "Improve, don't rebuild": audit first (done in chat), then one improvement area per round, each with its own branch, preview and phone test list, waiting for OK in between. Existing data must be migrated, never wiped.

## The target

**Core loop:** about 60 seconds of tapping after each session builds player profiles. Those profiles let the app draft teams automatically; the coach adjusts the draft and locks it in.

**A. Squad and sport templates.** Players are first name + last initial only (no birth dates, addresses or medical info). Templates set team size, positions and a skill list (5–8 skills): soccer (9v9 and 11v11), AFL, netball, basketball, futsal and custom. Team sizes 4–15.

**B. Roll and post-session swipe (most important).**
- Sessions are training or game; training has an optional drill focus.
- Check every player every session (juniors train only 1–2 times a week).
- Roll: everyone starts as "here". Tap a player to mark them absent (sick / injured / away / no-show) or late.
- After the session, one card per player who came: swipe left = all good, up = star of the session, right = something to note, with chips:
  - Effort: low energy, switched off, standout effort
  - Behaviour: talking over coach, rough play, mucking around, argued with ref/teammate, left early
  - Skill: struggled with drill, nailed drill
  - Wellbeing: seemed upset, knock/injury
  - Social: helped a teammate, left out, conflict with [pick player]
- Optional voice note per player. No typing required anywhere.
- Game cards also record minutes and positions, prefilled from the rotation plan.
- Under 90 seconds for 15 kids, one-handed, big tap targets.
- Season calendar: a strip of coloured dots per player per session (green / amber / red / gold star / grey absent).
- A "Log now" button for incidents during the session.

**C. Behaviour patterns and player profiles.** Flag patterns, not single incidents ("3 rough-play flags in 4 sessions", "attendance down to 50%"), with a suggested next step (quiet chat, call the parent, pair with a calm teammate). Flags older than 6 weeks drop out unless pinned. Injury/safety flags prompt "Report this to your club's child safety officer." Profile: skills 1–5 (with when last rated), positions (preferred, can play, played this season with counts), trait chips (leader, encourager, needs a buddy, gets frustrated, coachable), chemistry ("works well with" green, "keep apart" red), attendance %, minutes vs team average, 6-week trend. Chemistry map: dots with green/red lines; highlight anyone with no green links.

**D. Match-day planner.** One tap "Draft lineup": starting line-up and a quarter-by-quarter rotation. Goals: near-equal season minutes, rotate positions, keep 1–2 strong pairs together. Live "sub now" screen with who's next on and each kid's minutes. Minutes and positions feed next week's draft.

**E. Division planner (A / B / C).** Hard rules (team sizes, position cover, keep-apart pairs, coach pins). Soft rules, weighted: strength (ranked or balanced), nobody plays alone, fair game time, position rotation, attendance, stability (move at most 2–3 kids a week). Every pick shows a reason. Drag between teams, re-check every rule, flag breaks in red, then Lock. Mid-season: suggest moves, never move anyone automatically. Export for the club grading panel: suggested division, attendance and a short strength note per player; never ratings history or behaviour flags.

**Privacy.** Ratings, traits, chemistry and behaviour data are coach-only. Device first, encrypted backup. At the end of a season carry forward skills and positions only; behaviour flags never carry into a new season.

## Order agreed after the audit

| Round | Area |
|---|---|
| **2 (this round)** | **B core + A:** roll with absence reasons (everyone starts here), the new post-session swipe (left / up / right + chips, conflict picker), voice notes, Log now, safety prompt; futsal, skill lists, team sizes 4–15; new demo data; migrate round 1 data. |
| 3 | C: player profiles and patterns, season dot calendar. |
| 4 | C: chemistry links and map. |
| 5 | D: saved quarter-by-quarter draft line-up, live screen follows the plan, post-game minutes fix card. |
| 6 | E: division planner. |
| 7 | End-of-season carry-forward. |
