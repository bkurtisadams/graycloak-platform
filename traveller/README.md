# Graycloak Traveller

## v0.89.1 the composer sticks; the sheet titlebar is one row

**The sheet's titlebar** got the treatment the popouts got in v0.88.0 and I
had not applied to the character window: one row, `[ − ]` and `[ CLOSE ]`
sized so they cannot wrap onto a second line, the title truncating instead of
pushing them, and the decorative rule under it hidden — the window frame
already separates the header from the sheet.

**The composer is sticky now.** The v0.88.0 fix was a flex chain, which only
holds if every ancestor gives CHAT a definite height — and one of them still
is not, which is why the box was still being pushed under. Rather than hunt
that ancestor through another round of measurements, the dice tray and message
box are `position: sticky; bottom: 0`, so they stay in view whether CHAT is a
flex column, a scrolling block, in the drawer, or in a popped-out window. It
is the less clever fix and the one that cannot be undone by a layout change
somewhere above it.

If the box is *still* obscured after this, then something is clipping rather
than scrolling, and the ancestor-chain measurement would settle it — that
snippet found the ACTORS bug in one paste when three of my theories had
failed.

## v0.89.0 the token menu, and a way to undo a wound

**The token menu is on the shared menu.** It was the last of the old
bracket-list menus — fifteen items in a flat column — and it needed the
shared `showContextMenu` to learn submenus first, which it now has (plus
group headings and a danger style). The menu reads: SELECT / TARGET / OPEN
SHEET, then **ORDERS** with the Book 1 declarations (ATTACK as a submenu of
foes with their range band and the number needed, then CLOSE, OPEN, RUN
CLOSER, RUN AWAY, EVADE, ESCAPE, STAND), then **REFEREE** with COVER and
STATUS as submenus, folding stock, the wound controls below, and REMOVE
marked as destructive. The heading says whether orders are available at all,
so a declared combatant no longer offers nine greyed items with no
explanation. The staged-scene token menu moved across as well — there is one
menu implementation in the client now, not two.

**A wound can be undone.** Book 1 wounds fall on STR, DEX and END and the
engine only ever reduced them; there was no way back short of editing the
JSON, which made a ruling awkward and running the same test fight twice
impossible. `setCombatantCurrent()` and `restoreCombatant()` are the two
directions, both through the document so the history records the change, with
the character's original as the ceiling — healing restores towards the sheet,
never past it — and anyone brought back above zero stops being unconscious.
On the menu: `WOUNDS: 6/8/5 — SET` for one prompt covering all three, and
`RESTORE TO FULL`, disabled when there is nothing to undo. Tested.

**Still open: the character sheet header, and clicking a characteristic.** You
are right on both. A characteristic on the sheet rolls a check, which is the
only thing it can do at present — there is no way to *edit* one, and for a
referee that is the more common need. Now that `setCombatantCurrent` exists
for combatants, the equivalent for a character document is the matching piece,
and the sheet's header is worth redrawing at the same time rather than
separately. Next, if you want it.

## v0.88.0 the chat box stays put; the popout is panel-sized

**The composer was a real bug, not tightness.** v0.81.0 pinned the dice tray
and message box beneath a scrolling feed, which works — but the drawer's own
body also scrolls, so a short drawer pushed the whole CHAT panel down and the
box with it. The popout rule made it worse: `.panel-popout .sidebar-panel`
turned every panel into a scrolling block, so inside a window the composer
scrolled away too. CHAT now owns the height it is given and scrolls only its
feed, in the drawer and in a window alike, and a popped-out chat will not
shrink below 280px — Foundry's behaviour, and for the same reason: the one
control you always need should not be the first thing to go.

**The popout is sized for a panel.** It inherited the character sheet's
720x640, which is a page, not a column of rows; panels open at 380x520 and
chat at 360x560, each remembering its own size afterwards. The titlebar
controls no longer wrap onto a second line, and the panel's own heading is
hidden once popped out — the titlebar already says COMBAT, so the window was
saying it twice.

**Still to do: the token right-click menu.** You are right that it is the old
design — fifteen bracketed items in a flat column, from before the compact
`showContextMenu` built for scenes in v0.82.0. It should use that instead:
grouped, tighter, with the destructive item marked. The reason it is not in
this version is that three of its entries (ATTACK, COVER, STATUS) are
cascades, and `showContextMenu` has no submenu support yet — adding that
properly is its own change rather than something to rush in beside two CSS
fixes. Next, if you want it.

## v0.87.0 pop a panel out over the canvas

With the tracker open you could not see chat, because the drawer shows one
tab at a time. Foundry's answer is to pop a panel out into its own window,
and ours reuses the document-window controller built for the character sheet
in v0.77.0 — the same tested geometry, drag, resize, minimise and saved
position, with no second window implementation to keep in step.

**Right-click any sidebar tab** for POP OUT (or RETURN TO SIDEBAR). The panel
floats over the canvas, draggable by its titlebar and resizable from its
corner, `[ − ]` to minimise and `[ DOCK ]` to send it back. The tab dims and
gains a marker while its panel is out, and clicking it focuses the window
rather than doing nothing. Several panels can be out at once — tracker on the
board, chat in the drawer, which is what you were after.

The panel's own element is **moved** into the window, not cloned, with a
comment left behind as its anchor so docking returns it to the same place in
the drawer. That matters more than it sounds: every id and every render path
keeps working untouched, so the tracker in a popped-out window is the same
tracker, updating from the same code, with nothing duplicated to drift.

Driven in jsdom: POP OUT moves the COMBAT panel into a floating window with
the tracker intact inside it, CHAT then shows in the drawer while COMBAT
stays visible in its window, the tab is marked, and DOCK puts it back in the
sidebar. That run also caught a silent miss — one of my edits hadn't applied
and the tab was never marked — which the harness reported as
`marked popped: false`.

## v0.86.0 a target belongs to a combatant, not to the canvas

You were right, and it was a modelling error rather than a UI preference.
There was one global `selectedEncounterTargetId` and one global set of extra
targets, so "the target" existed independently of who was aiming. Select a
second party member and they inherited the first one's target; two characters
could not be aiming at different foes at all, which is incoherent the moment
a party of three fights a pair of raiders — and Book 1 declarations are
actor-and-target pairs, so the document had always known better than the UI.

Targets are now kept per actor, `Map<actorId, Set<targetId>>`:

- Selecting a combatant shows **its own** targets. Stepping through the
  tracker — which the glyph click now does — walks each combatant's aim in
  turn, which is the behaviour you described.
- A **declared** action's target is the document's truth and overrides any
  pending mark, so once an order is given the ring follows the order.
- `T` and the token menu mark targets **for the selected combatant**, and
  refuse a combatant's own side.
- Removing a combatant drops it as everyone's target, not just as an actor.
- A resolved round clears every pending mark, since its declarations are
  spent.

Three pins that described the old globals are rewritten. Foundry keeps
targets per *user*, which is the right model when every player targets for
themselves; ours are per *combatant*, which is the same idea expressed
through Book 1's declaration structure — and it means the referee can set up
a whole round's aims before resolving any of it.

## v0.85.1 the manual dialog stops lying, and surprise reaches both paths

The manual dialog stays — it is the only way to build a fight that is not on
a scene, and a referee who wants "three raiders at long range, and they
surprised us" should not have to place six tokens first. But it needed three
corrections.

It announced a `32 × 20 VISUAL WORKSPACE`, which stopped being true at
v0.71.0 when boards became sized to the fight, and had been wrong for
fourteen versions. It now reports the board the current settings will
actually produce — read from `encounterBoardMeters()`, the same function that
builds it — and updates as the range, grid scale or scene changes. Pick a
scene in the dialog and it names that scene's board instead.

The Book 1 p.31 **surprise conditions** were reachable only through the
dialog, so a fight begun from a staged scene's tracker could not record that
the party was in a vehicle or wearing battle dress — a rule available from
one direction only, which is the kind of gap that quietly makes the engine
wrong rather than merely awkward. The tracker carries all five toggles now,
and both paths pass the same conditions into the document.

And `[ MANUAL SETUP ]` reads `[ FIGHT WITHOUT A SCENE ]`, because sitting
next to START COMBAT it looked like another route to the same thing rather
than the route for when there is no board.

## v0.85.0 the combat tracker takes Foundry's gestures; the build says what it is

**The tracker.** The header names the state — NOT STARTED before anything has
happened, ROUND n after, or the outcome once resolved — with the declared
count beside it. Each row's glyph is now the Foundry gesture: one click frames
the canvas on that token and selects it, a double-click opens its sheet (the
character window for a party member, the roster dialog for an NPC). Beside the
name sit PING, which frames and flashes the token so a referee can say "this
one" on a crowded board without moving anything, DEFEATED, which toggles
unconscious through the existing Book 1 status setter, and the wound figure —
current over original END, which is the closest honest equivalent of
Foundry's HP, since Book 1 p.36 puts wounds on the three physical
characteristics.

Two of Foundry's tracker features are deliberately absent rather than faked.
There is no initiative column and no turn pointer to step through, because
Book 1 rounds are simultaneous — everyone declares, then everything resolves
at once. And token visibility is not there: Foundry's eye toggle hides a token
from players, which for us would mean a new field on the combatant, filtering
in the published view, and a rule about what a player may infer from a gap on
the board. Worth doing, but as its own change with the player page in view.

**BUILD.txt and version-stamped assets.** After a day lost to a version that
was never where I thought it was, the deploy now writes
`graycloak.net/traveller/BUILD.txt` with the version, commit and build time,
and stamps `?v=<version>` onto every `app.js`, `enter.js`, `player.js` and
`styles.css` URL in the published pages. A new version is now a new URL, so
neither a browser nor a CDN can serve old code; and "is the site current?" is
one glance at a text file. The assemble step also runs under `set -euo
pipefail`, so a failed copy fails the job instead of publishing a half-built
site behind a green tick. I verified the stamping by running the same `sed`
against the real `index.html` — it rewrites both the module and the
stylesheet, and I fixed the stylesheet pattern when the first attempt missed
`./styles.css`.

## v0.84.2 the ACTORS tab was switched off by a mechanism that no longer exists

The directory was correct all along. `#roster-section`, which holds
`#directory-actors`, moved into the ACTORS sidebar panel in the v0.75.0
shell — but it was left in `applyOperationsDeskTab()`'s panel map, the
pre-shell WORLD / TRADE / JOBS / ROSTER sub-tab system. That function hides
every panel whose key is not the current desk tab, and the desk tab can
never be `roster` any more because those sub-tabs are gone. So every render
set `hidden` on the section while the ACTORS panel around it measured a
perfectly healthy 345x606. The cards were built, the content was in the DOM,
and `display: none` two levels down made it invisible.

ROSTER is out of that map, and the section is unhidden before the map runs:
the sidebar tab owns its own visibility now. A pin asserts both.

Diagnosed by walking the ancestor chain in the browser and reading the
computed `display` at each level — the fourth measurement in a row that beat
my reasoning. Three versions of theories (a throwing render stage, a
squeezed grid row, a duplicated element) were all wrong; the chain took one
paste.

## v0.84.1 a failing panel no longer takes the rest of the screen with it

`render()` ran its eleven panels as one straight sequence, so the first one
to throw on a particular campaign's data abandoned every panel after it. The
ACTORS directory is sixth in that line, which is why it sat empty — not
missing, not unwired, just never reached — with nothing in the UI to say so.
Each stage now runs on its own: a failure logs `render stage "<name>"
failed` with the exception and shows `RENDER FAILED IN <NAME>` in the
masthead, and the remaining panels still draw.

This does not yet fix whatever is throwing on the Sea of Suns data — it
makes the throw name itself instead of hiding as an empty panel, which is
what I needed and did not have.

## v0.84.0 the drawer shows its tab; the client reads at a glance

The ACTORS directory of v0.83 was there, buried: the old campaign header —
name, UPP, characteristics, skills — sat above every tab's content as a
strip in the drawer and, opened, took the whole visible height. It is
retired from the drawer. The sheet window shows all of it, and the sheet's
skill buttons open the same referee skill-check dialog, so nothing is
lost. (The element stays in the DOM, hidden: the client still writes those
fields and its roll controls answer keyboard shortcuts.) The drawer now opens
straight on the tab you picked, toolbar first.

And a readability pass on the palette itself. The character sheet reads
well — near-black on cream, with weight — and the rest of the client was
mid-grey on grey: `#565a56` on `#d9d9d3`, about 4:1. Paper is cream now,
secondary text dark enough to read without leaning in (about 9:1), rules
harder, base type one point larger, and the 9–11px captions in the drawer
and cards brought up a size. The monospace terminal identity is unchanged;
it stops being faint. If a screen looks washed out after this, that's a
place that hard-coded the old grey — say which and I'll chase it.

## v0.83.0 the Actors directory, the same shape as Scenes

`[ CREATE ACTOR ]` and `[ CREATE FOLDER ]` on top, search beneath; folders
as collapsible blocks — Party first, then NPCs by type (NPCs, Robots,
Creatures) — each NPC folder with a `+`; a card per actor with a token
glyph (circle for people, square for robots, diamond for creatures; party
blue, opposition red), name, role and who plays it. Every card still drags
onto a staged scene or the combat setup dialog. Right-click: VIEW SHEET
(party — switches the viewed character and opens the sheet window) or EDIT
(NPC), PLACE ON ACTIVE SCENE (at its centre), ASSIGN TO ME / CLEAR OWNER,
and for NPCs DUPLICATE, EXPORT DATA, IMPORT DATA, ARCHIVE / RESTORE.
Folders: NEW ACTOR HERE, RENAME FOLDER, SHOW / HIDE ARCHIVED. Vehicles use
the same card.

VIEW SHEET goes through `activatePartyCharacter`, the v0.31 path that keeps
the *viewed* character a local player-session choice rather than the
campaign's shared `activeCharacterId` — a pin from that version caught me
about to change the shared one, which is what those pins are for. The rules
side gained `duplicateNpcActorDocument`, `setNpcActorArchived` and
`npcActorMatchesSearch`, tested.

Driven in jsdom: the party card with its menu, an NPC made from the toolbar
appearing under NPCS with the fuller menu, PLACE ON ACTIVE SCENE staging it
(the Scenes card reads `1 STAGED`), and search by role.

## v0.82.0 the Scenes directory, Foundry's shape

Borrowed from the reference screenshot: `[ CREATE SCENE ]` and
`[ CREATE FOLDER ]` at the top with a search beneath; folders as collapsible
blocks, each with a `+` that opens the new-scene dialog with that folder
filled in; a thumbnail card per scene — the board as a small SVG, a faint
grid at the scene's own scale and each staged token as a dot by side — with
name and size, the active scene outlined in red the way Foundry marks the
viewed one; click to activate, double-click to activate and go to the
board; and a right-click menu on cards (ACTIVATE / DEACTIVATE, VIEW, EDIT,
DUPLICATE, EXPORT DATA, IMPORT DATA, DELETE) and on folders (NEW SCENE
HERE, RENAME FOLDER, CLEAR FOLDER). Foundry's remaining items — preload,
thumbnails from artwork, ownership — wait on scene backgrounds and are not
faked here.

Folders remain a path on the scene rather than a document of their own; a
folder created empty lives for the session until a scene is put in it. The
rules side gained `duplicateSceneDocument` (tokens copied, tracker not),
`adoptSceneDocument` (an imported file takes the campaign and a fresh
identity), `moveScenesToFolder`, `sceneMatchesSearch`, and
`sceneThumbnailSvg` — all pure, all tested. The generic `showContextMenu` is
the first one in the client and will serve actors and tokens next.

Driven in jsdom: two scenes made in two folders, thumbnails rendered, one
outlined, search narrowing to one, the context menu listing its seven
items, DUPLICATE producing "Downport (copy)", the folder `+` prefilling the
dialog. One thing I broke and caught: the directory rewrite sliced out the
v0.74 staging block that lived between it and `setActiveScene`; a pin now
asserts each of those functions is still defined.

## v0.81.0 the log is chat

The chat has existed since v0.75 — the table's messages interleaved with the
log by time, a message box, the dice tray, `/roll 2d6+1` — but it was laid
out like a log: newest entry at the top and the composer at the *end* of a
scrolling column, so with any history at all the box and dice sat below the
fold where nobody would find them. It is laid out like Foundry's chat now:
the feed fills the panel and scrolls, oldest at the top and newest at the
bottom, auto-scrolled to the latest, with the dice tray and the message box
pinned beneath it regardless of length. The heading says CHAT; the order
control reads NEWEST AT BOTTOM / NEWEST AT TOP; the stored order key is
bumped so a saved "newest at top" from the log days doesn't defeat the
default. Players type, roll, and read results in the same place, as before —
it's the same data on both pages — just where they'd expect it.

## v0.80.2 the drawer pushes; the world map pans

Two Foundry conventions, checked against its documentation. The sidebar
drawer, when open, now reserves its width: the stage — map and the port /
destination / ship strip alike — is never underneath it. Collapsed, only the
icon strip is reserved. And the world map pans by holding the right button
and dragging, as the combat board already did through the shared canvas and
as Foundry does; the wheel zooms. A right-click that did not move still
opens the context menu; one that panned does not. Driven in jsdom: a
right-drag of (−50, −20) scrolls the map by exactly (+50, +20), the grab
cursor comes and goes, and the menu is suppressed after a pan and allowed
after a click.

## v0.80.1 start collapsed, strips current, drawer opaque

From the first on-load screenshot of v0.80.0. The sidebar now starts
collapsed to its strip, as Foundry's cabinet does. The client passes through
its chargen state while a cloud campaign is loading, which auto-chose the
TABLES tab and left the drawer open on a placeholder; once the campaign is
active an auto-chosen TABLES yields to CHAT. The WHAT NOW? and character
summary strips were rendered at the top of `render()`, before the layout
pass that sets their text, so they were always one pass stale
(`CHARACTER GENERATION`, `--`); they render last now. The drawer and strip
are opaque — no zoom row ghosting through — the stage keeps clear of the
strip so a collapsed sidebar covers nothing, and the sidebar has one
scrollbar rather than two.

## v0.80.0 the canvas is the window

Matched to the Foundry reference screenshot rather than to a description of
it. The scene fills the viewport as the base layer. The scene controls float
at the top-left as two icon columns — the scene kind, and that scene's
tools. The sidebar is an icon strip on the far right edge, with its drawer
opening to the left *over* the canvas, exactly where Foundry's chat cabinet
sits; clicking the active tab collapses it back to the strip. The masthead
is a thin strip across the top. Nothing takes width from the canvas any
more: the three-column grid — and every narrow-window fight it caused from
v0.75 to v0.79.2 — is retired. The map runs to the right edge and under the
drawer, as it does under Foundry's chat.

Kept from the Traveller side: paper, monospace, hairline borders, no
shadows (a pin enforced that last one when I tried a shadow on the rail
buttons — the aesthetic is guarded, which is how it should be). The
document window now clamps to the near-full-viewport canvas.

Also: a favicon, so the console stops reporting a 404 on every load.

## v0.79.2 the stage was one pixel tall

Measured in the browser rather than inferred: at 1025×682 the shell's root
was the full viewport, but `.shell-stage` was 645×1 — one pixel tall — while
the sidebar was 486px and the rail 274px, each exactly its own content
height rather than the row's. The grid row was not stretching its items.

The cause is the very first `.terminal` rule in the stylesheet, from v0.1:
`align-items: start`. No shell rule ever overrode it, so every grid item
sized to its content. The stage's children are all absolutely positioned
(zero in-flow content), so it collapsed to its border. Why it appeared to
depend on window width is that at some widths a hidden-but-measured strip or
wrapped toolbar happened to give the stage enough incidental height to show
something; that was never the row doing its job.

