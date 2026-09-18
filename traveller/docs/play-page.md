# The play page (client/play.html)

A new entry page built beside the old client, not inside it. `index.html`,
`app.js` and `styles.css` are untouched and keep working until this page
replaces them.

Open it: `serve-traveller.bat`, then
`http://localhost:8080/traveller/client/play.html`
(`?show=port|decision|jump|fight|shipfight` opens a sample situation directly).

## The layout rule

The screen shows the situation you are in and nothing else.

- **Masthead**: where, when, and three chips (character, ship, Referee).
- **What now?** (left): one lead card for the next thing to do; everything
  else possible is a one-line row that opens for its detail and rule citation.
  Finished steps fold into one "Done" line.
- **Scene** (centre): subsector map, range bands, or vector plot.
- **Drawer** (right, shut by default): character, ship or referee directory,
  one at a time. It takes width from the scene; it never covers it.
- **Chat** (bottom edge): one line until opened; opening it shrinks the scene.

A new situation adds a scene and a lead card. It never adds a panel.

In a fight the left column widens and becomes the selected combatant over a
compact tracker, and the scene is the Book 1 p.29 band board at full width.
The tracker carries what Book 1 makes you look up, one line per combatant:
current STR/DEX/END, range from the selected combatant, the throw needed to
hit them, the throw they need to hit back, and this round's order. Click a
"Hit" number to target; click a name or marker to read from someone else.
Movement and attack are separate declarations (p.28). A player seat will see
only what is observable about the opposition; the referee sees all of it.

## Files

| file | job |
| --- | --- |
| `play.html` | the four regions |
| `play.css` | the only stylesheet the page loads |
| `play.js` | shell state: situation, drawer, chat, theme |
| `play-views.js` | pure DOM builders from a view state |
| `play-sample.js` | the view-state contract, with sample data |

`test/play-page.test.mjs` pins the separation: no imports from `app.js`,
`ui-model.js` or the other page controllers, and no `styles.css`.

## Wiring order

Each slice replaces part of `viewState()` in `play.js` with a read of the real
campaign and ports the matching commands out of `app.js` into a headless
module under `src/`. No view code changes in any slice.

1. Load a campaign (`document-registry.js`, `?campaign=`): masthead, character
   and ship drawers, current system on the map. Read-only.
2. Port call: `playProcedureSnapshot()` and its commands (berth, fuel,
   freight, passengers, speculation, resale, destination, depart) into
   `src/play-session.js`. `buildPlayProcedure` cards map to lead + rows.
3. Jump, arrival, ship encounter, situations/decisions.
4. Personal combat on range bands (encounter document already headless).
5. Chat and dice (`dice-tray.js`, Firestore chat).
6. Referee drawer: actors, scenes, players. Tactical grid via `scene-canvas.js`.
7. Ship action: phases, allocation, vector plot.
8. Player seat on the same page; retire `player.html`, then `index.html`.
