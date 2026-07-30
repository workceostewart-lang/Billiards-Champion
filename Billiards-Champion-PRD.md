# Billiards Champion — Product Requirements Document

## 1. Overview

**Billiards Champion** is a horizontally-oriented pool game (8-ball) played on a classic top-down table, following official pool rules. It uses the same visual/production approach as the studio's other titles (flat, bold-outline art style, colored ball/UI accents, score pill + EXIT button chrome) — but laid out **horizontally**, matching the natural orientation of a real pool table, in contrast to the vertical layout used for Golf Masters.

## 2. Core Pillars

- **8-ball fundamentals, simplified**: standard rack, group assignment, and win condition follow real 8-ball — but foul tracking and ball-in-hand are intentionally left out for a simpler, faster-flowing game (see Section 5).
- **Horizontal, landscape-first table layout**: matches a real pool table's proportions, per the reference screenshots.
- **Precision aiming clarity**: the player must always be able to see exactly where the cue ball will go, including after bouncing off a rail — aiming feedback is a top priority, not an afterthought.
- **Readable shot power**: the pull-back (draw-back) aiming indicator must clearly communicate how hard a shot will be.
- **Single consistent table look**: unlike Golf Masters' varied course palettes, this game uses one consistent table appearance — no table skins/themes.

## 3. Visual Style

- Flat-illustration style with thick black outlines, matching the reference screenshots: wood-tone rail, green felt (single fixed color, no alternate themes), black pocket circles, red/blue solid ball styling with the 8-ball marked distinctly, white cue ball.
- Standard UI chrome consistent with the studio's other titles: score pill (ball-count indicator, top-left) and EXIT button (top-right).
- **Cover art**: vibrant billiards-themed art (table, rack of balls, cue) in the same bold flat style as the in-game visuals, built from a **classic pool table color palette** — rich green felt, warm wood-tone rail, black pockets, and the red/blue/white/black ball accent colors carried through from the in-game table — so the cover art reads instantly as a pool game before any UI is visible.

## 4. Table & Layout

- **Orientation: horizontal** — the table is laid out landscape-style (long axis left-to-right), matching a real-world pool table and the provided reference screenshots.
- Standard 6-pocket layout: 4 corner pockets + 2 side (middle) pockets.
- Cue ball starts on the left side of the table; the rack (15 balls in triangle formation, 8-ball centered per official rules) is set on the right side, matching the reference screenshots.
- Table dimensions follow standard pool table proportions (2:1 playing-surface ratio), reoriented horizontally to match this game's layout (as opposed to Golf Masters' vertical lane dimensions).

## 5. Core Rules (8-Ball)