`.terminal.shell` now sets `align-items: stretch; justify-items: stretch`,
and the rail, stage and sidebar each `align-self: stretch` with the global
`section { margin-top: 16px }` zeroed — that margin was the 16px offset
visible in the stage's `@80,59` against the row's top at 43.

The v0.79.1 change (scoping the legacy 1299px rule off the shell) stays; it
was a real fossil, just not this one.

## v0.79.1 the canvas below 1300px wide

The canvas showed only in a wide enough window. The width-dependent rule
responsible predates the shell: a v0.31-era `@media (max-width: 1299px)`
block that un-fixes `.terminal` (`position: static; inset: auto`) and makes
the body scroll, written for the old three-column terminal. `.terminal.shell`
overrode most of what it set but never claimed `position` or `inset`, so
below 1300px the shell quietly lost its viewport anchoring. That rule is now
scoped to `.terminal:not(.shell)`, and the shell explicitly owns
`position: fixed; inset: 0` so no legacy width rule can move it.

The shell's own narrow breakpoint (added in v0.78/v0.79) also never applied:
the fixed-column rule came later in the file at the same specificity and
overrode it at every width. The shell's breakpoints now come last — the
sidebar narrows to 300px below 1100px and starts collapsed below 900px, so
the canvas keeps its width instead of the sidebar taking it.

I can't render a narrow window here; what I can confirm is that this is the
only width-conditional rule in the stylesheet that touches the shell's root,
that the shell now owns every property it set, and that its breakpoints are
no longer dead.

## v0.79.0 permanent canvas and Foundry-style control behavior

The scene now occupies an explicit inset workspace instead of relying on a zero-height flex item, fixing the canvas disappearance seen in v0.78.0. The left palette is organized like Foundry: primary canvas layers in one column and tools for the selected layer in the adjacent column. The right sidebar now shows one directory or tracker at a time and collapses when its selected icon is clicked, returning the drawer width to the canvas. Combat remains on the right rail and opens the Traveller combat scene and tracker together.

## v0.78.0 Foundry-style tool rails and persistent activity sidebar

The referee client now uses the UI skeleton established by the Foundry reference: a compact two-column scene palette at left, a large icon-only game/document rail at right, and an activity/chat sidebar that stays visible when another right-side tool is open. Combat remains a right-rail game tool and opens the combat scene and tracker together. The default character window is reduced from 720 by 640 pixels to 520 by 500, with 300 by 200 minimum dimensions.

## v0.77.0 the character sheet opens as a floating document window

Built the way I said I would after the last attempt broke: the geometry and
state are pure functions in `src/document-window.js` — clamp, drag-by-delta,
resize, and open/close/minimize as plain state transitions, all with an
injectable storage — tested without a browser, 8 cases. The DOM wiring is a
generic `createWindowController()` any section can use (character today,
ship and journal later), built on nothing but those tested functions.

CHARACTER is now a toggle, not a tab: SYSTEM and COMBAT remain the scene;
opening CHARACTER floats the same sheet over whichever is showing, draggable
by its titlebar, resizable from its corner, with `[ − ]` to minimize and
`[ CLOSE ]` to return to the empty canvas. Geometry persists in session
storage and re-clamps if the window is reopened somewhere the canvas has
since shrunk. Character generation is unaffected — the sheet is still the
whole canvas there, window state fully reset on entry.

I integration-tested this by actually driving chargen to completion in a
jsdom harness, starting a campaign, and exercising the window end to end:
open (centred, correctly clamped to a 1200x800 container), drag (exact
pointer delta, persisted), a simulated native resize (persisted across all
four fields, not just position), minimize, restore, close, and reopening at
the exact saved geometry. That harness caught two real bugs before you ever
saw them — geometry was read from `offsetLeft`/`offsetWidth`, which needs a
real layout engine and reads as zero in jsdom; reading the element's own
inline style instead is both correct in a real browser (a drag and a native
resize both set it directly) and verifiable without one. The resize observer
now reasserts all four geometry fields as the canonical clamped values, not
just the two it used to touch.

## v0.76.4 a Scene may host an encounter even at its own minimum size

The board-size floor for a generated fight is 50 m — right for a fight the
engine sizes itself, wrong for a fight staged on a Scene, since Scene
Documents already permit a 10-square, 1 m-grid interior (a ship's compartment,
a small room) down to 10 m a side. Starting combat from a Scene that small
threw a RangeError instead of starting the fight. A Scene-backed encounter
now takes the Scene's own 10 m floor; a generated one keeps 50 m.

This is the one change from a third party's attempt at the next UI pass
(draggable, resizable document windows for the character sheet) that I could
verify as correct — it's a small, well-scoped fix to code I own, with a
regression test. The window feature itself is not carried forward: it
shipped with no test of its own, in code (DOM geometry, native CSS resize,
pointer-drag persistence) that is genuinely hard to verify without a real
browser, and was reported broken along with other parts of the client. This
release is v0.76.3 with only the Scene-size fix added, so the shell, chat,
dice tray, and the ACTORS/COMBAT work from the last several versions are
exactly as they were and pass every existing test.

Floating document windows for the character sheet — and later the ship and
journal — remain a good direction, matching the mockup this shell was built
from; I'd rather build that increment myself, with whatever verification is
possible, than carry forward a version I can't confirm works.

## v0.76.3 the combat map was sizing itself from an unresolved percentage height

The actual cause of the map running off the bottom of the window: several
layers of the shell's flex column relied on `height: 100%` inherited from
the pre-shell layout, and the ancestor those percentages needed was itself
never given a definite height — a percentage against an indefinite ancestor
does not resolve, so the browser fell back to the SVG's intrinsic 1:1
aspect ratio against its (definite) width instead. A 1206×1206 board
rendered as a tall square sized to the window's width, with no scrollbar to
reach the rest of it. `.canvas`, `#encounter-section` / `#subsector-section`,
the viewport, and the subsector map are now sized by `flex: 1 1 0` with an
explicit `height: 0` at every level, which sidesteps percentage resolution
entirely — each level is sized purely by flex-grow distributing the space
its parent actually has. I can't run a real layout engine here to confirm
the fix pixel-for-pixel; what I can confirm is that the rules are now the
only ones setting `height` on each element (nothing else contests it), which
is what was missing before.

**Removing a token was also refused for a reason the button didn't show.**
`removeEncounterCombatant` refuses two things — a resolved encounter, and
emptying a side — and only the second got a tooltip in v0.76.2. Your
screenshot's encounter had already reached VICTORY, so REMOVE was throwing
"encounter is already resolved" on every click. Both reasons now disable the
button before you press it, with the reason named. Dragging onto that same
resolved board is correctly refused too — there's nothing left to add to —
though I haven't yet given that case its own visible message beyond the
browser's own "no drop" cursor.

**The masthead now scrolls instead of clipping.** `overflow: hidden` on the
status row could hide the campaign name, the autosave state, or the account
entirely with nothing to say they were there. It scrolls horizontally now,
so nothing in it is ever unreachable.

## v0.76.2 the token menu couldn't be trusted, and reinforcements needed a drop target

Three real faults, likely all behind the same report.

**A bad foe could blank the whole context menu.** `showEncounterTokenMenu`
built its actions in one pass with no error handling; if computing the
attack preview for one foe threw — an odd loadout, an actor type the preview
did not expect — the exception aborted the function before it ever reached
`REMOVE FROM ENCOUNTER`, which is added last. The right-click menu would
then show only SELECT and TARGET, or nothing at all, with no sign why. Each
foe's preview is now wrapped on its own; a failure marks that one entry
UNAVAILABLE and the rest of the menu — including REMOVE — still builds.

**Removing the last combatant on a side was a silent throw.** An active
encounter needs at least one participant per side, so removing the last one
was always refused — correctly — but only as a caught exception and a status
line easy to miss. The button is now disabled with a tooltip that says why,
before you click it rather than after.

**Dragging an actor onto a fight already in progress had no drop target at
all.** `[ LOAD A CAMPAIGN FILE ]`'s sibling from v0.76.0 wired drag-and-drop
onto a *staged* scene only; once a fight starts, or after it ends, the
viewport had no `ondrop`, so a drag did nothing and said nothing. A roster
NPC dragged onto an active fight now reinforces it, at the dropped square,
the way `[ PLACE ROSTER ACTOR HERE ]` always has; dropping a party character
is refused with a plain reason — joining a fight mid-combat isn't something
Book 1 gives a character a way to do, so the client says so rather than
trying. A resolved encounter still takes no drops: there is nothing left to
add to.

If your two other party members still don't appear in ACTORS after this,
that's not one of these three — it means their character ids aren't in the
campaign's party list, which happens when a character reaches the party by
some path other than an invite seat or [ ADD CHARACTER ]. Worth checking
under JOURNAL → CAMPAIGN RECORD.

## v0.76.1 a tab is no longer buried under WHAT NOW?

WHAT NOW? opened by default and stayed open across every sidebar tab, so on
an ordinary screen it filled the sidebar and whichever tab had just been
selected — ACTORS, COMBAT, anything — sat below the fold with no sign it was
there. Picking a tab now closes both WHAT NOW? and the character strip;
either reopens with one click and stays open while you keep working in that
tab. WHAT NOW? starts closed rather than open, with its summary line still
naming what needs attention.

## v0.76.0 the ACTORS tab: folders, and drag onto the canvas

`campaignDirectory()` gives each entry a folder — party characters under
Party, roster NPCs grouped by type (Robots, Creatures, NPCs), ships under
Vehicles — and `directoryFolders()` groups and sorts them, the way scenes
already do. The ACTORS and VEHICLES tabs render folders instead of a flat
list.

Every actor row is draggable. Dropped on a staged scene's board, it is placed
at the square the pointer lands on — the same as right-click →
`[ PLACE ACTOR HERE ]`, reached by drag. Dropped on the combat setup dialog,
a roster NPC fills the next opponent slot the way `[ ADD ROSTER ACTOR ]`
always did; a party character notes that the whole party is already in a
manual setup. Nothing that clicked before stopped working — the drag is
another way in, not a replacement.

## v0.75.1 the shell, straightened

The first shell had three faults you could see at once. The masthead kept
the terminal's wrapping rules, so its right-hand items — status, account,
sign-out — wrapped down the left rail; it is one row now and never wraps.
The sidebar opened on WHAT NOW? and the character strip at full height, with
the tabs pushed to the bottom and the open panel reduced to a line; the tabs
are at the top as in the mockup, and WHAT NOW? and the character are
collapsible strips beneath them, each scrolling inside a bounded height,
with the character strip's summary line saying who and how they are when
closed. Tab labels no longer overrun their cells.

## v0.75.0 the shell: canvas first, a tool rail, a tabbed sidebar, and chat

The referee client takes the Foundry shape. The canvas fills the window. A
rail on the left carries the scene selector — CHARACTER, SYSTEM, COMBAT,
turned on their sides — and, beneath it, the tools that scene answers to:
fit, zoom, the system record and port on the world; fit, zoom, frame, grid
and the tracker on a board. A sidebar on the right is tabbed: **CHAT**,
**COMBAT**, **SCENES**, **ACTORS**, **VEHICLES**, **PORT**, **JOURNAL**,
**TABLES**, **PLAYERS**, **SETTINGS**. WHAT NOW? and the character strip sit
above the tabs, always in view. Clicking the open tab collapses the sidebar
to its icon strip.

Nothing the client knew was renamed: every panel moved into a tab and every
id survived. The two dropdown menus are gone — files and the table's
commands under SETTINGS, publishing and seats under PLAYERS, the campaign
record and threads under JOURNAL, the ship register under VEHICLES. The
operations desk is the PORT tab with its own WORLD / TRADE / JOBS strip;
the combat tracker is the COMBAT tab, which opens itself when a fight starts
unless the referee has picked a tab since; the Book 1 tables are the TABLES
tab, which opens itself during character generation. Combat no longer
suspends the other panels — a tab is a tab.

**Chat.** The CHAT tab is the Activity Log with the table's messages
interleaved by time, a message box, and a dice tray: 2D first, then D4 to
D100 and DX. A tray roll, or `/roll 2d6+1` typed into the box, is a message
the whole table sees — who rolled, the dice, the total. A Shift-click on a
die is the referee's private roll, which goes to the referee-only log rather
than to chat. The player page's LOG column is now CHAT, with the same box
and tray, so a player types where they read. The rules engine keeps rolling
its own seeded dice for combat, checks and chargen; the tray never decides a
rules outcome. `src/dice-tray.js` holds the formula parser, the roll and the
message shape, tested. **Rules v16** adds `travellerCampaigns/{id}/chat`.

Nine layout pins from v0.20 to v0.69 described the terminal frame; they are
rewritten against the shell and marked superseded. The page-load test
passes on all three pages.

Next, tab by tab: ACTORS with folders and drag-to-place, JOURNAL with the
records inside it, TABLES with rollable Book 1-3 tables, SCENES with
backgrounds, and a chat with whispers. Then back to the game.

## v0.74.1 WHAT NOW? no longer spills under its buttons on the lobby

The chargen rail on `enter.html` is a column flex container with a maximum
height, and `.procedure` sets its own `min-height`, which lets flexbox shrink
it below its text when the rail is short — the description ran under the
action buttons. Rail children no longer shrink; the rail scrolls instead.

## v0.74.0 the active scene, staged and seen, and the combat tracker

The Foundry shape, as you asked for it. **The referee activates a scene and
everyone sees it.** With no fight on, the referee's combat canvas shows the
active scene: right-click an empty square to `[ PLACE ACTOR HERE ]` — any
party character or roster NPC not already there, with a side — and drag tokens
about freely; right-click a token to change its side or remove it. The
campaign envelope carries the scene, by name and label, and the player page
shows it in place of the subsector (a `[ SUBSECTOR MAP ]` button and a
`[ SHOW SCENE ]` button switch between them). A player walks their own token
on the staged scene by dragging it — no allowance, nothing is running — and
the intent travels the same path a fight's move does, keyed by the scene.

**Combat starts from the tracker.** Right-click a token → `[ ADD TO COMBAT ]`
(or select several and `[ ADD SELECTED ]`); the COMBAT TRACKER lists them with
a crossed-swords mark on the board; `[ START COMBAT ]` lights when at least one
party token and one other are tracked. It creates the encounter on the scene
with everyone where they stand, reads the initial range off the closest
party/opponent pair, rolls surprise as the setup dialog does, and clears the
tracker. The setup dialog remains as `[ MANUAL SETUP ]` for a fight without
staging. The tracker is the referee's until then: the published scene does
not say who is in it.

`opponentSpecFromNpcActor()` gives a roster NPC the same combatant a placed
one gets; `authorizePlayerSceneMove()` checks a scene move by ownership and
presence only; `buildPublishedScene()` is the projection. Staged tokens gain
an `inCombat` flag.

No rules changes: scene moves use the existing `encounters/{id}/moves` rule
with the scene id in the encounter's place, and ownership is checked by
character id as before.

## v0.73.4 T targets the hovered token again

The T key handler lived on the map viewport and needed it to hold focus. The
shared canvas cancels the default on a token's pointerdown so the drag can
own the pointer, which also means a token click no longer moves focus into
the viewport — and T went quiet. Both pages now listen on the document while
the pointer is over a token (and nothing is being typed) and forward the key
to the viewport's handler, so hover-and-T works from anywhere. Escape is
unchanged.

## v0.73.3 a character file loads on the lobby

`[ LOAD JSON ]` lived on the referee client's chargen bar, which campaign play
hides and which the lobby has replaced as the place characters are made. The
lobby now has `[ LOAD A CHARACTER FILE ]` beside `[ ROLL A NEW CHARACTER ]`: a
finished Character Document — an earlier export, a file from the referee
client — becomes one of the account's characters at once, and a chargen in
progress resumes as the draft. The referee's `[ ADD CHARACTER ]` in the
REFEREE menu still takes a file straight into the campaign.

## v0.73.2 the drag stops at the allowance

A player could drag past the walk or run allowance, drop, and watch the token
go back. The canvas gains a `constrain` hook a page may use to cap the
destination while the drag is in progress; the player page caps each axis to
the allowance in whole grid squares, so the token slides along the boundary
and the label reads `LIMIT` there. The referee's own drags are not capped —
the referee places tokens where the fiction puts them.

## v0.73.1 a player's drag reaches the referee's board

Every player token drag since v0.61.0 was refused by the referee's client with
`combatant is unavailable`. The move intent speaks of an `actorId`; the
encounter's mover expects a `combatantId`; the referee passed one where the
other was wanted. The Firestore rules for `moves` were never in the console
until this week, so the refusal never had a chance to appear. There is no
approval step and never was: a legal drag is applied and republished at once,
and only an illegal one is refused, with the reason on the player's page.

`playerMoveToCombatantMove()` in `src/player-token-movement.js` is the
adapter, and a test applies an authorized intent to a real encounter — and
asserts the raw intent still fails, so the bug stays named.

## v0.73.0 one combat canvas

The structural half of the combat audit, finished. `client/scene-canvas.js`
is the board both pages draw with, the way `subsector-svg.js` is the one hex
map. It owns the viewBox camera (zoom about the pointer, right-drag pan, fit,
frame a set of points), the grid for a board of metre cells at a grid scale,
token layout one square wide with the stacking of tokens that share a
square, each token's base — circle for people, square for robots, diamond for
creatures; party or enemy; selected brackets, target ring, declared, inactive,
owned — and the drag: threshold, grid snap, trail from where the round's
movement began, label in screen units, and a described legality (`legal`,
`limit`, `over`) from the caller.

It knows nothing about encounters, characters or Firestore. A page passes
plain token records and callbacks — `underlay`, `overlay` and `decorate` with
the board's metrics; `canDrag`, `describe`, `onDrop`, `onSelect`,
`onContextMenu`, `onHover` — and gets the token groups back.

**The referee client** keeps its range boundaries, range line, movement paths,
declared-order arrows, condition and tally markers, remote-target dots,
hover tooltip and token menus, drawn through those callbacks; its drop still
goes through `moveEncounterToken` and the Book 1 check. **The player page**
keeps its movement paths and remote-target dots, its drag still writes a
`moves` intent for the referee, and its drop still refuses over-allowance
locally. About 500 lines left the two pages; the module is 330. The focus
ring (v0.70.3), the metre-vs-square label, the order arrow at zoom — each of
those was one page drifting from the other, and there is now one place for
them to be right.

Verified by a jsdom harness driving the module directly: layout stacks
tokens sharing a square, render draws the three shapes and both marks, the
camera zooms, fits and frames, a click selects, a right-click opens the menu,
a drag shows the trail and label and drops on the snapped square. The
page-load test passes for all three pages.

What this unlocks and does not yet do: staging tokens onto a scene by drag,
background images, and rectangular boards — next.

No rules-package changes; no schema changes.

## v0.72.4 the pages are loaded, not just read

`test/pages-load.test.mjs` imports `app.js`, `player.js` and `enter.js` into a
jsdom document — a staged copy of the client tree with `auth.js` and
`signin-ui.js` stubbed so no network or Firebase project is needed — and
asserts each reaches its masthead with the current version. Reinserting the
v0.72.0 temporal-dead-zone line makes it fail with the exact error the
browser showed; the static pins never could. It skips with a note when jsdom
is absent.

This is the client's first dev dependency, `jsdom ^24.1.3` — the same
package, same major, that `gcc` already carries, so `pnpm install` at the
repo root adds nothing new to the lockfile's resolutions.

## v0.72.3 the lobby says what you rolled; rank 5-6 rolls corrected

Rules package v0.24.1: rank 5 or 6 grants two extra mustering-out rolls and
+1 on Table 1, not a third roll (Book 1 p.8; Jamison on p.25 rolls seven as a
five-term Captain). The allowance had given three.

The lobby's chargen now has a GENERATION LOG under the tables — every event as
the referee's Activity Log has always worded it (`AGE 30  BENEFIT  d6 4 ->
Gun weapon`), newest first and bold. Rolling on `enter.html` no longer changes
the sheet in silence.

## v0.72.2 the referee client did not load

v0.72.0 added the scene state with a text replacement that also matched the
declaration line, leaving `sceneDocuments = [];` one line above
`let sceneDocuments`, which is a temporal-dead-zone error at module load:
nothing in `app.js` ran, on graycloak.net or locally, and the static pins
could not see it because they read text rather than run it. The line is
removed; `app.js` now loads to the masthead in a jsdom harness; and a pin
refuses any bare assignment directly after a top-level `let`, the exact shape
of that accident. The Pages workflow also writes `.nojekyll` so Jekyll cannot
drop the `vendor/` directory from the site.

## v0.72.1 graycloak.net/traveller

Traveller lived outside `gcc/`, the folder GitHub Pages publishes as
graycloak.net, and imported the rules package from two directories above
itself — so there was no address for it but localhost. Now:

- Every import of the rules package in `client/`, `src/`, `world/` and the
  tests is `../vendor/classic-traveller-rules/`, and `scripts/sync-vendor.mjs`
  makes that copy from `packages/classic-traveller-rules` — the source of
  truth, untouched. `npm test` runs it first; `serve-traveller.bat` runs it
  before serving; `traveller/vendor/` is git-ignored.
- The Pages workflow vendors and assembles `gcc/traveller/` (client, src,
  world, campaigns, vendor) at deploy time, with an `index.html` that forwards
  to `client/enter.html`. Nothing is duplicated in the repository.

The front door is **https://graycloak.net/traveller/** (→ `client/enter.html`),
with `client/index.html` and `client/player.html` beside it, reached from the
lobby as before. Firebase already authorises graycloak.net for the AD&D client,
so sign-in and Firestore work unchanged. Verified locally by assembling the
same tree and resolving every relative import in it.

## v0.72.0 scenes, in folders

The structural half of the combat audit begins. A **scene** is a board on its
own: a name, a size in squares, a grid scale, a folder in the directory, and
tokens staged on it before anything is declared. `src/scene-document.js` holds
the shape; the campaign document (schema 11) lists scenes in `documentRefs`
and names an `activeSceneId`; the bundle (v8) and the registry carry them;
the cloud home carries them with everything else, so no rules change.

**The directory gains SCENES**, grouped by folder — folders are paths on the
scene, `Ports/Aster`, the way Foundry does it — with `[ NEW SCENE ]` opening
a dialog for name, folder, squares a side and metres per square, and each row
offering `[ ACTIVATE ]`, `[ RENAME ]` and `[ DELETE ]`. A scene with a fight on
it cannot be deleted.

**A fight is fought on a scene.** Encounter schema 15 records `sceneId`. The
combat setup dialog offers `SCENE`, defaulting to the active one, and a fight
on a scene takes the scene's board and puts any staged token where the
referee left it — an unstaged combatant still takes the initial-range default.
A situation-driven fight uses the active scene if there is one.

**Not yet:** staging tokens by dragging from the directory onto the board, a
background image, and rectangular boards. Those need the shared canvas, which
is v0.73.0.

No rules-package changes. Campaign 10 → 11, bundle 7 → 8, encounter 14 → 15;
all migrations are additive.

## v0.71.0 a board the size of the fight

The combat audit found one cause behind the last four canvas bugs: the board
was a kilometre square at metre resolution, tokens were a metre wide, and so a
fit-to-view made a token one pixel and a usable view meant 6400% zoom — where
everything defined in user units (focus rings, labels, order arrows) became
enormous. This is the first of two cuts that replace that with Foundry's
answer: a scene-sized board on which a token is a square.

**The board is sized to the fight.** Encounter schema 14: `map.columns` and
`rows` are per encounter, square, and chosen by `encounterBoardMeters()` from
the initial range and grid scale — room for the range twice over plus margin,
never fewer than 40 squares a side, never more than the kilometre. A
medium-range fight on 5 m squares is a 200 m board; long is 520 m; very long
is the kilometre, as before. The party stands a quarter of the way across and
the opposition the initial range to their right, rows spread two squares apart
around the middle. Positions remain metre cells snapped to the grid, so
nothing about range, movement or contact changes; the movers and validators
read the board from the document instead of a constant, and every pre-v0.71
kilometre board is still valid, untouched.

**A token is a square.** Both canvases now draw a token in units of one grid
square — one metre on a metre grid, five on a five-metre one — so it fills its
square at any scale and any zoom, and the tokens sharing a square are offset
by half a square. The declared-order arrows are sized in squares too. Maximum
zoom drops from 6400% to 1600%, which is all a 40-square board needs.

**A refused move or order tells the player why.** The referee's client already
logged the reason to its own console; it now also writes it as a line addressed
to that player, which reaches their LOG and becomes their status line —
`YOUR MOVE WAS REFUSED: MOVEMENT IS NOT FOR THE ACTIVE ENCOUNTER ROUND` where
the drag happened.

**Deferred to v0.72.0, deliberately:** scene documents (name, size, background
image, folder) that encounters reference instead of carrying a map; Scenes,
Actors and Vehicles folders in the campaign directory; placing an actor on a
scene before a fight; rectangular boards; and lifting the two canvases into
one shared module the way the subsector map was. Those are the structural
part of the audit and belong together.

No rules-package changes. Encounter schema 13 → 14 (no data change).

## v0.70.3 the giant white ring on a player's token

Chrome draws the focus outline of a focused SVG group in user units, so on the
player canvas at deep zoom a clicked token sat inside a white ring wider than
itself. The referee canvas has suppressed that outline since v0.60; the player
canvas now does too. The gold corner brackets remain the selection mark.

## v0.70.2 the world wins over a finished fight

A resolved encounter stayed the campaign's current scene, so the player page
went on showing its board — `VICTORY`, tokens where they fell — instead of
the world. Now the world shows whenever no fight is *active*; a finished one is
noted above the map as `LAST FIGHT / … / VICTORY` with `[ SHOW BOARD ]`, and
`[ BACK TO WORLD ]` returns. A new fight takes the scene as before.

## v0.70.1 the zoom constants came out with the map

Lifting the map renderer in v0.70.0 took `SUBSECTOR_ZOOM_MIN`, `_MAX` and
`_STEP` with it, so the referee client threw in `applySubsectorZoom()` on the
first render of a loaded campaign — after drawing the map, before the system
record, selection and everything after. The constants are back, and a pin now
checks every SCREAMING_CASE identifier used in `app.js` is declared or
imported, so the next lift cannot leave one behind.

## v0.70.0 the world between fights, and boards that reach the players when they exist

**The player sees where they are.** Until now "scene" on the player page meant
a combat scene, and between fights the tab said `NO SCENE PUBLISHED YET` —
which is what a player pressing `[ ENTER WORLD ]` saw first. The scene column
now draws the world when no fight is on: the subsector map with the party's
system marked, and a strip with the current port and UWP, the ship's name,
type, tonnage and jump, its fuel and its hold. Read-only — the player watches
the referee jump — and it gives way to the combat canvas the moment a fight
is published. The tab reads `WORLD` between fights, `SCENE / ROUND n` during
one.

The map is the referee's map, lifted: `renderSubsectorMap()` in
`subsector-svg.js` now draws it for both pages, interactive when given an
`onSelect` and inert otherwise, so the two cannot drift. The ship rides on the
campaign envelope as `buildPublishedShip()` — name, type, jump, fuel, hold,
berths, passengers — and a test asserts the operating account and the
manifests are not in it: money and cargo stay the referee's until the player
page can act on them.

**An active board publishes with every save.** The player-safe view of a
fight used to go out when a round resolved or on `[ PUBLISH SCENE ]`, so a
board just set up sat unpublished and the player's page said so. Now any
autosave while an encounter is active — starting it, placing a roster NPC,
moving a token by hand — publishes the view. The manual control stays for
holding a board back.

No rules-package changes; no campaign schema changes; the envelope gains a
`ship` field.

## v0.69.1 the SDK race, orphaned homes, and the draft on the list

**`Firestore SDK did not load`.** The lobby starts two things at once on
sign-in — the character watcher and the campaigns query — and both called
`ensureFirestore()`. The first appended the Firestore script and waited; the
second found the tag already in the page, assumed it had loaded, and threw
before it had. Which one lost was timing, which is why the campaigns list
showed one minute and not the next. The loader now hands every caller the
same pending promise and appends the script once. Verified with three
concurrent callers against a scripted document: one tag, all resolve.

**An orphaned home is adopted, not refused.** Deleting a campaign document in
the Firebase console without its subcollections leaves `state/current`
behind. A load then created a fresh envelope, found a home it had no revision
for, and refused — stranding the campaign with no `[ RUN ]` and no way to
load. A first save that itself created the envelope now adopts a home it finds
beneath at the next revision; with the envelope already present, a
revision-less save is still refused, as it should be. The campaigns list also
refreshes after a failed load.

**Sign-in lands on the list.** A character in generation is offered there as
a row with `[ RESUME ]` and `[ DISCARD ]` rather than opening chargen on
arrival.

## v0.69.0 one chargen, campaigns start from a character, and a REFEREE menu

**One place characters are made.** A character is rolled on the lobby and
lands in `YOUR CHARACTERS`; that is the screen, and it was always there —
`[ NEW CAMPAIGN ]` on the lobby just sent you past it into the referee client's
own chargen, which ends in a campaign shell and never saves the character as
yours. That link is gone. The referee client's chargen stays for rolling at
the table — an NPC, or a PC for a player without an account — as
`[ ROLL A CHARACTER ]` in the new menu, and a cold visit to `index.html` now
goes to the lobby whether or not you are signed in.

**A campaign starts from a character.** Each unseated character on the lobby
offers `[ START A CAMPAIGN ]` beside `[ JOIN A TABLE ]`. It opens the referee
client with `?start=<characterId>`, which reads your own record, creates the
campaign around that character, saves it to its home at once, and marks the
record as living there — the state a seat by invite produces, with you as both
referee and player. Rules v15 permits an owner to move their own character into
a campaign they referee; every other move still needs a join request.

**A campaign file loads on the lobby** with `[ LOAD A CAMPAIGN FILE ]`, gets a
home under your account immediately, and appears in `YOUR CAMPAIGNS`. A file
whose campaign already has a home is refused with the suggestion to run it.

**Two menus.** `[ CAMPAIGN v ]` keeps the file operations — save, reload from
cloud, load the browser copy, import, export — and a `[ LOBBY ]` link.
`[ REFEREE v ]` is running the table: publish status and controls,
`[ PLAYERS AND INVITES ]`, `[ NEW CAMPAIGN ]` (from a character rolled at the
table), `[ ADD CHARACTER ]`, `[ ROLL A CHARACTER ]`, ship register, campaign
record, adventure threads. The masthead's `[ NEW CHARACTER ]` is retired.

**v0.68.1, folded in:** the first cloud save of a campaign failed with
`CLOUD FAILED` because the home is referee-only and "referee" is read off the
envelope document, which did not exist yet — a chicken-and-egg that showed the
moment a campaign was reloaded from a file after being deleted from Firestore.
A first save now writes the envelope before the transaction.

Rules v15 is in the rules changed-files zip with its case. No rules-package or
campaign schema changes.

## v0.68.0 the campaign lives in Firestore; the browser is a cache

Until now a campaign lived in one browser's registry and Firestore held only
what players may read. Clear site data or switch machines and it was gone
unless you had exported a bundle, and the lobby had no campaigns to list. The
two stores gave nothing in return; this removes the second one.

**The home.** `travellerCampaigns/{id}/state/current` is the whole campaign as
the same portable bundle `[ EXPORT ]` produces, referee-only, with an owner, a
revision and a save time. Every browser autosave is followed, two seconds
later, by a write of the bundle to its home; the player-readable envelope is
written in the same transaction, so the two never disagree about the
campaign's name, clock, location, ownership or revision. A campaign has a
home from its first signed-in save, and by having one it is published.

**Revisions stop two browsers from overwriting each other.** A save names the
revision this browser loaded and the transaction refuses if the home has moved
on. A refused save marks the campaign stale — `AUTOSAVED … / CLOUD STALE` —
and stops cloud saves until `[ RELOAD FROM CLOUD ]` in the campaign menu
brings the home down; the browser copy keeps autosaving meanwhile, so nothing
is lost in either direction. A campaign opened from the browser cache or from
a file forgets the revision, and its first save is refused if a home already
exists — the referee must reload before overwriting what another browser
saved. Verified against a scripted Firestore: sequential saves advance, a
stale browser is refused, a cache-loaded copy is refused over an existing
home, and the envelope carries the home's revision.

**The pages now agree about who goes where.** `enter.html` is the front door.
Signed in, it lists the account's characters and, new, `YOUR CAMPAIGNS` — the
campaigns this account referees, from their homes, each with `[ RUN ]`, plus
`[ NEW CAMPAIGN ]`. `index.html` opened by `[ RUN ]` loads that campaign from
its home (falling back to the browser copy, and saying so); opened cold and
signed out it hands over to the lobby, unless `?local=1` asks for the old
offline behaviour. `player.html` opened without a campaign hands over too.
Sign-in is per tab now — session persistence — so you sign in every visit and
a shared machine at the table does not carry one account into the next
window.

**Rules v14** adds the referee-only `state/{doc}` match and lets a referee
list the campaigns they own; suite cases are in the rules changed-files zip.

The autosave line reads `AUTOSAVED 3s AGO / CLOUD R12`, or `/ CLOUD PENDING`
before the first cloud save, `/ LOCAL ONLY` signed out, `/ CLOUD FAILED` with
the reason in the tooltip. No rules-package changes; no campaign document
schema changes — the home is the existing bundle in a new place.

## v0.67.1 benefits received twice, as Book 1 has them

Rules package v0.24.0. You remembered a repeated mustering-out benefit turning
into cash; Book 1 pp.22–23 has no such rule, and now that the text is to hand
the package follows what it does say. A second Travellers' Aid Society result is
a wasted roll and a second Scout Ship is lost — recorded as such, still counted
against the allowance, nothing added. A repeated Gun or Blade benefit may be
taken as expertise only in a weapon already received as a benefit: ticking
`TAKE AS SKILL` now greys out every weapon the character has not been handed,
with the page reference in the tooltip. A repeated Free Trader is kept, because
each additional receipt is ten years of payments made; that resolves with Free
Trader finance, which is Book 2 work. The generation log marks a wasted roll.

No persistent document schema changes.

## v0.67.0 the player's front door

`enter.html` is where a player starts. Sign in with a Graycloak account; see
the characters that account owns; roll another with the same Book 1 chargen
the referee's client uses; sit one down at a referee's table by entering an
invite code; enter the world it is in. The referee's client is never loaded.

**A character now exists apart from any campaign.** `travellerCharacters/{id}`
is the player's own record: the Character Document in full, `ownerUid`, and a
`world` saying where the character is — nowhere yet, a referee's campaign, or
the solo world. A character is in one world at a time, because a solo
character and a table character would carry irreconcilable dates. The owner
reads, edits and deletes the record but may not move it between worlds by
hand: a seat is the referee's to give and take, so the rules let only the
referee of the campaign it is leaving or joining change `world`, and let them
change nothing else. `src/character-record.js` holds the shapes and is tested
on its own.

**A seat is by invite.** `[ PLAYERS ]` gains `[ NEW INVITE ]`, which mints a
six-character code (no 0/O or 1/I) in the platform's existing `invites`
collection with the campaign named on it, and shows the link
`enter.html?invite=CODE` to copy. A player with an unseated character presses
`[ JOIN A TABLE ]`, enters the code — pre-filled from the link — and
`[ SIT DOWN ]` writes a join request beneath the campaign carrying a snapshot of
the character. The rules accept it only from that account, for that campaign,
with a code that opens it; it cannot be revised, and the player may withdraw.
The request appears in the referee's dialog under `WAITING TO SIT DOWN` with
UPP and service, live. `[ SEAT ]` copies the character into the party, assigns
and seats the account, publishes, marks the player's record as belonging to
this campaign, and clears the request; `[ DECLINE ]` just clears it. Removing
a player sends their records back to unassigned. Seating by account id stays
as the fallback.

**The list is the MMO screen you described.** Each character shows name, UPP,
service, rank, age and skill count, and where it is: `NOT YET AT A TABLE`,
`AWAITING A SEAT AT …`, or `SEATED AT …` with `[ ENTER WORLD ]`, which opens
`player.html` already connected with the sheet on the CHARACTER tab. With no
characters the page says so and offers the roll. Solo characters show a
disabled `[ SOLO WORLD / NOT YET OPEN ]`: solo play on the shared world clock
is its own milestone and the record already knows the difference.

**Chargen on this page is the lifted view.** WHAT NOW? and the Book 1 tables
sit in a rail beside the sheet; a name field with `[ RANDOM ]`; a character
in progress survives a reload. Mustering out ends in `[ SAVE CHARACTER ]`,
which requires a name, or `[ DISCARD ]`. Verified in a jsdom harness with
Firestore stubbed: sign in, empty state, a random career to completion, naming,
save, the row and its status, join with the code from the link, the request
carrying the character's UPP and skills, and the draft in storage.

**Rules v13** is in `docs/firestore-rules-v13-characters-and-invites.md` with
its suite cases; it has to be merged and deployed before any of this reaches
Firestore. The acceptance additions are at the end of that note.

No Classic Traveller rules-package changes. No persistent campaign document
schema changes; the character record is a new document type outside the
campaign.

## v0.66.0 the chargen view leaves app.js

No visible change. This is the refactor that has to precede the player lobby:
character generation was seventy-odd call sites woven through `app.js`,
rendering into the referee's frame, and a page for players to roll their own
characters cannot import the referee's client to get at it.

**`client/chargen-view.js` now holds every chargen rendering path** — the Book
1 sheet as it fills in, the WHAT NOW? actions for enlistment, skill tables,
specializations, aging crises and mustering-out choices, and the phase-linked
Book 1 tables. It renders from a chargen character into elements the caller
passes and reports choices through an `execute(action, payload)` callback. It
owns no state: the host page holds the character, runs the rules-package
action itself, and re-renders. That keeps the referee client's `execute()` —
which also resets campaign state when a fresh character is rolled — where it
was, and lets the lobby page supply its own.

`app.js` delegates and shrinks by about 240 lines. `renderChargenSheet()`
supplies the sheet elements and calls the view; `renderActions()` keeps the
completed-character branch (start a campaign, add to a saved one, export,
assign the scout ship) and hands the in-progress branch to the module;
`renderChargenTables()` clears the tables during campaign play and otherwise
calls the view. The rules-package and ui-model imports the chargen code needed
move with it.

**Verified two ways.** The static pins that named the lifted code now point at
the module, and a new pin asserts the bodies are gone from `app.js` and the
module references no campaign, gameplay or storage state. Then a jsdom harness
drove random complete careers through the module — enlistment, the draft,
survival, commissions, skills and specializations, reenlistment, aging to 46,
death in service, mustering out with benefit specializations — rendering the
sheet, actions and tables at every step, with no exceptions and the expected
elements present. The harness is not committed: it would add a dev dependency
the suite does not otherwise need.

No Classic Traveller rules-package changes. No persistent document schema
changes.

## v0.65.0 the player sees their own character, and the table's log

Until now the player page was a scene window and a declaration form. A player
could act in a fight and see nothing else: not the character they play, not
the ship, not a line of what happened between fights. This puts the sheet and
the log on that page.

**Each character is published, in full, to the account that plays it.** Book 1
puts the personnel record in the player's hands, so `buildPublishedCharacter()`
is the document rather than a projection — characteristics with current
values, skills, loadout, benefits, finances, ship references, history and
notes — wrapped in the campaign envelope. It is written to
`travellerCampaigns/{id}/players/{uid}/characters/{characterId}`, a path the
rules let only that account and the referee read. Firestore grants access per
document and cannot filter fields, so the split between players is done by
path: one player's sheet is never in a document another player can open. The
referee's document stays authoritative; this is a copy, and reassigning a
character removes the copy from the previous owner's path.

**The log a player gets is an allowlist, not a filter.** The activity log is
the referee's audit trail. Its COMBAT lines carry the dice, every DM and the
target number — the same arithmetic the scene narration was built to hide —
and ROSTER, SITUATION and THREAD lines record what the party has not yet found
out. So `buildPublishedLog()` passes a public entry only if its category is
named as table knowledge (ARRIVAL, JUMP, NAV, PORT, SHIP, TRADE, JOB, CONTRACT,
CHAR, CHECK, NOTE, SYSTEM), drops the source ids, and keeps the last 300. An
entry the referee addressed to players passes regardless of category, and the
audience may be named by account or by the character that account plays. A
test asserts that a combat audit line with `ROLL 2D`, a roster line with an
NPC's END, and a referee-only entry never reach the payload. Failing closed
means a category added later cannot leak by default; the combat a player was
in is already on the scene as narration.

**Published when it matters, without a button.** Player documents go out with
`[ PUBLISH ]` and `[ REPUBLISH ]`, when a player is seated, after every
resolved round — wounds have just been written back to the sheet — and behind
the activity log while online, debounced to one write per burst so a jump,
its arrival and its berthing become one publish. A failure never interrupts
play. Unseating a player clears their subtree.

**The player page grows a CHARACTER / SCENE tab strip and a LOG column.** The
sheet reuses the referee's Book 1 form and styles, read rather than edited:
weapon and armour are shown, not selected, and notes are text, because editing
arrives with the command service rather than through this page. A player with
two characters gets a picker. A fight in progress brings the scene forward
unless the player has picked a tab themselves; with no scene the page rests on
the character. The log reads newest first, with addressed entries marked
`TO YOU` and ruled in gold like the player's own token.

**Not done here:** the Firestore rule for `players/{uid}/{document=**}` is in
`docs/firestore-rules-player-documents.md` and has to be merged into the
platform ruleset and run through `test-rules.bat` before deploying; the
acceptance checklist gains a section for it. The player still cannot see the
ship or roll anything from their own page.

No Classic Traveller rules-package changes. No persistent document schema
changes; the published character and log are projections.

## v0.64.0 complete Book 1 morale modifiers

The rules package now represents every morale DM printed on Book 1 p.36:
military unit, a leader with Tactics, a killed leader, and casualties exceeding
50%. The casualty penalty is derived directly from party strength; unit and
leader facts remain explicit inputs because the encounter cannot safely invent
who commands a side. Morale history now displays a nonzero DM beside the dice
and total.

Rules package v0.23.0. No persistent document schema changes.

## v0.63.7 explicit canvas selection

Starting or reopening combat no longer selects a party token or enemy target.
The referee establishes both states only by interacting with tokens, just as a
player selects an owned token and targets a visible token. Placing a roster
actor and advancing to another pending declaration likewise no longer changes
the referee's selection behind the scenes.

## v0.63.6 finished-canvas cleanup and mouse controls

Completed combat canvases no longer draw the last movement trail, selected-pair
line, or range boundaries. Escape clears every local selection and target;
left-clicking empty canvas clears controlled tokens while leaving targets
independent. Empty-canvas viewport panning now uses right-button drag on both
referee and player canvases. A stationary referee right-click still opens the
placement menu.

## v0.63.5 referee movement revision

Dragging a token again on the referee canvas now revises that combatant's
current-round move instead of previewing successfully and snapping back on
release. The replacement is measured from the round's original position,
replaces the prior trail, and remains subject to the same 25 m WALK or 50 m RUN
allowance. A player submission remains immutable and limited to one per round.

## v0.63.4 readable drag label and compact hover

The counter-scaled WALK/RUN label is larger and clearer at deep zoom while
remaining bounded on screen. Referee token hover is reduced to two quick-read
lines: identity and visible status, followed by weapon, armour, and conditions.
Characteristics, skill level, body model, and biography remain available in
the selected-token detail and roster instead of obscuring the battlefield.

## v0.63.3 fixed-size movement label

The live WALK/RUN drag label now counter-scales against canvas zoom. Its text,
outline, and offset from the token remain compact and readable from the fitted
map through 6400% zoom on both referee and player canvases.

## v0.63.2 centered one-metre grid

Grid lines are now boundaries between square centers, so tokens land inside
their snapped square rather than on a vertex. Minor and 25 m major grid lines,
plus the selected-pair range line, use non-scaling strokes and remain thin at
deep zoom. Maximum referee and player canvas zoom increases to 6400%, where a
1 m square is large enough for precise dragging and targeting.

## v0.63.1 one-metre token scale

Human-sized combat tokens now occupy less than one physical metre instead of
roughly five metres. They fit inside a 1 m square, and several can visibly
share a 5 m square. Selection brackets, target reticles, labels, condition
markers, shared-position offsets, and the player canvas use the same physical
scale. Maximum combat-map zoom increases from 1600% to 3200%, making a 1 m
square large enough for practical selection and dragging.

## v0.63.0 configurable metre grid

Personal-combat positions are now stored in metres on a one-kilometre square
battlefield. The referee can select 1 m, 5 m, or 25 m per displayed square when
starting an encounter or from the live combat toolbar. Changing scale only
changes grid spacing and token snapping: tokens stay at the same physical
coordinates, Book 1 ranges stay 1–5 / 6–50 / 51–250 / 251–500 metres, and WALK
and RUN remain 25 m and 50 m.

Both referee and player canvases publish and render the chosen scale, report
movement in metres and scale-relative squares, and keep the heavy 25 m guide.
Encounter Document schema v13 migrates v12 coordinates and movement history
from five-metre cells to metre coordinates without changing the battlefield.

## v0.62.1 live movement trail

Dragging a token now draws a local, grid-snapped movement preview on both the
referee and player canvases. One consistent dashed line is green within the
selected WALK/RUN allowance, amber exactly at its limit, and red beyond it. A
compact label reports squares, metres, and the running blow/no-attack cost.
Cancelled and rejected drags remove the preview; only accepted movement is
published to the table.

## v0.62.0 Book 1 movement procedure

Personal combat movement now follows Book 1 p.32 on the five-meter grid. A
walking Close or Open declaration moves five squares (one 25-meter range band)
and still permits an attack. Running moves ten squares, spends one combat blow,
and prohibits attacking that round. Movement destinations are calculated from
the same pre-movement snapshot, preserving simultaneous movement.

A player may also drag an owned token once per round. The drop is checked on
the player and again by the referee: WALK permits five squares and a later
attack, while RUN permits ten squares, spends a blow, and bars an attack. This
keeps the Foundry-like canvas interaction inside the Book 1 movement economy.

Close remains explicit physical contact. Opening from contact moves one full
range band and therefore ends at Medium range; merely sharing a square remains
Short. Immediate 9+ escape is available only before combat in round one. Once
combat begins, a combatant escapes by opening more than twenty bands from the
nearest enemy. The last round's walking or running path is drawn on both the
referee and published player maps.

## v0.61.0 shared Foundry-style canvas interaction

Tokens now have separate selection and targeting states. The referee can select
any token; a signed-in player can select and drag only assigned characters,
hover any visible token and press T to target it, or use the right-click token
menu. Positions and player target markers update through the published encounter
canvas. Combat activity is collapsed into compact, expandable cards.

## v0.60.3 usable tactical-map interaction

The encounter map now zooms to 1600%, with toolbar zoom steps large enough to reach token scale quickly. Compact non-scaling outlines replace the oversized browser/token focus rings. All tokens remain selectable, targetable, and draggable after an encounter reaches victory or another resolved state, allowing the referee to inspect or adjust the final battlefield. Clicking a party token selects the actor; clicking an opposing token selects the target; hovering a target and pressing `T` also works on a resolved battlefield.

## v0.60.2 five-meter tactical map

Personal combat now uses a scalable 201×201 square map at 5 meters per square, with a heavier line every five squares (25 meters). Selecting an actor draws colored Short, Medium, Long, and Very Long boundaries around that actor, so the grid itself explains range without a separate clickable band strip. The full map covers a 500-meter radius from its center.

Tokens are compact enough for up to nine combatants to occupy visible positions within one 5-meter square. Sharing a square means Short range. Close is physical contact and is stored explicitly between combatants; CLOSE and OPEN orders create or break that contact. Moving a token also breaks its existing contacts. Encounter documents advance to schema v12 and older encounters migrate to the new workspace.

## v0.60.1 selected-pair range strip

Personal combat again puts the five Book 1 range bands in sight. The strip names the selected pair (`HAWKEYE -> RAIDER`), highlights their current CLOSE, SHORT, MEDIUM, LONG or VERY LONG band, and reports the grid distance beside it. In a multi-party fight it always follows the selected actor and target rather than pretending one global range applies to everyone.

Clicking a band is an explicit referee range decision. It repositions the selected actor at that band from the selected target and records the change in encounter history and the Activity Log. The resolver still reads the pair's map positions, so the strip and grid remain two views of one state rather than competing range systems.

`[ HIDE GRID ]` leaves the range strip and combat tracker available for theatre-of-the-mind play; `[ SHOW GRID ]` restores the map. The preference persists in that browser. No document schema or Classic Traveller rules-package changes.

## v0.60.0 multiplayer acceptance and referee-side authorization

Player combat declarations are now checked twice: Firestore remains the remote security boundary, and the referee client independently verifies the declaration's account, assigned combatant, current round, action shape, target, and campaign before applying it to local authoritative state. A stale assignment or misconfigured remote rule therefore cannot make the referee drive another player's character.

Scene and declaration subscriptions now close when a scene ends and discard a late subscription that finishes connecting after the player or referee has already changed encounters. This prevents an old encounter from replacing the active listener after a reconnect.

`docs/multiplayer-acceptance-v0.60.md` supplies the repeatable three-browser acceptance pass for seating, assignment, simultaneous declarations, refusal, republishing, scene changes and reconnects. The automated suite covers the new trust-boundary checks; the browser checklist covers authentication and live subscriptions that a Node test cannot reproduce.

No schema or Classic Traveller rules-package changes.

## v0.59.1 the campaign menu stays on screen

The menu was anchored with `right: 0`, so it hung leftwards from a button that sits near the left of the masthead. That was fine while it held six short commands; the publish status, republish, scene and players controls widened it enough to run off the left edge of the window — measured at 1280×420, the popover started at `left: -104`.

It now anchors left, and is capped to the viewport so a short window scrolls it rather than clipping it. Checked at 1680×990, 1440×900, 1280×420, 1024×600 and 800×480: fully on screen at every one.

No schema or rules-package changes.

## v0.59.0 players declare, the referee resolves

The loop closes. A player picks a target and an action for the character they play; the referee's client sees it arrive and applies it as an ordinary intent, through the same `declareEncounterAction()` that a referee's click and the NPC routine already use. Nothing about resolution changes — the round still resolves on the referee's board, with the referee's dice.

**A declaration is create-only.** The rules refuse updates, so once made it cannot be revised after seeing what anyone else did — which is the simultaneity of Book 1 p.30 enforced by the database rather than by good manners. The referee clears the round's declarations once it resolves, and the next round can be declared.

**The round being declared for is published explicitly.** `round` is what has been *played*; `declaringRound` is the one in progress, and nothing once the fight is over. Reconciling those two by arithmetic was a mistake waiting to happen.

**A refused declaration does not break anything.** If a combatant has already declared, or the order is no longer legal, the referee's board is authoritative: the declaration is marked applied, a warning is logged, and play continues. Each declaration is applied once however many times the subscription fires.

**Fixed while building:** the player page kept a module-level `campaignId` that was shadowed by a parameter of the same name, so the assignment set the parameter and the module variable stayed null — declarations would have been written to a null path, and the scene failed to load at all. Both symptoms, one cause.

No schema or rules-package changes; the rules for this shipped with ruleset v11.

## v0.58.0 sign in with an email as well as Google

Firebase already had email and password enabled; the client only ever offered the Google button. That mattered more than it looked: Google will not let you invent an account, so making a test player meant registering a real Gmail address.

`[ SIGN IN ]` now opens a dialog with both — Google for people who have it, email and password for everyone else, and a toggle to create an account with a display name your referee will see. One dialog module shared by the referee client and the player page, so the two cannot drift apart.

Verified both paths against a stubbed SDK: signing in with an email, and creating an account with the name field appearing when the toggle is pressed.

No schema or rules-package changes.

## v0.57.0 the player page

`client/player.html` — the first thing a player can actually open. Sign in, paste the campaign id (or follow a link carrying `?campaign=…`), and watch the fight.

It shows the map with everyone's tokens, the player's own ringed in gold; a roster of names and visible conditions; and what happened, newest round first. The masthead says `YOU PLAY HAWKEYE`, worked out from the campaign's ownership map rather than told to it.

**It is read-only and asks for nothing it may not have.** Two documents: the published campaign, and the current scene's view. It never requests the encounter document — that one is referee-only — and never tries to list encounters, which cannot work anyway since the parent documents are deliberately absent. Tests assert all three.

**It updates by itself.** Both documents are `onSnapshot` subscriptions, so when the referee resolves a round the board and the log move without the player doing anything. Switching scenes is handled by watching `currentEncounterId` on the campaign and re-subscribing when it changes.

The signed-in name copies the account id, as in the referee client — which is how a player gets seated, and the only place they can find it.

Verified by driving the page with a realistic published payload: three combatants, one ringed as the player's own, roster conditions correct, narration grouped by round with the latest at the top.

**Still to come:** declarations. The page is a window, not yet a way to act.

No schema or rules-package changes.

## v0.56.0 narration that does not leak the arithmetic

Reading a real published scene in the browser showed the projection was leaking after all — not through the combatant records, which were clean, but through the prose:

    Hostile attacks Hawkeye at medium range: Automatic Pistol / 2D [6] [1] = 7 /
    SKILL +0 / CHAR +0 / UNTRAINED +0 / DEF +0 / SITUATION +0 / TOTAL 7 vs 11+

That `vs 11+` is the target number, which is the defender's armour; `SKILL` and `CHAR` are the attacker's characteristics. Everything carefully excluded from the combatant records was reconstructable from a few rounds of narration. My error: I reused the referee's log lines because they were "already written as narration", when they are written as an *audit trail*, which is a different thing.

Player narration is now generated from the structured result — who acted, on whom, with what, and what happened:

    Hawkeye hits Raider with Rifle and drops them.
    Raider attacks Hawkeye with Automatic Pistol and misses.

**Unrecognised entry kinds are dropped rather than passed through.** A new kind added later would otherwise publish whatever prose the referee's side happens to write; failing closed means a future change cannot leak by accident. A test asserts that an unknown kind carrying "the raider has 3 END left" never reaches the payload.

**Two other things the live data showed.** The round was reported one behind on a resolved encounter, since the narration filter subtracted a round while the fight ran and kept doing so after it ended. And the view now carries the last four rounds rather than only the latest, so a player who looks away does not lose what happened.

**The campaign names the current encounter.** A player cannot discover scenes: encounter documents are referee-only, and Firestore does not return missing parent documents from a collection query, so listing them returns empty even when the subcollection exists. `currentEncounterId` on the published campaign is how a player client will know where to look.

No schema or rules-package changes.

## v0.55.0 seating players

Nobody but the referee could read a published campaign: the rules test membership of `travellerCampaigns/{id}/players`, and nothing created those documents. `[ PLAYERS ]` in the campaign menu does now.

**Seating and assigning are two different acts.** Seating writes the player document, which is what lets that account *read* the campaign and the published scenes. Assigning them a character writes the `ownership.actors` map, which is what lets them *declare* that combatant's actions — and because the declaration rule reads that map from Firestore, assigning republishes the campaign immediately rather than waiting for the next manual publish. Removing a player reverts their characters to the referee and republishes.

**Account ids are typed by hand, and that is the awkward part.** A uid exists only once someone has signed in, so there is no way to name a player before they have. The signed-in name in the masthead is therefore clickable: it copies the account id to the clipboard, so a player can send it to their referee, with a prompt box as the fallback where the clipboard is unavailable. Invites replace this later by carrying a code the player redeems themselves.

The control only appears when the campaign is online and the referee is signed in. Opening it on a local campaign says so rather than failing obscurely.

No schema or rules-package changes.

## v0.54.0 the scene publishes itself

Publishing a scene by hand was a step to forget mid-combat, and the moment the players' view goes stale is precisely the moment a round resolves. So while the campaign is online and the referee is signed in, resolving a round — or ending the fight — publishes the player-safe view automatically. No button to remember.

**A failure never interrupts play.** The round has already resolved locally; publishing is a side effect, so it reports and carries on rather than throwing. A campaign that is local, or a referee who is signed out, publishes nothing at all and makes no network call — verified by resolving a round on a local campaign with the SDK blocked: clean console, no attempt.

`[ PUBLISH SCENE ]` stays in the campaign menu for the cases automation does not cover: a board set up before the first round is resolved, or a republish after moving tokens by hand. It now also covers a *finished* encounter, which is what caught you out — it previously required an active one, so it vanished the moment a fight ended. Once the current round has been published it reads `[ SCENE PUBLISHED ]`.

No schema or rules-package changes.

## v0.53.1 the surprise round stops throwing

`pendingNpcDeclarations()` selected every active combatant on auto that had no orders yet, without checking whether the surprise round let them act. On a round where the party surprised the opposition it declared for the surprised foes anyway, and `declareEncounterAction()` refused each one — correctly, per Book 1 p.30, but the console filled with `Hostile is surprised and cannot act this round` and those combatants lost their fallback rather than simply standing.

The routine now applies the same surprise test the resolver does. Reproduced by starting fights until one surprised a side, then resolving: clean console, and the surprised side sits the round out as the book says.

No schema or rules-package changes.

## v0.53.0 the publish controls, where you can actually reach them

Two bugs in v0.52.0, both from putting campaign-level controls inside a rail tab.

**`[ PUBLISH SCENE ]` was unreachable exactly when it was useful.** Since v0.47.0 the combat rail hides every other panel in the context column — including the NPCS tab, where the publish panel sat. So the control for publishing a scene disappeared the moment a scene existed. Publishing is campaign-level, so both controls now live in the `[ CAMPAIGN v ]` menu beside the other campaign commands, which stays reachable during combat.

**And it forgot it had published.** `publishedCampaignId` was a module variable, so a page reload lost it and the scene control hid itself again. Publication is a fact about the campaign, not about the browser session: campaign schema 10 gains `ownership.publishedAt`, and `campaignIsPublished()` reads it. The document is marked only *after* the write is acknowledged, so a failed publish leaves the campaign honestly marked local.

The status line now reads `ONLINE / 14:37:42` rather than repeating the campaign id, which the log already records when publishing.

No rules-package changes; campaign schema 10 gains one nullable field.

## v0.52.0 publishing a campaign for players to read

The first version where Traveller writes to Firestore. The local campaign stays authoritative — this publishes a copy players may read, nothing is read back, and going offline simply stops publishing.

**`[ PUBLISH ]`** writes the campaign to `travellerCampaigns/{id}`: name, time, location and the ownership map. Not the party's character documents. Publishing also records the signed-in account as the campaign's `ownerUid`, because the v11 rules check that on create.

**`[ PUBLISH SCENE ]`** writes the player-safe view of the current encounter to `encounters/{id}/view/current`. **The encounter document itself is never written.** It carries enemy characteristics, wounds, cover and blow allowances, and Firestore rules grant access per document without filtering fields — so a player who could read it would see everything the referee knows.

`src/published-view.js` builds that projection: names, sides, positions, visible condition, and the round's narration — "Hawkeye attacks Raider at medium range" — which is the same prose the activity log already carries. Each combatant is exactly seven fields, and a test asserts the serialised payload contains none of `characteristics`, `current`, `armor`, `cover`, `blowAllowance`, `weaponKey` or `skills`. That test exists so a later change cannot quietly widen what players see.

Weapons are deliberately omitted too: which gun a foe holds is something the narration reveals when it is fired, not something the roster announces.

Firestore is loaded only when the referee first publishes, so a local game never fetches it at all. Verified with the network blocked: publishing refuses with `PUBLISH FAILED / sign in before publishing`, the campaign is untouched, and everything else works as before.

**Not yet done:** nothing reads. Players cannot see the published view or write declarations — that is the next slice, and it is where the real work is.

No schema or rules-package changes.

## v0.51.0 one sign-in across Graycloak

Sign-in and nothing else. No campaign data crosses the network in this version: Traveller still keeps everything in this browser, and every version before this one behaves identically whether you sign in or not.

The client uses the same Firebase project as GCC and graycloak-adnd — `graycloaks-campaign-corner` — so one Google account covers all three, and `auth.js` follows `adnd-auth.js`: the compat SDK loaded from the CDN at runtime, popup sign-in, a listener list so the client re-renders when the account changes. The config values are public by design; security is enforced by Firestore rules rather than by hiding them.

**Being unable to sign in is a supported state, not an error.** Offline, blocked, or opened from `file://`, the masthead reads `LOCAL ONLY` and everything works exactly as before. Sign-in is also started *after* the client is usable, so a slow SDK never delays play. Verified with the SDK blocked at the network layer: campaign loads, no console errors, no behaviour changes.