- Standard rack: 15 balls racked in a triangle, 8-ball in the center of the third row, with solids and stripes randomly mixed around it per official rules.
- Break shot determines nothing about ball group assignment; group assignment (solids vs. stripes) is determined by the **first ball legally potted** after the break, per standard rules.
- Players must pot all of their assigned group (solids or stripes) before legally potting the 8-ball to win.
- Win condition: legally pot the 8-ball after clearing your assigned group.
- **No foul detection/consequences**: the game does not track or penalize fouls (scratches, wrong-ball-first contact, etc.) as a separate rule system. A missed or failed shot simply ends the turn and passes play to the other player — kept simple by design, per direction.
- **No ball-in-hand**: since there's no foul system, there's no ball-in-hand mechanic. The cue ball is only manually placed at the start of a game/rack (e.g., on the break), and otherwise stays wherever it comes to rest after each shot.
- (Same CPU/multiplayer/versus-CPU structure to be defined in Section 8, consistent with the approach used across the studio's other games.)

## 6. Aiming & Shot Feedback (Key Differentiator)

This is the area most critical to gameplay feel — from the reference screenshots and prior feedback, priorities are:

- **Pull-back power indicator**: when the player pulls the cue ball back to set shot power, the indicator line must be **thicker and visually darker/higher-contrast** than the current implementation, so power is unambiguous at a glance (see reference screenshot showing the current thin/faint pull-back line).
- **Full trajectory preview, including bank shots**: the aiming line must show the cue ball's predicted path **bending/reflecting off rails** when the shot is lined up as a bank shot — not just a straight line that stops at the rail. The player should be able to clearly see the post-bounce direction before committing to the shot, so bank shots are genuinely readable and plannable, not guesswork.
- Aiming line should visually distinguish the pre-rail segment from the post-rail (bounced) segment if helpful for clarity (e.g., consistent style but clearly following the bend).
- This trajectory prediction should work for any number of rail bounces the aim line reasonably crosses before leaving the table's play area or reaching maximum aim-assist range.
- **Spin / English control**: per the latest reference screenshot, add a dedicated **contact-point selector** — a small circular cue-ball icon (bottom-right of the aiming HUD) with a draggable dot inside it representing exactly where the cue tip strikes the cue ball. Dragging the dot off-center applies spin (topspin, backspin/draw, or left/right side english) to the cue ball's roll after contact, matching how real spin/english works.
- **Power meter**: a vertical pull-back power bar (left side of screen) with a percentage readout, filled from bottom to top as the player draws back further — this is the thickened/darkened power indicator from Section 6 above, now paired with a numeric % for extra clarity.
- **Angle readout**: a numeric degree indicator (right side of screen) showing the precise current aim angle as the player adjusts their shot.
- **Dual aim-guide lines**: when aiming at an object ball, show two lines from the cue ball — one tracing the cue ball's path into contact, and a second showing the predicted **object ball's path** after contact — so the player can read both where their cue ball is going and where the ball they're hitting will go.

## 7. Guided Tutorial

- The main menu includes a prominent **Guided Tutorial** entry for new players and a replay state after completion.
- The tutorial contains five short, sequential lessons: table and 8-ball basics; pull-back aiming; readable shot power; spin/English; and a playable rail-bounce bank shot.
- Lessons are interaction-gated. Players advance only after demonstrating the current mechanic on the live Three.js table: aim with a non-zero pull, reach at least 35% power, move the cue-tip contact point off center, and preview then release a bank shot with at least one rail reflection.
- The aim and power lessons do not strike the cue ball, so players can learn the input safely. The final bank-shot lesson plays through the real Matter.js physics simulation.
- Each lesson displays its goal, coaching copy, a practical tip, five-step progress, Back, Skip, and a context-aware primary action. Completion offers a direct handoff to Solo Practice.
- Tutorial completion auto-saves locally and never removes the replay option.
- On portrait mobile, the coaching panel and controls must remain compact enough that the full table, every ball, all six pockets, the power meter, and spin control remain visible without horizontal cropping.

## 8. Game Modes

Consistent with the studio's existing menu pattern (Solo / Versus CPU / Multiplayer):

1. **Solo Play (Practice Mode)** — a freeform practice mode: the player racks up and takes shots with no opponent, no turn-passing pressure, and no match score to win or lose. Purpose is to let the player experiment with aiming, power, and spin/english (Section 6) at their own pace. Re-rack available on demand.
2. **Versus CPU** — head-to-head 8-ball match against a CPU opponent on one device, no room code needed.
3. **Multiplayer (Room Code)** — host creates a room and configures match settings; second player joins via room code on their own device. Players alternate turns per official 8-ball turn rules (player continues shooting as long as they legally pot a ball from their group; turn passes to the opponent on a miss or foul).
   - **Camera behavior**: both players view the **same shared table** at all times (unlike Golf Masters' per-player course view) — there is no camera switch between turns. Instead, only the **active player** can aim and shoot; the non-active player watches the same live table view in a read-only spectator state until the turn passes back to them.

## 9. Progress & Scoring

- Match score tracked as games won (best-of or race-to-X, configurable at room/match creation, consistent with other studio titles' point-to-win framing).
- Progress/settings and tutorial completion auto-save between sessions.

## 10. Reference Art

The three table-layout reference screenshots (horizontal wood-rail table with green felt, standard 6-pocket layout, red/blue ball coloring with numbered/marked 8-ball, white cue ball, thin pull-back aim line to be thickened/darkened, mid-game scattered ball state) define the baseline visual and table layout. The pull-back indicator and bank-shot trajectory bending described in Section 6 are explicit improvements to make on top of this reference, not features already shown working correctly in the screenshots.

A fourth reference screenshot (a classic 8-ball-style break setup) defines the target **aiming HUD**: vertical power meter with % readout, degree-angle readout, dual cue-ball/object-ball aim-guide lines, and the circular contact-point spin/english selector — all specified in Section 6.

## 11. Out of Scope (v1)

- Non-8-ball variants (9-ball, straight pool, snooker) — not requested, flag for future consideration.
- Monetization — not specified.

## 12. Open Questions

- CPU difficulty tiers (easy/medium/hard) — assumed desirable for consistency with other studio titles; confirm.
- Maximum number of rail bounces to render in the trajectory preview before cutting off.
- Exact spin/english physics tuning (how much curve/draw a given contact-point offset produces).