Where it shows up: the account name sits in the masthead with a sign-in or sign-out control, and each row of the campaign directory gains a `ME` button that assigns that actor to the signed-in account — filling in the `ownerUid` field that v0.50.0 added and that the Firestore rules will eventually key on.

**Not yet done, deliberately:** no Firestore reads or writes, no rules changes, no player view. Those come next, tested against the emulator before anything is deployed.

No schema or rules-package changes.

## v0.50.0 the campaign directory

Every actor and vehicle in the campaign, listed in one place with the account that plays it — the groundwork for players logging into GCC and running their own characters.

**ACTORS** lists party characters and roster NPCs side by side, colour-keyed by kind. The two keep their own document types: a PC carries a career and mustering-out benefits that an NPC does not, so the directory lists them together rather than merging the schemas. **VEHICLES** lists ships — `MARISOL / SCOUT/COURIER / 100T / JUMP-2` — and is where other vehicles will go when they exist.

**Ownership uses `ownerUid`**, deliberately, because that is the field every rule in graycloak-adnd's Firestore ruleset keys on: `resource.data.ownerUid == request.auth.uid` decides who may write a character, a freehold, an entity. Naming it the same here means that when these documents move to Firestore the permission model transfers rather than being rewritten. A blank owner means the referee runs it, which covers every NPC and all of solo play.

For now ownership lives on the campaign document as `ownership: { ownerUid, actors }` — one map, covering characters, NPCs and ships alike, rather than a field added to four separate schemas. When the documents become individual Firestore records, each entry becomes an `ownerUid` field on its own document, which is the shape the rules expect.

Campaign schema 10 adds the ownership map; v9 documents migrate unowned.

## v0.49.0 NPCs that decide for themselves

Borrowed in shape from the AD&D sim's `aiDeclare()`, which returns a declaration rather than acting directly. That is the right idea, so `chooseNpcDeclaration()` does the same: it produces the intent that `declareEncounterAction()` already takes, which means an automatic combatant goes through the identical path as a referee's click or, later, a player's. No second route through the resolver.

The routine, which is **Graycloak policy and not RAW** — Book 1 p.32 says only that an NPC escapes at the referee's option, and Book 3 leaves an encountered group's behaviour to the referee entirely:

1. Rank the enemies by whether this weapon reaches them, then by the throw needed, then by distance.
2. Attack the best of them.
3. If even the best needs more than 12 on 2D — a target in cover, in darkness — close instead, because closing improves most bands and nothing is lost by waiting.
4. If nothing is reachable at all, close on the nearest.
5. Otherwise stand.

It lives in `src/npc-tactics.js`, in the client rather than in `classic-traveller-rules`, so the rules package stays a facsimile of the books.

**Two ways to use it.** Every combatant's row shows what the routine would do and why — `SUGGESTS ATTACK → HAWKEYE / medium range, needs 9+` — with one click to take it, so it works as advice for a referee running the opposition by hand. And each combatant has an AUTO toggle: opposition and roster actors default to auto, party members to manual. When the round resolves, everyone on auto declares first, and the log records what each chose and why.

Encounter schema 11 adds `tactics` to each combatant; v10 documents migrate with the party manual and everyone else auto.

## v0.48.0 brawls that tire, and a history you can read

**Endurance, blows and swings.** Book 1 p.36 limits combat blows to endurance as it stands when the encounter opens; once that allowance is spent every further blow is weakened and takes the weapon's negative DM. The package had carried a `fatigueDM` on every melee weapon and a `blows` counter since the beginning and read neither, so a bar fight ran for ever with nobody tiring.

Now `classifyBlow()` sorts each attack into the book's four classes. Combat blows spend the allowance. Weakened blows take the DM and cost nothing, and may be chosen deliberately to conserve it. Surprise blows in the surprise round and special blows against a helpless opponent are free. Gun combat is unaffected — a rifleman with endurance 2 shoots as well as one with 12. Half an hour's rest restores the allowance, which for the client is the end of the fight. A character who arrives already wounded brings a smaller allowance, because the wound reduced endurance first; wounds taken during the fight do not shrink it.

The tracker shows `BLOWS 5/7` for anyone with a melee weapon in hand, and nothing for anyone shooting.

**Long guns can parry.** p.36 lets a rifle or carbine parry as a cudgel — not a pistol. The package allowed parry only for weapons flagged `parry`, so a rifleman in a melee had no defence at all. `parryExpertise()` now returns club expertise for a long gun, the weapon's own for a blade or brawling weapon, and nothing for a pistol.

**The encounter record is structured.** It was the last ASCII `box()` record in the combat scene, and it sat in a 250px window that showed about four lines of a long fight. It is now `ENCOUNTER HISTORY`: newest round first, each line tagged with its kind, as tall as it needs to be inside a rail that already scrolls.

**Also recorded in the audit as still missing:** Book 1 p.36 weight and encumbrance, and the p.36 morale DMs, which `resolvePersonalMorale` accepts but nothing computes.

Rules package v0.21.0. Encounter schema 10 adds the allowance to each combatant; v9 documents migrate with their current endurance.

## v0.47.0 the rail is the list

A twenty-body fight needs twenty rows, so everything in the rail that was not a row had to justify itself. Three blocks could not.

**The target list is gone.** Which enemies exist and where they are is what the map is for; the red ring says which one is targeted.

**The DM panel is gone.** `HOSTILE → HAWKEYE / MEDIUM / 11+ / 3D` restated the arrow already drawn on the map, and the throw it quoted is quoted again — per target, before you commit — inside the right-click `ATTACK ▸` cascade. That is where the decision is made, so that is where the number belongs.

**The global verb row is gone.** Its buttons acted on "the selected combatant", which is the same thing as "this row"; they now sit inside the row that owns them, alongside that combatant's characteristics and sheet lines. The map's cascade does the same job at the token.

What remains is the tracker, its heading, and the resolve controls. Rows are 22px collapsed, so nine combatants occupy 374px of a 662px rail and twenty still fit without scrolling.

Encounter schema unchanged at 9. No rules-package changes.

## v0.46.0 one combatant, one row

The rail said everything twice: a permanent panel at the top described the selected combatant, and the tracker below listed the same combatant again. Now each combatant is a single row that opens.

Collapsed, a row is name, faction marker and status — or its declared orders while the fight is on. Opening it shows that combatant's characteristics and Book 1 sheet lines beneath, and selects them at the same time, so inspecting and choosing are one gesture rather than two. Rows remember whether they were open across re-renders, and several can be open at once, which was the original point of wanting multiple sheets on screen.

**The preferred pistol and blade lines only appear for the weapon actually in hand.** A combatant here carries one weapon, so listing a preferred pistol *and* blade advertised guns nobody had — an unarmed thug read `PISTOL BODY PISTOL-0 / BLADE DAGGER-0`, which is the first entry of each table at skill zero rather than anything he owns. The line is now labelled `PISTOL`, `BLADE` or `WEAPON` according to what the combatant is holding.

**START COMBAT appeared twice** — once in the action row and once beside the tracker. It now lives only with the tracker, in both of the states where it makes sense: before a fight exists, and after one has ended.

Encounter schema unchanged at 9. No rules-package changes.

## v0.45.0 selection you can see, status you can change

**The party token looked permanently selected** because `.encounter-token-pc.selected` restyled the token with a heavy cream stroke, and with one PC that class was always on. The token restyling is gone on both sides; the yellow ring added in v0.43.0 is now the only selection mark, in a stronger gold so it reads against the token.

**A downed enemy could not be brought back.** Referee conditions are annotations — the log line even says so — and never touch Book 1 wound status, so there was no way to move a combatant out of `unconscious`. `setCombatantStatus()` is that override, offered as `STATUS ▸` on the token menu. Restoring someone to active also lifts any zeroed characteristic to 1, because status is recomputed from those values and the change would otherwise be undone by the next wound.

**Starting and ending a fight are explicit.** `END COMBAT` sits beside `RESOLVE ROUND` and resolves the encounter as victory, defeat, or — with both sides still standing — avoided; once it is over, the same slot offers `START COMBAT`.

**The selected panel reads like the Book 1 character sheet:** primary skill, secondary skill, the carried weapon with its skill level and any cover or folding stock, preferred pistol and preferred blade. The tracker rows always state faction and status, with declared orders replacing the status only while a combatant is still active.

Encounter schema unchanged at 9. No rules-package changes.

## v0.44.0 surprise DMs, totalled per side

Book 1 p.31 gives eight surprise DMs. Three were being applied — leader skill, tactical skill and military service — and then only as the best single combatant's value, when the book gives the DM to the *party*. `surpriseConditionsForSide()` now derives five of the eight from the encounter itself: leader skill, tactical skill, military experience, the −1 for eight or more adventurers, and the −1 for ten or more animals. The other three describe circumstances a document cannot know, so the setup dialog asks: in a vehicle −1 per side, battle dress +2 per side, and pouncer animals +1 for the opposition.

`resolvePersonalSurprise` takes an explicit side DM when the caller has totalled one and falls back to the old best-individual reading otherwise, so nothing that called it before changes behaviour.

The round tracker shows the throw rather than only its outcome: `SURPRISE PARTY 4−1=3 / OPPOSITION 2+2=4 // NEITHER`.

**Two things recorded in the audit rather than guessed at.** The book gives +1 for "military experience" without defining it; Graycloak reads that as service in the Navy, Army, Marines or Scouts, noting that the Book 3 reaction DM names the same branches but adds a five-term requirement the surprise table does not state. And battle dress is not in the Book 1 armour list at all, so it stays a referee flag rather than becoming an eighth armour type.

Rules package v0.20.0. Encounter schema 9 records each side's conditions and flags military service on each combatant; v8 documents migrate with no conditions set.

## v0.43.0 selection and targeting on the map

**Each condition moved to where it belongs.** Lighting describes the scene, so its selector sits on the map toolbar above the map it describes. Cover belongs to a token, so it is set from that token's right-click menu; so is the folding stock. The rail's condition controls are gone — the selected panel now *reports* what a combatant carries (`LASER RIFLE / SKILL-1 / JACK / COVER −4 / ACTIVE`) rather than offering switches for it.

**Rings, not inference.** The combatant taking orders wears a yellow ring; a targeted combatant wears a pulsing red one. Both are drawn beneath the token art so the glyph stays legible.

**`T` targets the token under the pointer.** `Shift+T` adds or removes a token from the marked set instead of replacing it, so several enemies can carry the red ring at once. Marks clear when the round resolves.

**The token menu is shorter:** ATTACK ▸ with each target priced, COVER ▸, folding stock, the movement and posture verbs, condition, roster actor, remove. MOVE ▸ and SELECT are gone — the movement verbs act on the token the menu opened on, and left-click already selects.

**Fixed:** tokens carried two hover texts, a native SVG `<title>` and the styled overlay, which surfaced as a doubled tooltip. The native one is gone.

No rules, schema or rules-package changes.

## v0.42.0 a denser combat panel, and conditions that belong to something

Three problems with the rail, one of which was not a layout problem at all.

**The action verbs are chips.** Six full-width buttons took four rows; they now take two.

**The DM breakdown collapses.** The headline — `HAWKEYE → HOSTILE 1 / MEDIUM / 13+ / 5D` — is the only line that has to be visible, and it turns yellow when no 2D throw can make it. The weapon, target number and every contributing DM sit behind it, remembered open or closed across renders.

**Conditions now belong to the thing they describe.** Ticking cover, darkness and a folding stock per attack was wrong in kind, not just in size: cover protects whoever is being shot at no matter who shoots, darkness covers the whole fight, and a folding stock belongs to the firer's weapon. Encounter schema 8 puts lighting on the encounter and `cover` and `foldingStock` on each combatant; `encounterSituationDMs()` derives the DM for a given attacker–target pair, and the resolver applies it to every throw automatically. The rail shows one lighting selector for the scene, a cover selector labelled with the target's own name, and a folding-stock box for the selected combatant.

The effect is visible in the target list, which prices each candidate separately: with the scene dark and one hostile behind cover, `HOSTILE 1 / MEDIUM / 13+` sits next to `HOSTILE 2 / MEDIUM / 9+`. Under the old ticked scheme both would have read the same, because the modifier belonged to the attack rather than to the target.

Measured at 1680×990: the combat panel fits the rail without scrolling, collapsed or expanded.

Encounter schema 8 migrates v7 documents with normal lighting, no cover and no folding stock. No rules-package changes.

## v0.41.0 a combat tracker, and orders given at the token

The flow split one decision across three places: pick an actor in the rail, pick a target in the rail or on the map, then press a verb in the rail — while the map, where you are actually looking, showed only a range line. Both halves of this version put the decision where the attention is.

**The rail is now a tracker.** Top to bottom: the selected combatant with its token glyph, side and current characteristics; its action buttons; every legal target *priced* — band and the throw needed, or `NO REACH` with the reason, since `previewPersonalAttack` is dice-free and costs nothing to run against each candidate; the DM breakdown; and then the tracker itself, party first and other sides below, each row carrying a side marker and the orders that combatant is holding. The separate party and enemy rosters are gone.

**It is not a turn order.** Traveller rounds are simultaneous (Book 1 p.30), so there is nothing to sort by and no turn to advance. What the list does is show who still owes a declaration, which makes it a checklist that empties — and `[ RESOLVE ROUND ]` commits it. Declaring no longer resolves the round by itself: `declareEncounterAction` and `resolveDeclaredRound` are separate calls, so the referee can set orders for as many combatants as matter, look at the board, and then commit. Anyone left undeclared still attacks their nearest enemy, and the button says how many that is.

**Orders are given at the token.** Right-clicking opens a cascade — `ATTACK ▸` listing each legal target with its band and needed throw, `MOVE ▸` with close and open per target, then evade, escape and stand — and each leaf is one complete declaration for that token. Left-click still selects. Declared orders are drawn on the map as dashed arrows from each combatant to its target, coloured by side, so concentrated fire and a three-way fight read at a glance.

Fixed on the way: clicking a cascade closed the whole menu, because the map's pointer handler treated any press as a dismissal.

No rules, schema or rules-package changes.

## v0.40.0 a clock, named situation DMs, and a round tracker

**The campaign clock runs.** `secondsOfDay` has been on the campaign document since the beginning, validated 0–86399 and advanced by nothing: `advanceCampaignDays` takes whole days only, so a combat round was fifteen seconds of no time at all. `advanceCampaignSeconds` rolls seconds into days and days into years, each resolved round advances the clock by the Book 1 p.30 round of 15 seconds, and the masthead shows `HH:MM:SS` beside the date — with seconds, because an HH:MM clock sits still through an entire firefight. This is also what the p.34 recovery intervals need: ten minutes to recover consciousness, three hours for a serious wound, neither of which can be modelled without a sub-day clock.

**Situation DMs are ticked, not typed.** Book 1 p.31 errata gives cover −4, concealment −1, darkness −9, darkness with a light intensifier −6, and folding stock −1. They appear in the combat rail as labelled checkboxes with their page in the tooltip; the total feeds the preview and the actual throw, so `NEEDS 2D` moves from `2+` to `4+` the moment cover is ticked. The referee's MODIFIER field remains for anything the book does not name. Conditions describe one attack and clear when it resolves.

Also new in the rules package and not yet wired to the client: the p.31 terrain DM table and encounter range table (`rollEncounterRange`), and the p.31 surprise DM table (`surpriseDMTotal`). The setup dialog still asks for a starting band rather than throwing for it.

**The round tracker** replaces the bare actor/target strip above the map: round number, which side is surprised, and either who still owes a declaration or that all are in — `ROUND 1 // AWAITING HAWKEYE // ACTOR HAWKEYE // TARGET HOSTILE // RANGE MEDIUM / 8 SQ`.

Rules package v0.19.0. No schema changes.

## v0.39.0 any side may be given orders

**The referee can now direct the opposition, and a third faction is a legitimate encounter.** Declarations carry a `side`, and the resolver reads them from every side rather than the party alone. Targeting is side-relative throughout: a combatant may engage anyone not on their own side, and same-side targeting is refused. Anyone active and not given an order still attacks their nearest enemy, which is the old behaviour as a fallback rather than the only behaviour.

Encounter validation no longer restricts a side to `party` or `opposition` — any nonblank label is a side — so a militia, a rival crew, or a mutinous half of the party can be placed and will fight on its own account. A test drops a third faction between the party and the raiders and checks that it closes on the *raiders*, its nearest enemy, rather than defaulting to the party.

In the UI, shift-clicking a roster card takes the actor slot for that combatant, and the token menu offers `DECLARE FOR THIS ACTOR`. The action buttons and the DM panel follow the selected actor whichever side it is on, the card shows `ORDERED ATTACK` once declared, and the round still waits on the party before resolving. The roster covers every non-party side and names them when there is more than one.

**Two rules bugs found in Book 1 pp.31–34 and fixed:**

*Escape was thrown at 7+.* p.32 sets it at **9+** with the range DM (−1 close/short, +1 medium, +2 long, +3 very long). The DMs were right and the target was two points too generous, so escapes had been succeeding far more often than the book allows.

*An evading defender still parried.* p.33 says an evading combatant may not attack and may not use the weapon to parry or block. The package applied the evasion DM and the parry DM independently, so an evading blade fighter received both.

**Recorded as a ruling:** a RAW range band is 25 m, close and short share band 0, medium is 1–2 bands, long 3–10, very long 11–20, and beyond 20 bands is out of range. The square workspace's own square-to-band mapping does not correspond to those widths; the book permits expanding the line grid to a square grid, so the grid is RAW and the mapping is ours. The audit now says so.

Rules package v0.18.0. Encounter schema 7 migrates v6 declarations by stamping them `party`.

## v0.38.0 the character strip tells the truth about the fight

**The character stays whole during combat.** v0.37.0 collapsed the characteristics row and quick skills along with SHIP STATUS; that was the wrong half to hide, since status and wounds are exactly what a referee reads mid-fight. Only SHIP STATUS collapses now.

**Two bugs behind that, both worse than the layout.**

Combat wounds live on the encounter combatant until the fight resolves, but the header, the chips and the ad hoc characteristic roll all read the character document. Mid-fight the strip reported the state the character was in *before* the encounter — the header said READY while the party roster said UNCONSCIOUS with DEX 5/11. `encounterSelfCombatant()` and `characterCurrentValue()` now feed the health label, the chips and the roll dialog, so a wounded character cannot be offered a throw at a characteristic they no longer have.

And the wounds never left the encounter at all. `src/combatant-document-sync.js` — written, exported and tested — was imported by nothing but its own test. Every fight since it was added left the character document untouched: survive an encounter at STR 2 and the sheet still read STR 10, and a saved campaign carried the pre-combat character. `applyEncounterDocumentSync()` now runs after each resolved round, writing physical characteristics, alive and consciousness back to the party characters and the roster actors, and logging what each character carried off the field.

No rules, schema or rules-package changes; `synchronizeEncounterDocuments` is used as it was already written.

## v0.37.1 combat takes the whole rail

The combat panel is now the first section in the rail scroller, and while it is up the other rail panels — WORLD, TRADE, JOBS, NPCS and the situation record — are hidden outright rather than merely deselected. The takeover bar already said they were suspended; now they behave that way, so selecting a suspended tab cannot render Port Services above the throw the referee is reading.

The character strip and SHIP STATUS are unaffected by this: they sit above the scroller and keep the one-line form from v0.37.0, with the identity line still carrying wound status and posture. Current characteristics during a fight are on the party roster cards inside the combat panel, which covers the whole party rather than just the active character.

No rules, schema or rules-package changes.

## v0.37.0 combat takes the rail

While the COMBAT scene holds the context rail, the character strip and SHIP STATUS collapse to one line each. The identity line keeps the name, UPP, wound status, posture and credits — what you actually consult mid-firefight — and SHIP STATUS keeps its heading and the ship's name. Characteristics, quick skills and the fuel/cargo/jobs body wait until the fight is over. Measured at 1680×990: the rail's scrolling area goes from 461px to 775px, enough that a one-enemy encounter needs no scrolling at all. Both panels restore the moment you leave the COMBAT tab.

It is one class, `combat-focus`, set only when the combat rail is actually visible, so nothing changes during ordinary play.

No rules, schema or rules-package changes.

## v0.36.0 the COMBAT scene

The map is the centre scene and nothing else: a fixed toolbar with the selection strip and zoom, the workspace filling the middle, a fixed legend — the same three-part shape as the subsector scene, so COMBAT and SYSTEM feel like the same room. The tactical wrapper and the side panel that used to squeeze the rosters beside the map are gone.

**The rail carries the throw.** `COMBAT` in the context rail shows, in order: the DM panel for the selected actor and target, the action buttons, the party's round declarations, and the enemy roster. The DM panel lists the range and squares, weapon versus armour, the target number, every non-zero DM, the total, and what the 2D throw itself must show — `NEEDS 2D 7+` — plus the damage dice. When the weapon has no column for that band it says so and cites Book 1 p.46 rather than offering a throw that cannot be made.

Those numbers come from `previewPersonalAttack()` in the rules package, which computes the same throw and DMs as `rollPersonalAttack()` without dice. A test asserts the two agree field for field, so the panel cannot drift from what the resolver actually rolls.

**The band shown is the band used.** Since v0.35.0 each attack is thrown at the band between that pair, so the old `[ APPLY MAP RANGE ]` control and the "MAP SUGGESTS" wording are gone — there is no longer a referee-set band for the map to disagree with.

**Declarations are tallied, not judged.** A target with attacks declared against it carries `×2` on its token and `DECLARED ×2` on its roster card. That is the party's own information. There is deliberately no warning that a target is already down: under p.30 the round has not established that yet, and coordinating fire is table talk, not a prompt.

**COMBAT is selectable without a live encounter**, so `START COMBAT` is reachable from the scene; a live encounter still pulls the scene to COMBAT, but leaving it is now the referee's own choice. Opening an encounter frames the combatants instead of the whole 32×20 workspace, which at 100% left the tokens as specks.

Rules package v0.17.0. No schema changes.

## v0.35.0 wounds at the end of the round; range per pair

**Book 1 p.30, step 2C: "If attack succeeds, determine wounds inflicted at end of the round."** The round resolver honoured that on the opposition side — foes attacked from a pre-round snapshot, so a foe cut down still shot back — but not on the party side, where attacks resolved against live state. Two characters declaring against the same enemy would fail with `defender is not active` if the first shot dropped him, which under 2C is information the characters do not have yet.

The resolver is now one shape for both sides. Step 2A movement and posture resolve first; every attack in step 2B is thrown against the snapshot taken after movement; wounds apply in step 2C, after the last attack, in declaration order so that first blood falls on the first wound a combatant takes. Surprise is unchanged and orthogonal: it decides *who may act*, not when damage lands.

`rollPersonalAttack` in the rules package now does the throw and the damage dice without touching the defender; `resolvePersonalAttack` is a thin wrapper over it plus `applyPersonalDamage`, so single exchanges outside a round structure behave exactly as before.

**Each attack is thrown at the band between that attacker and that target**, computed from post-movement map positions rather than one encounter-wide band. `close` and `open` move the token and the band follows from the new position. `encounter.range` remains on the document as the scene band for placement and display, and now reports the closest opposing pair. Schema 6 migrates v5 documents and marks the map `graycloak-band-guide-v2`, so a stored encounter records which range policy resolved it.

`declaredTargetCounts()` reports how many party attacks are aimed at each target this round. Declarations are the party's own information, so showing this reveals nothing the characters would not know — unlike a warning that a target is already down, which the round has not yet established.

**Fixed on the way past:** `quickSlotStore` was declared with `let` some 245 lines after the block that assigns it, so the assignment ran while the binding was still in the temporal dead zone and threw `Cannot access 'quickSlotStore' before initialization` on every load. The surrounding `try/catch` swallowed it, leaving the store null — quick slots fell back to defaults and never persisted. The declaration now sits with `registry` and `playerSessionStore`, and a test asserts the ordering.

Rules package v0.16.0. Encounter schema 6. No other document schemas change.

## v0.34.0 the rail border stops cutting into the tab bodies

The WORLD, TRADE and JOBS panels looked clipped on the right: every value ran hard against a vertical line, and the BERTHING attention box lost its right border into it. Nothing was clipped. The v0.25.0 rule `.context-panel { border-right: 1px solid var(--rule) }` was written for the rail, but `.context-panel` is also the class on the five tab sections inside `.context-scroll`, so each of them drew its own right border at the content edge, ten pixels inside the real rail border. Found at 4× zoom; invisible at 1×, exactly the kind of thing a stylesheet grep does not show.

The rule is retargeted to `#context-panel`, and `.context-scroll > .context-panel { border-right: 0 }` guards the tab bodies. A test asserts no bare `.context-panel` border rule remains.

No Classic Traveller rules and no persistent document schemas change.

## v0.33.0 chargen gets its columns back; the LOG header is one row

**Character generation was drawing the empty context rail over the Book 1 tables and the sheet under the command rail.** Both latent since v0.31.0. `.chargen-mode .context { display: none }` had been losing to `#context-panel { display: flex }` on specificity, so the (empty) context rail — `position: sticky`, hence painted above — covered `BOOK 1 TABLES`. And the v0.30.0 `.chargen-mode .stage > .scene { grid-column: 2 / 4 }` span, present twice, ran the sheet into the rail's column. The context rail now hides by id in chargen, the sheet keeps to column 2, and the spans are deleted.

**The LOG header is `LOG · SHOW · ORDER · [ NOTE ] [ CLEAR ]` on a single row.** The campaign-name line beneath it is gone (the masthead already names the campaign) and the SHOW/ORDER text labels are gone with it; the selects carry `aria-label`s and the order options read `NEWEST` / `OLDEST`. Three rows of header become one, giving the feed the height back.

No Classic Traveller rules and no persistent document schemas change.

## v0.32.0 the legend is on screen, and WHAT NOW? scrolls

The centre column clipping that survived v0.25.0 through v0.31.0 was never a height problem. Measured in the running app, `.canvas` was 708px tall and `#subsector-section` was 708px tall — but the section began 12px below the top of the canvas. A global `section { margin-top: 16px }` from the original stacked-page layout, and a `.campaign-play #subsector-section { margin-top: 12px }` rule from the same era, sat on top of a `height: 100%` box. Every version made the box the right size; the margin then pushed its last 12px — the legend — out through the bottom of an `overflow: hidden` parent, where the page's own `overflow: hidden` made it unreachable.

`.stage > .scene > .canvas > section { margin-top: 0 }` removes the margin for every section the scene hosts, and the stacked-era `.campaign-play` margin rule is deleted rather than overridden. The CHARACTER view gets its last 12px back too (its sheet scroller was short by the same amount), and the COMBAT view its last 16px.

**WHAT NOW? finally scrolls.** Every `.command-rail > .procedure-section` rule from v0.25.0 to v0.31.0 — six of them — matched nothing: the element is `<section id="procedure-section" class="panel whatnow">` and has never had a `.procedure-section` class. So the panel never received `overflow-y: auto`; with a long procedure list its cards ran underneath the LOG and the rail's `overflow: hidden` clipped them, which reads as the log having no bound. The log itself was always bounded (3fr track, feed scrolling). The v0.31.0 rule now targets `#procedure-section`; the five dead predecessors are deleted, and a test asserts no rule addresses the phantom class.

Verified headlessly at 1400×640, 1366×768, 1600×900 and 1920×1080: the legend's bottom edge sits 1px inside the canvas at every size, and the character sheet scrolls internally to its true end. With 300 log entries and 20 extra WHAT NOW? cards injected, the rail stays at viewport height, both rail panels scroll, and the centre column does not move.

No Classic Traveller rules and no persistent document schemas change.

## v0.31.0 the terminal is the viewport

Every version since v0.25.0 derived the available height from `100vh` and then depended on each intermediate box cooperating — terminal padding, masthead borders, grid gaps, flex floors. Any one of them being off by a few pixels put the bottom of the stage below the fold, and because the page is `overflow: hidden` the clipped content was unreachable rather than merely scrolled past.

`.terminal` is now `position: fixed; inset: 0`, so it *is* the viewport box by definition. No arithmetic to drift, and no descendant can make the page taller than the screen. The width comes from horizontal padding rather than a centred `max-width`.

**WHAT NOW? and the log split the rail 2fr / 3fr**, each with its own scroller. The previous flex arrangement let the log's content basis dominate; explicit grid tracks cannot. WHAT NOW? now scrolls internally when the procedure list is long instead of squeezing the log or overflowing.

**The context rail has exactly one scrolling region.** Character, SHIP STATUS and the tab strip are `flex: 0 0 auto` heads; the tab body is the only thing that scrolls, so WORLD's content is no longer clipped by a parent that had run out of room. SHIP STATUS keeps a `30vh` cap with its own scroller for long manifests.

**The campaign date moved to the masthead**, labelled `DATE`, showing the day, the campaign week, and the days remaining to the nearest active contract deadline. It is no longer duplicated in the CURRENT PORT meta line, which returns to describing the world.

No Classic Traveller rules and no persistent document schemas change.

## v0.30.0 character joins the rail; the stage is one row

The character strip moves into the context rail, above SHIP STATUS: identity on one line, characteristics on the next, quick skills below. The `CHARACTER` label is dropped — it is obvious whose sheet you are looking at. The rail widens from 390px to 440px so the characteristics fit on a single line and the skills take two, with the width coming from the map, which has been over-served since v0.18.

**This removes a class of bug rather than another instance of one.** The stage was two rows solely to carry a full-width character strip, which forced the command rail to span `grid-row: 1 / 3` to sit level with the masthead. A spanning item contributes its min-content height to an `auto` row, so the rail's procedure cards and log kept sizing row 1 and pushing the grid past `100vh`. That is what cut off the bottom of the UI in v0.25.0 through v0.29.0, and what collapsed WHAT NOW? in v0.28.0. With character in the rail there is one row, no spanning item, and nothing whose content can size a track.

The grouping is also more honest: character and ship are what you brought, and the WORLD/TRADE/JOBS/NPCS tabs beneath them are where you are.

**Dead layout rules are gone.** The superseded `.stage` placements — two `grid-row: 1 / 3` rules, the `grid-column: 1 / 3` strip placements and the `order` declarations — are deleted, along with all nine `.center-stack` rules for a wrapper removed in v0.27.0. Among them were `.center-stack .context-scroll { max-height: min(42vh, 480px) }` and the `context-focused` canvas clamp, both of which could still have won a specificity contest against current rules. A test now asserts `grid-row: 1 / 3` appears nowhere in the stylesheet.

No Classic Traveller rules and no persistent document schemas change.

## v0.29.0 an explicit height chain

v0.28.0 fixed the wrong half of the problem. Capping `.procedure-section` by flex made WHAT NOW? collapse to a sliver, because flex shrink is weighted by content basis and the log's basis is enormous — the two sections could not share the rail fairly on `flex: 1 1 auto` alone. And the bottom of the UI still fell off, because the chain from `100vh` down to the map depended on rules accumulated across five layout eras, each of which had to cooperate.

**The terminal now owns the viewport height directly.** It is a three-row grid — masthead, chargen utility nav, stage — with `minmax(0, 1fr)` on the stage row, `box-sizing: border-box`, and `overflow: hidden`. Every child is placed by an explicit `grid-row`, so nothing auto-places into an implicit fourth row and grows the page.

**Every level below it states its own constraint.** `.stage > *` gets `min-height: 0`; the three columns get `height: 100%; max-height: 100%; overflow: hidden`; the canvas, the subsector section and the map each get an explicit floor of zero. None of this relies on an earlier rule still applying.

**WHAT NOW? gets a definite share.** It is capped at `44vh` — a viewport unit, not a percentage of a parent whose height derives from its own content, which is the circularity that broke v0.28.0 — with `flex: 0 1 auto`. The log takes `flex: 1 1 0%` with a 120px floor, so it absorbs the remainder without crowding out the procedure cards. SHIP STATUS is capped the same way at `34vh`.

Below 1300px the terminal reverts to a flex column and every cap is released, so the page scrolls normally on narrow screens.

No Classic Traveller rules and no persistent document schemas change.

## v0.28.0 the bottom of the UI, and a reworked character strip

**The stage no longer overflows the viewport.** `.command-rail` spans `grid-row: 1 / 3` while row 1 is `auto`, so the rail's min-content height — every WHAT NOW? card plus the log — grew row 1 past the character strip and pushed the grid beyond `100vh`, cutting off the bottom at any window size. `.procedure-section` made it unrecoverable: its `max-height: 58%` was a percentage of a parent whose height derived from that same content, so it never resolved to a cap. WHAT NOW? and the log now share the rail by `flex: 1 1 auto` with `min-height: 0`, and the rail is explicitly `min-height: 0; overflow: hidden`.

**The character strip is down to what changes.** `SCOUTS` and `AGE 38` are gone from the row and now live in the UPP's title text, together with a note that the UPP is the profile as originally generated — it does not track wounds, and players who never learn to read it lose nothing. The `ROLL` and `SKILLS` labels are gone; the chips are self-evident. The UPP is larger and bold, since it is the string most often consulted.

**Wounds are visible in three places at once.** STR, DEX and END chips already carried current values; a wounded chip now reads `END 3/5` with the amber attention fill, so the loss is legible without arithmetic. The status word takes the same amber for `WOUNDED` and the failure red for `UNCONSCIOUS` and `DEAD`, and stays plain for `READY` so the colour keeps its meaning.

**Posture is a second, read-only field.** Health and posture are separate axes — a character can be wounded and evading at once — so posture gets its own slot, shown only while an encounter is active at the current system. It surfaces `EVADING`, which `personal-combat.js` has always tracked and applied (Book 1 p.32: −1 at close or short range, −2 beyond), and the melee `BLOWS` count, which is capped against endurance. Neither was previously visible anywhere in the UI. It displays state and does not declare it; declaring evasion stays in the combat actions.

**The campaign date is back.** It was lost when v0.24.0 deleted the CURRENT LOCATION header cell, leaving the day visible only on log entries after the fact. It now leads the CURRENT PORT meta line, followed by the days remaining to the nearest active contract deadline when there is one — the figure you would otherwise compute by hand before deciding to skim a gas giant or take a job.

No Classic Traveller rules and no persistent document schemas change.

## v0.27.0 correct rail placement, no .center-stack, SHIP STATUS on top

v0.26.0's layout failed for one reason: `.context-panel` is the class on the five panels *inside* the rail — PORT SERVICES, COMMERCE, CONTRACT BOARD, SITUATION, ROSTER — while the rail itself is `<aside id="context-panel" class="context">`. The v0.25.0 rule `.context-panel, .command-rail, .scene { height: 100%; overflow: hidden }` therefore gave every inner panel full height inside a column that had none, and gave the column nothing. The panels self-clipped, SHIP STATUS became unreachable, and the rail — never placed by `.stage > .context-panel`, which matched nothing — auto-flowed into row 1 on top of the character strip.

Placement is by id from here on: `.stage > #context-panel`, `.stage > .scene`, `.stage > .command-rail`, `.stage > .campaign-header-strip`. A companion rule resets `.context-panel` to `height: auto; overflow: visible`, so the inner panels size to their content and the rail is the only scroller.

**`.center-stack` is gone.** The wrapper was a pre-v0.20 leftover that forced `display: contents` and carried two rules that were quietly capping the rail: `.center-stack .context-scroll { max-height: min(42vh, 480px) }` and a `context-focused` clamp on the canvas. Scene, context rail, and chargen tables are now direct grid children of `.stage`, so placement no longer has to survive a `display: contents` hop.

**SHIP STATUS moved to the top of the rail**, above the WORLD/TRADE/JOBS/NPCS tabs, where it is persistent rather than scrolling away beneath whichever tab is open. It carries more than the scene strip did — `JUMP NEED` against the selected destination with any shortage, the cargo and passenger manifests line by line, and active jobs with their routes, each row clicking through to the relevant tab. It is capped at 40% of the rail with its own scroller so a long manifest cannot crowd out the tabs.

The scene strip's SHIP cell is reduced to the ship name and type as the link into the register, since its summary numbers were a thinner copy of what SHIP STATUS now shows permanently. The selected context tab gets the `--tab-selected` fill, scoped under `#context-panel` so it outranks the older rule at equal specificity, and the ship link drops its link colour to match the port name beside it.

No Classic Traveller rules and no persistent document schemas change.

## v0.26.0 one-row character strip, masthead-level dock, and a bounded log

**The character is one row.** The three-row identity strip is replaced by a single flex row: `CHARACTER`, the name, the UPP/career/age/status/credits line, the six characteristics, the quick skill slots, and `[ ALL SKILLS ]`. Nothing is removed — the previous layout stacked three rows that each used well under half the available width, so at full width it all fits on one line and wraps only when the window narrows. Two rows recovered.

**WHAT NOW? starts level with the masthead.** The character strip moved inside the stage and spans the left and centre columns only; the command rail spans both grid rows in column three. So the dock begins where the masthead ends, beside `[ NEW CHARACTER ]` and `[ HIDE LOG ]`, instead of below the character block.

**Selected tabs carry a colour.** `--tab-selected` gives the active scene tab and context tab a green-grey fill and a matching underline, rather than distinguishing them from the rest by lightness alone. The COMBAT tab keeps its amber attention fill, which now overrides the selected colour when an encounter is live.

**The current port is highlighted.** The port name in the status strip gets the same fill and a border, so the world you are standing in reads before the destination you have not chosen yet.

**The log is bounded again.** v0.25.0's viewport-height stage was defeated by an earlier rule — `.command-rail .activity-panel` carried a fixed `height: min(520px, calc(100vh - 260px))` with `min-height: 300px`, which outranked the flex sizing and let the rail exceed the viewport, so the page grew and the bottom of the UI became unreachable. The panel is now `height: auto; max-height: none` and flexes, `html, body` are pinned to `100%` with overflow hidden, and `.activity-feed` is the single scroller inside the log. WHAT NOW? is capped at 58% of the rail so the log always keeps a share.

Below 1300px all of this reverts to a single stacked column that scrolls normally. No Classic Traveller rules and no persistent document schemas change.

## v0.25.0 tabbed centre scene and a viewport-height stage

The centre column is no longer a permanent map. It is a scene with three tabs — CHARACTER, SYSTEM, COMBAT — and the map is one scene among them rather than the default that everything else opens over.

CHARACTER holds the character sheet, which had been a `sheet-view` absolutely positioned inside `.canvas` and therefore confined to the map's box. It now gets the full centre column, so the v0.20.1 compaction that was fighting a 560px container is no longer load-bearing. COMBAT holds the encounter record and is disabled unless an encounter is active at the current system; starting or ending one switches to and from it automatically, replacing the `encounter-workspace-active` class that used to hide the map in place.

SYSTEM holds the map, and the `SCENE / SUBSECTOR NAVIGATION` label row is gone — the map identifies itself. Zoom, subsector name, and jump rating moved onto a thin tool row above the map; the legend moved beneath it. In their place is a three-cell status strip: CURRENT PORT, SELECTED DESTINATION (with the jump actions and `[ DETAILS ]`), and SHIP. The ship name opens the register, as it did before v0.24.0 removed the header cell.

The stage is now `100vh` with three full-height columns. The WORLD/TRADE/JOBS/NPCS rail and the WHAT NOW?/LOG dock reach the bottom of the viewport and scroll internally, so the map no longer dictates page height and WHAT NOW? sits directly under the header. Below 1300px the stage falls back to a single stacked column that scrolls normally.

Ship, campaign, and threads remain documents that open over the scene. The ship register gains a `[ SHIP REGISTER ]` entry in the Campaign menu alongside the existing campaign and threads entries, so all three are reachable without a header cell.

COMBAT currently shows the existing encounter record. The combat scene proper — range bands, per-pair range, the DM panel, and wounds applied at round end — is deliberately left to its own milestone. No Classic Traveller rules and no persistent document schemas change.

## v0.24.0 one scroller, a character-only header, and trade actions in their cards

Three changes prompted by the v0.23.0 screenshot.

**One scroller per column.** `.operations-panel-record` was `flex: 1 1 auto; overflow-y: auto` inside a fixed-height section, giving the context column a scroller inside a scroller. The box records needed it because they were unboundedly tall; the structured panels are not, so the record now sizes to its content and the column scrolls once. SHIP STATUS is reachable again without scrolling past PORT SERVICES.

**The header keeps only the character.** With the WORLD panel structured, Orison's name, hex, UWP, and bases appeared in the header cell, the scene footer, and the WORLD panel; fuel, hold, and the account appeared in both the header cell and WORLD. The CURRENT LOCATION and SHIP cells are removed. The scene footer keeps CURRENT PORT because it is paired with SELECTED DESTINATION and the jump action, and the WORLD panel keeps the fuller record because it sits with the actions that change it. The identity strip is now a single full-width cell: name, UPP/career/age/status/credits, the six characteristics, and the quick skill slots.

The header task button is removed with them. It had grown to a full sentence — a thread title, its objective, and a job count — and was duplicating the WHAT NOW? dock. The active thread objective is now a `THREAD` card in OPPORTUNITIES that opens the thread record, so nothing is lost and the copy sits where procedure copy belongs.

**TRADE actions move into their cards.** Freight lots carry `[ ACCEPT ]`, the weekly speculative lot carries a single `[ BUY nt / Cr… ]` sized to whichever is smaller, the free hold or the operating account, with the binding constraint named beneath it. Resale lots carry `[ SELL ]` and `[ DECLINE ]`. Passenger booking keeps the action bar because high/middle/low are route actions rather than per-card ones, and the broker DM control stays there with them.

`[ DECLINE ]` closes the gap the September facsimile audit recorded: `payDeclinedBrokerFee()` existed in the rules package but the client never called it. Declining a quote after engaging a broker now charges the commission to the ship ledger as Book 2 p.48 requires, and declining with no broker engaged charges nothing.

No Classic Traveller rules and no persistent document schemas change; the broker fee was already implemented and tested in the rules package.

## v0.23.0 structured WORLD, TRADE, and JOBS panels

v0.23.0 retires the fixed-width `box()` records from the context column. At 390px those 96- and 106-character boxes were wrapped by `overflow-wrap: anywhere`, breaking the rules and gutters across lines and mangling the panels a player reads most during a port call.

`ui-model.js` gains `panelRow()`, `panelCard()`, `buildPortServicesPanel()`, and `buildContractBoardPanel()`, which return plain view models rather than text; `app.js` renders them through one `renderPanelModel()`. Values right-align on a `minmax(7ch, 11ch)` label column so figures scan vertically, and attention state is a badge on the value rather than a highlighted whole line. TRADE builds its model where its data already lives, in `renderCommerce()`.

JOBS offers are now cards carrying their own `[ ACCEPT ]`. A blocked offer stays visible as `[ BLOCKED ]` with its reason in place — an active exclusive charter, a manifest that must be empty (Book 2 p.9), or insufficient free hold — instead of a disabled entry in an action bar detached from the offer it belongs to. The map-selection disclaimer survives as a group note.

`box()` is unchanged and still used for the chargen sheet, system record, situation record, encounter record, and jump plan, where the width is available and the boxed form reads correctly. The Book 2 fuel, berthing, cargo-before-passengers, and broker rules are untouched; no rules and no persistent document schemas change.

Tests: `test/client-model.test.mjs` ports the port-services and job-board assertions onto the panel models, and `test/static-client.test.mjs` pins the renderer, the retained `box()` callers, and the terminal styling constraint.

## v0.22.0 two-row campaign header and quick skill slots

v0.22.0 recovers two vertical rows above the stage without removing information. The masthead is now a single row: the campaign name sits immediately after `[ CAMPAIGN v ]`, followed by the autosave indicator and the transient status line, with `[ NEW CHARACTER ]` and `[ HIDE LOG ]` pushed right. The separate campaign-identity/status sub-row is gone, and so is the full-width roll bar beneath the identity strip.

Current Location and Ship remain their own cells. Each keeps its kicker, name, and metadata, and each gives up horizontal width to the Character cell in exchange for a second metadata line: Location now carries hex, UWP, date, and bases; Ship carries jump, fuel, and hold on one line and `STATEROOMS occupied/total`, passengers, and the operating account on the next. The v0.19.0 stateroom wording is unchanged.

The Character cell absorbs the old roll bar. Its headline row holds the name and UPP/career/age/status/credits; below it sit the six clickable characteristics and then the quick skills, `[ ALL SKILLS ]`, and the current task.

Quick skills are now chosen rather than inferred. `QUICK_SKILL_PRIORITY` is replaced by `client/quick-slots.js`, which resolves up to six slots per character. Slots are stored in the browser keyed by Character Document id, so they are a local view preference in the sense established by v0.21.0's player sessions; no Character Document, Campaign Document, or bundle schema changes. A character with no stored slots falls back to the previous priority order, so existing characters look exactly as they did. `[ ALL SKILLS ]` or an empty `+ SLOT` chip opens a picker; skills the character no longer has drop out of stored slots on read. When the active situation calls for a skill that is not slotted, that skill still appears as a temporary dotted chip so a check never becomes unreachable.

Tests in `test/quick-slots.test.mjs` cover default order, normalization, per-character isolation, skill removal, and storage failure. `test/static-client.test.mjs` pins the two-row masthead, the absence of the sub-row and roll bar, the cell contents, and the picker dialog. This is a UI-only milestone: no Classic Traveller rules and no persistent document schemas change.

## v0.21.0 multiplayer-readiness foundation

v0.21.0 introduces the architectural boundary needed before live simultaneous play. Player sessions now distinguish solo, player, referee, and spectator roles; record controlled characters; and keep each client's viewed character outside shared Campaign Document state. The Campaign record selector is therefore labeled Viewed Character and no longer rewrites the campaign when a local player changes sheets.

Activity Log Document v2 adds public, addressed-player, and referee-only visibility with automatic migration of v1 entries to public. A revisioned campaign-state store and transport-agnostic command service add stale-write rejection, command idempotency, actor authorization hooks, normalized player choices, and subscriptions. Two-client tests exercise simultaneous reads, a rejected stale mutation, a successful retry, private-log projections, and role/ownership restrictions. This is a tested multiplayer foundation, not yet a live Firestore connection; see `docs/multiplayer-foundation.md` for the boundary and remaining work.

## v0.20.1 compact personnel sheet

v0.20.1 reduces the vertical footprint of the shared character-generation and playable personnel form without shrinking its type or removing rules information. Banner, identity, section, characteristic, skill, and status spacing are tightened; benefits and finances now render as a two-column labeled grid; Psionics is a single compact row; and Notes starts at two lines but expands on focus. Service history and equipment remain side by side, while the full generation history stays collapsed until requested.

## v0.20.0 campaign entry workflow and command-centered play shell

v0.20.0 closes the gap between character generation and campaign play. A completed character now receives prominent `[ START NEW CAMPAIGN ]` and, when browser storage contains one, `[ ADD TO ... ]` actions alongside export. Starting a new character from an active campaign saves and remembers that campaign, then offers `[ ADD TO ... AND RETURN ]` when generation finishes. The Campaign menu adds `[ ADD CHARACTER ]`, which imports a completed Character Document into the loaded party without unloading the campaign or silently replacing the controlled character.

Campaign Document v9 adds `activeCharacterId`, validated as a member of the party and migrated deterministically from the first party member in v1-v8 documents. The Campaign record has an explicit Active Character selector. Imported party members remain inactive until selected; characters generated from the active campaign become active when they return.

The desktop shell is reorganized around the play loop: a wider 390px left rail contains WORLD, TRADE, JOBS, and NPCS (or Book 1 tables during chargen); the center remains the map, combat scene, or character sheet; and a 340px right rail stacks WHAT NOW? directly above the persistent Log. Current Port and Selected Destination now form a route strip above the subsector map. The former context-focus control is removed because the operations panel no longer competes vertically with the map. Responsive layouts retain two-column and single-column fallbacks.

## v0.19.1 mustering-result highlights and noble titles

v0.19.1 highlights the resolved die/result cells in the Book 1 Benefits or Cash table after every mustering-out roll, including modified totals. It also displays the character's civilian hereditary noble-title entitlement separately from military rank on the in-progress sheet, playable sheet, and text records. The title options are derived from Social Standing through the rules package's source-backed Book 1 p.6 table, so no duplicate title state can become stale if SOC changes. SOC above F remains noble-eligible but is explicitly left to referee determination because Book 1 names no title above Duke/Duchess.

## v0.19.0 three-column play shell and persistent journal controls

v0.19.0 completes the agreed desktop information architecture without changing Classic Traveller rules or persistent campaign schemas. The left dock now owns WHAT NOW? and the actual phase-appropriate Book 1 character-generation tables. The center owns the persistent map or character/combat scene with WORLD, TRADE, JOBS, and NPCS immediately beneath it. The campaign Activity Log moves to the right rail, defaults to newest-first, and persists both its order and visible/hidden preference in the browser. At narrower widths the journal drops beneath the center workspace, and the whole stage becomes single-column on small screens.

The center context has a `[ FOCUS ]` control that temporarily reduces the map height so tall trade or roster content can be inspected without trapping it in a short scroller. Situation and personal-combat takeovers return the map to full height automatically. The Campaign commands are consolidated under one menu, while `[ NEW CHARACTER ]` remains a separate mode-changing action. The header now reports truthful browser autosave state rather than presenting five equally prominent file buttons.

The ship identity strip replaces the ambiguous passenger-capacity abbreviation with explicit `STATEROOMS occupied/total`, `PASSENGERS`, and `HOLD used/total` values. Crew occupancy is included in the stateroom count. The in-progress v0.18.1 character-generation sheet work supplied in the local source is preserved: chargen uses the Book 1 form as its scene, highlights newly gained and pending skills, and places each legal skill roll on its governing table.

Tests in `test/static-client.test.mjs` pin the three-column DOM order, Campaign menu, autosave indicator, persistent log-order selector, context focus control, and ship-occupancy wording. All existing rules, persistence, trade, travel, situation, roster, and combat tests remain unchanged.

## v0.18.0 play layout: identity strip, WHAT NOW? dock, persistent scene, context panel

v0.18.0 rebuilds the client shell around the mockups agreed in September 2026. The campaign header becomes a three-cell identity strip (character, current location, ship) over a roll bar of clickable characteristics and quick skills with the TASK line at the right; the character and ship names open their sheets. Below it the page is a three-column stage: a left dock holding WHAT NOW? over the activity log, a center scene that is always the subsector map (or the personal-combat workspace while an encounter is active), and a right context panel with four places, WORLD, TRADE, JOBS, and NPCS. Situations and combat are not tabs; they take the context panel over with a yellow bar that returns to WORLD when clicked. The v0.17 workspace tab strip and the NAV/SITUATION/COMBAT operations tabs are removed. CHARACTER, SHIP, CAMPAIGN, and THREADS open as overlays over the map (Escape or [ CLOSE ] returns). A two-cell footer under the scene shows the current port and the selected destination with the JUMP button and [ DETAILS ].

WHAT NOW? in play is driven by `buildPlayProcedure()` in `ui-model.js`, a pure function over a state snapshot that returns grouped cards tagged REQUIRED / READY / BLOCKED / OPTIONAL / DONE with a one-line reason and the context tab to open. It encodes the Book 2 port-call order: berthing first, fuel for the selected jump, cargo announces the destination, passengers are blocked until cargo is accepted (p.8), one speculative lot per week (p.46), patron search once per port call (Book 3 p.25), life support charged at departure (p.7). The Done group collapses by default. Tests in `test/play-procedure.test.mjs`.

Character generation uses the same frame: WHAT NOW? shows the chargen procedure and its legal actions, the scene is the Book 1 character sheet filling in from the first roll (`renderChargenSheet()` drives the same form the playable sheet uses; the new skill is highlighted and pending rolls are shown as a dashed chip), and the context panel shows the Book 1 tables that apply to the current phase: Prior Service for the chosen service with the current throw highlighted; the four Acquired Skills tables for that service, each with its own [ ROLL 1D HERE ] button so the die is rolled where the result appears, the rolled cell (not the row) highlighted, and EDU 8+ locked when unavailable; Mustering Out benefits and cash; Aging. The separate Service History / Generation Log pane is gone: the activity log already records every chargen event, and Service History lives on the sheet.

Not in this slice: the range-band combat scene (the v0.16 token map remains inside the scene), the Finance-first ship register tabs, and the broker-decline action in TRADE. No rules or persistent document schema changes.

## v0.17.1 rules audit alignment

v0.17.1 carries the client onto `@graycloak/classic-traveller-rules` v0.14.0 after the facsimile audit (`AUDIT-2026-09-facsimile.md`). The patron port-call text now states the Book 3 p.25 rule correctly (a 5 or 6 finds a patron), and the port-operations, encounter, and situation tests were re-pinned to the corrected fuel consumption (20t per Type S Jump-1 including the two-week power-plant share), the range-scaled evasion DM, and the corrected patron availability. No client UI changes.

## v0.17.0 single-select campaign workspace

v0.17.0 replaces the campaign header's detail toggles with one single-select workspace tab strip: `PLAY`, `CHARACTER`, `SHIP`, `CAMPAIGN`, and `THREADS`. The former `[ CHARACTER ]`, `[ SHIP ]`, `[ CAMPAIGN ]`, `[ THREADS ]`, and `[ CHARGEN RECORD ]` links were independent accordion panels that inserted above or below the navigation workspace, so opening a record pushed the subsector map off screen and several records could stack at once. Exactly one workspace is now visible beneath the sticky campaign header; `PLAY` holds the existing Operations Desk and subsector map unchanged, and the Operations Desk tabs become the sub-tabs of that workspace. Clicking the header character name opens the `CHARACTER` sheet, a thread task opens `THREADS`, and situation, combat, and contract tasks return to `PLAY` before selecting their Operations Desk tab. The `SHIP` tab is disabled until a ship is assigned.

`[ CHARGEN RECORD ]` is removed from campaign play because the playable sheet already carries Service and Generation History in its collapsed section; chargen itself still shows Service History and Generation Log beside the Personnel Record. The System Record now expands in place beneath the selected-system summary strip via `[ DETAILS ]` instead of being appended after the map. Operations Desk tabs drop their bracket decoration, `ENCOUNTER` is labelled `COMBAT` and `ROSTER` is labelled `NPCS`, and attention is shown with the existing highlight plus a heavy left rule rather than an appended `!` that truncated in narrow columns. The campaign file row also gains `[ NEW CHARACTER ]`, restoring a route from campaign play back to character generation; since v0.15.2 the chargen commands had been hidden during play with no replacement. It confirms before discarding unsaved campaign state. This is a UI-only milestone: no Classic Traveller rules and no persistent document schemas change.

## v0.16.1 playable character sheet and persistent health foundation

v0.16.1 gives completed campaign characters a dedicated playable sheet inspired by the boxed Personal Data and History form in the Classic Traveller facsimile. The screen preserves the application's light paper, heavy black rule, and compact administrative-record style while reorganizing the printed form for interactive play. Clicking the campaign character name or `[ CHARACTER ]` opens current identity, original and current characteristics, service record, clickable skills, explicit ready weapon and worn armor, benefits, assigned ship, confidential psionics placeholder, collapsed generation history, and persistent notes. Chargen retains its existing Personnel Record and does not reappear at the bottom of campaign play.

Character Document v3 adds separate current STR/DEX/END values, consciousness, and an explicit personal-combat loadout. Existing v1/v2 documents migrate with undamaged current characteristics, a conscious living state, no armor, and the same deterministic preferred-weapon selection previously used by the client. Characteristic checks use current physical values while INT, EDU, SOC, and the original UPP remain unchanged. New encounters use the sheet's selected weapon and armor. This milestone establishes the persistence and interface required for combat aftermath, but combat wounds are not yet synchronized back to Character Documents; that remains the next bounded slice.

## v0.16.0 roster-driven encounters and conditions

v0.16.0 connects the persistent actor roster to the live encounter workspace. Right-click an empty map square to place an unused roster NPC, robot, or creature as opposition or a party ally; surprise is not rerolled and the authoritative Book 1 range is unchanged. Right-click tokens to select, target, inspect, apply or remove a body-aware referee condition, or remove the participant while retaining its roster record. Biological actors use stunned/unconscious/dead vocabulary; robots use disrupted/powered-down/disabled/destroyed vocabulary; hybrid actors can use either set. Conditions persist in both encounters and linked roster actors but remain explicit annotations rather than inventing automatic rules effects.

Enemy tokens now use actor-type shapes and short labels, active actor/target and range-mismatch text are more explicit, token hover text includes actor/body type and conditions, and the collapsible roster shows those conditions. Manual encounter setup may optionally record a referee-defined meters-per-square scale; otherwise the display says scale unset. Movement logs record square distance and optional approximate meters, while `[ APPLY MAP RANGE ]` remains the only way map geometry can change the Book 1 range band. Encounter Documents migrate from schema v4 to v5; Campaign and Bundle schemas are unchanged.

## v0.15.2.1 navigation-return hotfix

v0.15.2.1 restores an explicit route from the focused encounter workspace to the subsector jump controls. The jump action itself was still being generated, but encounter-focus styling deliberately hid the navigation-plan block and the operations tabs did not include a dedicated way back to it. A compact `[ NAV ]` tab now restores the subsector map, jump plan, ship status, and `[ JUMP TO ... ]` action. Navigation is also the default workspace whenever a campaign is created, loaded locally, or imported. Combat retains its full-width focused map until the user selects `[ NAV ]`. No rules or persistence schemas change.

## v0.15.2 Traveller-first campaign interface

v0.15.2 simplifies the campaign-play hierarchy without changing rules or persistent document schemas. The masthead now identifies the application as `TRAVELLER`, displays the current campaign separately, and keeps `[ NEW ]`, `[ SAVE ]`, `[ LOAD ]`, `[ IMPORT ]`, and `[ EXPORT ]` together immediately below the campaign name. Save/Load remain browser-local; Import/Export operate on portable campaign JSON. The long feature/version banner, campaign-terminal label, and developer-facing rules footer have been removed, leaving a small version marker and transient status message.

The main workspace heading changes from `SUBSECTOR NAVIGATION` to `PERSONAL COMBAT` while the encounter workspace is active. Repeated map instructions have moved into contextual help, and the full text encounter record is collapsed behind `ENCOUNTER DETAILS`; the map, action bar, party cards, and enemy roster remain immediately visible. The Activity Log can be hidden from the masthead, and its new default `PLAY` filter shows campaign activity while suppressing routine `SYSLOG` administration. Saving, loading, importing, and exporting still report success in the status line but no longer add repetitive journal entries. Classic Traveller Book 1 abstract range bands remain authoritative.

## v0.15.1.1 portable activity journal and token-menu fix

v0.15.1.1 promotes the Activity Log from a capped browser-only display into a stable-ID Activity Log Document owned by the campaign. Campaign Document v8 and Campaign Bundle v7 preserve the complete chronological journal through local saves and portable bundle exports. Existing per-campaign browser entries migrate into the document on first load. The feed groups filters for character activity, trade, ship operations, personal combat, space combat, campaign events, and system messages; referees may also add dated campaign notes. Character generation now records its actual history events instead of a generic completion message. Working documents remain the source of truth—the journal records meaningful actions, resolved rolls, and state changes rather than transient selections or hover events.

Token context actions now measure their rendered menu and clamp it inside the encounter viewport beside the pointer or keyboard-selected token. The viewport is the menu's positioning container, and focusing the first action no longer scrolls the page, correcting the dialog that could appear far from its token. Hover summaries, right-click actions, and the position-derived Graycloak range suggestion remain interface aids; the explicit Classic Traveller Book 1 range band is still authoritative.

## v0.15.1 persistent actor roster and map inspection

v0.15.1 establishes the shared actor paradigm for personal encounters without prematurely automating optional robot or alien rules. Campaign Document v7 and Campaign Bundle v6 add stable-ID NPC Actor Documents, portrait Media Asset Documents, and roster folders. An actor record carries the six classic characteristics and UPP, current physical values, career/service details, skills, equipment, inventory, credits, public/referee notes, description, portrait reference, effects, and body-aware state. Biological actors can be alive, unconscious, or dead; robotic actors use activation and integrity states such as powered down, offline, damaged, disabled, and destroyed rather than being forced into biological labels.

The Operations Desk now includes a compact collapsible roster. Referees can create or edit human, alien, creature, hybrid, or robot records, attach a small PNG/JPEG/WebP portrait, and insert a saved actor into manual combat setup. Encounter Document v4 records each combatant's source actor ID. Tokens expose an accessible SVG title plus a richer hover summary; right-click or Shift+F10 opens contextual select/target/attack/open-roster actions. These controls clarify intent without changing resolution: token positions still produce only a Graycloak distance/range suggestion, and the authoritative Classic Traveller Book 1 range band changes only through an explicit combat or referee action.

This slice deliberately does not implement Book 2 ship-to-ship combat, ship damage tracks, or optional robot/alien sourcebook procedures. The stable-ID document and effect/state foundation is intended to support those later additions.

## v0.14.1 fluid combat-map interaction

v0.14.1 replaces the encounter map's scroll-container camera with an SVG viewBox camera adapted from the Graycloak BATTLESYSTEM/Chainmail board interaction pattern. Tokens now follow the pointer continuously while dragged, preserve the initial grab offset, remain inside the battlefield, and snap to their persistent square only when dropped. Empty-map drag pans without rebuilding the battlefield; wheel zoom is smooth, cursor-centred, and coalesced to one view update per animation frame. `[ − ]`, `[ + ]`, and `[ FIT ]` remain available, with a 50%-400% camera range.

The interaction pass changes no combat resolution or persistence schema. A dropped token records one map-position event, while the live preview records nothing. Position-derived range remains a labeled visual suggestion; Classic Traveller Book 1 range bands remain authoritative until the referee deliberately uses `[ APPLY MAP RANGE ]`.

## v0.14.0 personal combat workspace

v0.14.0 expands the compact encounter map into a full-width 32-by-20 personal-combat workspace. The ENCOUNTER tab temporarily replaces the subsector view while selected, exposing a scrollable map with 50%-200% zoom, fit, drag-to-pan, and persistent draggable PC/enemy tokens. The side rail now separates a party actor roster from a collapsible enemy roster. Clicking a party token/card chooses the acting traveller; clicking an enemy chooses the target. Campaigns with multiple party Character Documents place every member in combat, each active PC declares once per round, and opponents choose the nearest active PC from the visual positions. Manual setup supports up to four distinct enemy types and sixteen enemies total.

Encounter Document v3 migrates v1/v2 encounters to the expanded workspace and persists pending party declarations. Square distance produces a clearly labeled Graycloak range suggestion only. Dragging never silently changes the authoritative Classic Traveller Book 1 abstract range band: CLOSE/OPEN remains a combat action, while `[ APPLY MAP RANGE ]` is an explicit referee action with its own audit and activity-log entry. Abstract range changes reposition the acting token to keep the visual guide aligned. The Classic Traveller rules package remains unchanged because the grid and its range guide are host policy, not new Traveller rules.

## v0.13.1 manual combat and encounter map

v0.13.1 makes personal combat directly accessible from the ENCOUNTER tab. `START COMBAT` opens a referee setup for one to six enemies, including name, STR, DEX, END, INT, weapon skill, weapon, armor, and starting range. Encounter Document v2 adds persistent positions on a 12-by-8 square grid and migrates v1 encounters automatically. The map shows the player character as a labeled token and enemies as selectable dots; a linked roster displays every enemy's current physical characteristics and equipment. Clicking a dot or roster entry selects the player's attack target. Multi-enemy rounds allow every active opponent to act, preserve simultaneous wound effects, and make the existing 25-percent casualty morale procedure meaningful. The square grid is explicitly a Graycloak visual aid; Book 1 range bands remain authoritative.

## v0.13.0 personal encounters and combat

v0.13.0 adds a generic Book 1 personal-combat engine and a compact ENCOUNTER tab linked to hostile Situation Documents. Combat resolves surprise and avoidance, abstract range bands, movement, evasion, escape, weapon/armor/range tables, weapon and characteristic DMs, untrained penalties, visible 2D throws, first-wound location, STR/DEX/END damage, simultaneous round effects, unconsciousness, death, morale, retreat, and end-of-combat recovery. Each Encounter Document preserves combatants and a round audit trail; Campaign Document v6 and Campaign Bundle v5 persist those documents while migrating older saves with empty encounter collections. No tactical map is introduced.

## v0.12.1.3 live ship status and clearer local job board

v0.12.1.3 keeps a live ship-status panel beside Navigation Plan so fuel, cargo, passengers, active jobs, and the ship operating account visibly change as the player acts. Fuel is green when the selected jump is ready, yellow when fuel is short but obtainable locally, and red only when the selected jump lacks fuel and the current system has no usable refueling source. Fuel, cargo/passenger, and job rows link directly to PORT, TRADE, and JOBS. The JOBS tab now labels the current port explicitly, states that map selection is navigation-only, prints origin -> destination on both offers and active jobs, and uses a green JOB activity entry when work is accepted. No Traveller rules or persistence schemas change in this milestone.

## v0.12.1.2 partial fuel-purchase fix

v0.12.1.2 fixes a port-operations bug where paid fuel could only be purchased by filling the tank completely. The old UI disabled `REFUEL TO FULL` whenever the ship operating account could not afford every missing ton, even when the account could afford enough fuel for the next jump. Paid starports now expose a fuel-tonnage input and calculate the exact purchase price; Scout-base free fuel retains one-click fill-to-capacity. Contract/job acceptance does not debit the ship operating account and does not reserve fuel. The rules package now exposes `purchaseShipFuel()` for quantity-based purchases while retaining `refuelShipToCapacity()` as a convenience wrapper.

## v0.12.1.1 generic adventure engine

v0.12.1.1 separates authored campaign content from the reusable adventure machinery. `traveller/src/adventure-definition.js` defines a portable JSON-compatible Adventure Definition v1, and `traveller/src/adventure-engine.js` resolves generic thread, clue, objective, contact, follow-up, contract, history, and event actions. The engine contains no Carranza, Aurelia, or Mara Venn knowledge. The Sea of Suns Carranza Route now lives under `traveller/campaigns/sea-of-suns/adventures/` and is consumed through the same data interface intended for future referee-authored adventures. Existing v0.12.1 Carranza threads, contacts, contracts, and resolved situation titles are recognized through generic legacy matching so campaign continuity is not duplicated during upgrade. No new Classic Traveller rules are introduced in this patch.

## v0.12.1 adventure threads and consequences

v0.12.1 adds persistent Adventure Thread and Contact Documents. Resolved situations can now add clues, update a current objective, create follow-up situations, introduce recurring named contacts, and create linked contracts. Campaign Document v5 and Campaign Bundle v4 carry contacts and threads forward while older campaigns migrate with empty continuity collections. The campaign header prefers an active thread objective after any immediate Situation, and `[ THREADS ]` opens the compact thread record with objectives, clues, contacts, and history.

The first authored continuity chain begins with Cinder's obsolete beacon and follows the navigator Carranza through Aster and Heliograph. Failed investigation rolls yield weaker evidence instead of automatically dead-ending the thread. Mara Venn, an Aster Scout archivist, can recur across related situations and may offer a paid Heliograph archival courier job. The thread deliberately treats Aurelia as a marginal clue rather than announcing a main quest. Personal combat remains out of scope.

## v0.12.0.4 chargen-record visibility fix

v0.12.0.4 fixes the completed-campaign detail layout so Service History and Generation Log remain hidden during normal campaign play and appear only when `[ CHARGEN RECORD ]` is selected. The shared `hidden` attribute is now enforced against layout classes such as `.two-column`, preventing display rules from accidentally overriding hidden detail panels. This is a UI-only patch with no Traveller rules or persistent-document changes.



## v0.12.0.3 activity-roll readability

v0.12.0.3 makes Activity Log checks visibly read as dice rolls. CHECK and rolled SITUATION entries render two boxed d6 results with an explicit `ROLL 2D` label, and their outcome is separated into a high-contrast result band: pale green for SUCCESS and pale red for FAILURE. Existing v0.12.0.x activity entries are still readable and legacy `2D a+b = total` roll text is recognized by the renderer. This is a UI-only patch with no Traveller rules or persistent-document changes.

## v0.12.0.2 operations action-strip usability

v0.12.0.2 keeps each Operations Desk tab's available actions directly below its tab header. PORT, TRADE, JOBS, and SITUATION actions no longer sit below a potentially long record; the record itself takes the remaining panel height and scrolls independently. This is a UI-only patch with no Traveller rules or persistent-document changes.

## v0.12.0.1 campaign UI pass

v0.12.0.1 reorganizes completed-character campaign play around a persistent status header and a larger Operations Desk. The header keeps character identity, current characteristics, six quick skills, current world/date, ship resources, and the most urgent active situation or contract visible. Characteristics and quick skills are clickable and use one small modifier dialog, defaulting the referee modifier to 0; rolls are recorded in the Activity Log. Situation skill checks use the same dialog while retaining their authored target and built-in DMs. Full Personnel, Ship, Campaign, System, Service History, and Generation Log records remain available as explicit detail views instead of permanently occupying the play screen. The Subsector workspace now gives 460-500px to navigation/operations because the 8x10 Traveller map is naturally portrait-oriented.

Standalone browser client for the original-universe Classic Traveller project.

The Classic Traveller rules engine lives in `../packages/classic-traveller-rules/`. Pure rules and document legality stay there; the browser renders state and legal actions. Original Sea of Suns adventure content stays under `traveller/campaigns/sea-of-suns/`; world-generation content remains under `traveller/world/`.

## v0.12.0 situations, patrons, and non-combat checks

v0.12.0 adds persistent Situation Documents to Campaign Document v4 and Campaign Bundle v3. Authored and procedural Sea of Suns arrival events can appear at port calls, Book 3 patron contacts use the printed patron and reaction tables, and accepted situations expose explicit choices in the Operations Desk. The browser uses a Graycloak once-per-port-call patron cadence rather than adding a waiting subsystem. Non-combat skill resolution is a clearly labeled Graycloak generalization of the Book 1 Electronics referee-check guidance. Personal and starship combat remain out of scope for this milestone.

## v0.11.2.1 operations-desk and state repair

This hotfix keeps Port Services, Commerce, and Contract Board in a tabbed operations desk beside the subsector map. Campaign Document v3 adds persistent speculative-lot purchase state, same-world speculative resale is rejected, contract deadlines reconcile when campaign time advances or a campaign loads, and time-consuming gas-giant refueling now persists campaign time together with ship state.

## v0.11.2 contracts and courier work

v0.11.2 adds a persistent Contract Document and port Contract Board. Accepted contracts are referenced by Campaign Document v3, stored in the local document registry, and included in Campaign Bundle v2 exports. Campaign Document v1 and Campaign Bundle v1 imports migrate forward with an empty contract list, preserving older saves.

Each port call exposes deterministic offers among reachable systems. Book 2-backed whole-ship charters use the printed two-week charter formula (Cr900 per cargo ton + Cr9,000 per high-passage berth + Cr900 per low berth), while Book 2 private-message work uses the 9+ availability check and an honorarium generated within the stated Cr20-Cr120 range. Priority courier packets, route-verification surveys, and fixed-fee small-lot deliveries are original Sea of Suns contract content.

Accepted small-lot delivery contracts occupy real cargo space. Whole-ship charters are exclusive and require empty commercial manifests; normal passenger/freight/speculative actions are disabled until the charter is completed. Navigation is also constrained to an exclusive charter's destination. Timely arrival completes matching contracts and credits the ship operating ledger; late arrival or missing required contract cargo fails the contract without payment. Contract events appear in the Activity Log.

## v0.11.1 commerce

v0.11.1 turns the existing port, ship-account, and cargo foundations into the first revenue loop. Selecting a reachable destination now exposes Book 2 passenger demand and distinct freight shipments for that route. The Type S has three passenger staterooms available after its one-person crew; high passage still requires a steward, and the standard Type S has no low berths. Accepted freight occupies the existing three-ton hold and pays Cr1,000 per ton on delivery. Passenger fares are settled into the ship account when the passengers reach their announced destination.

The current world also exposes one deterministic weekly speculative-trade lot using the Book 2 Trade and Speculation table, world-type purchase/resale DMs, the facsimile errata for corrected prices/quantities, optional broker DMs on resale, and Admin/Bribery sale skill DMs when present. Ton-based goods can be bought automatically subject to hold capacity and operating funds. Table entries sold as individual items (51-56) are displayed but not auto-loaded because the Book 2 table leaves their tonnage to the players/referee. Partial speculative purchases include the Book 2 1% handling fee. The printed Actual Value table spans modified results 2 through 15; the current engine resolves results outside that printed range to the nearest printed endpoint as an explicit Graycloak implementation policy.

Ship Document v3 adds a persistent passenger manifest and migrates v1/v2 ships forward. Jump departure now charges Book 2 life support for occupied staterooms/low berths, blocks route changes while passengers are booked for another destination, and automatically delivers matching freight and passengers after arrival. Navigation and Port Services retain the selective pale-yellow attention treatment for fuel, unpaid berthing, life-support funding, and other departure blockers. Commerce actions are written to the Activity Log.

## v0.11.0.2 state highlights

v0.11.0.2 adds selective state-dependent emphasis without changing Traveller rules or persistent schemas. The Navigation Plan highlights fuel requirement/availability and status only when fuel blocks a jump, while unpaid berthing and unrecorded fuel receive the same pale-yellow attention treatment in Port Services. Blocking messages beside the jump action are also emphasized. Normal/ready values remain visually quiet.

## v0.11.0.1 navigation UI

v0.11.0.1 is a presentation-only navigation pass. The subsector SVG now shows compact Scout and Naval base markers, the map has zoom-out / zoom-in / fit controls, and the Navigation Plan plus jump action sit in a left rail beside the map on desktop. At narrower widths the navigation rail moves above the map. No jump, fuel, commerce, campaign, or ship rules changed.

## v0.11.0 port operations

v0.11.0 builds on the persistent campaign, SVG Far Meridian subsector, Book 3 system records, and Activity Log with the first operational starport layer.

At the campaign's **current** system, PORT SERVICES now shows:

- starport and derived Book 3 trade classifications
- current ship fuel quantity/quality and local fuel service
- Scout-base free-fuel eligibility
- gas-giant skimming availability
- current berthing charge state
- cargo used/capacity and manifest count
- separate ship operating account
- recent ship ledger entries
- the active character's personal credits for comparison

The player can transfer credits from the character to the ship account, refuel to capacity when fuel is available, pay recorded berthing, and skim a gas giant with a streamlined vessel. These actions are written to the Activity Log where appropriate.

Ship Document v2 adds persistent operational state for fuel, cargo manifest, ship finances/ledger, and the current port call. v1 Ship Documents load through a migration path. Legacy fuel remains **UNRECORDED** rather than being guessed; refueling or skimming establishes the tracked quantity.

Jump actions now require recorded sufficient fuel. For the Type S, a one-week Jump-1 consumes 10 tons of jump fuel plus 5 tons representing one week of its four-week power-plant fuel allowance; Jump-2 consumes 20 + 5 tons. Arrival at a starport records the baseline Cr100 berthing charge, which must be settled before the next departure.

## Run locally

From the monorepo root:

```text
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/traveller/client/
```

## Existing systems retained

- complete Book 1 character generation
- gameplay Character Document v2
- source-backed Scout reserve-assignment rules
- Type S Scout/Courier Ship Document with stable ID
- persistent Campaign Document and portable Campaign Bundle
- true SVG 8-by-10 Far Meridian subsector map
- Jump-N range and seven-day jump travel
- authored UWP system/world records
- portable, filterable per-campaign Activity Log Document with referee notes

## Next gameplay layer

The commerce foundation supports passengers, freight, speculative cargo, contracts, patrons, situations, adventure threads, and personal encounters. Mail, crew salary calendars, annual maintenance scheduling, extended berthing days, low-berth revival for ships that actually carry low berths, and starship combat remain later milestones.
