# SOLMAR HEAT — a gta6-01 entry

An original open-world crime story in the browser, built for the make.fun
gta6-01 bounty ("Make GTA 6"). No libraries, no network requests: plain
JavaScript ES modules on one canvas, a static `game/` folder any desktop
browser loads offline.

## The game

Dario Cruz owes the Solmar crew five jobs before sunrise, in the invented
coastal city of Solmar — a road grid of named neighbourhoods, a park, a plaza
with a fountain, and the harbour docks in the south.

1. **THE PICKUP** — collect the package at the Solmar docks. (+$250)
2. **THE DELIVERY** — take it to the Neon Palms hotel. (+$500)
3. **THE GETAWAY** — lose the cops, then reach the safehouse on Coral Row. (+$1,000)
4. **THE VAULT** — crack the Solmar Bank vault. The alarm adds two wanted
   stars the moment the drill starts, and the crack only moves while Dario
   stays at the bank door. (+$1,500)
5. **THE LAST RUN** — the boat leaves the pier in 75 seconds. Get there with
   the money. (+$2,000)

Finish all five and Solmar is yours. Get caught on foot and it is over.

## The city, alive

- **Traffic and pedestrians** fill the roads and sidewalks. Traffic stops at
  red lights and turns at intersections; pedestrians flee a speeding car or
  a horn blast.
- **Five-star wanted level**: steal a car, hit a pedestrian or trip the vault
  alarm and the Solmar PD sends patrol cars after you. Stay clean and out of
  sight and the heat cools off — or lose it before the safehouse lets you in.
- **Day/night cycle**: one night runs from 21:00 dusk to 05:00 dawn. The city
  darkens toward midnight, lamps glow, windows light up, and the headlights
  matter.
- **Car damage**: crashes and police rams wear the car down — it gets slower
  and starts smoking. The crew patches it up between jobs.
- **Pirate radio**: three WebAudio synth stations (R to switch) — sunset
  synth, lo-fi nights, salsa caliente. M mutes everything.
- **Mission route**: a dashed gold line on the street and on the minimap
  shows the road-grid route to the current marker, plus an edge arrow when
  the marker is off-screen.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| E | Enter a car, get out, work a mission marker, start the vault drill |
| F / click | Shove a pedestrian |
| H | Horn (scatters pedestrians) |
| R | Change radio station |
| P / Esc | Pause |
| M | Mute |
| Enter / Space | Confirm / start |

Progress saves to `localStorage` after every job, and the title screen offers
to continue a saved job.

## How to run

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open the page, press Enter, and drive. `?seed=N` fixes the city layout;
`?shot=start|drive|foot|getaway|vault&seed=N` stages a screenshot scene
(see `shots.json` for the four shipped shots).

## Handing in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library. It refuses to hand
in more than four screenshots or any one over the 256 KiB cap.

## Layout

- `game/index.html` — the page, one canvas and a screen-reader status line.
- `game/src/main.js` — boot, the fixed-step loop, screens, save handling.
- `game/src/world.js` — the simulation: player, traffic, pedestrians, police,
  wanted level, night clock, vault drill, last-run timer, radio switching.
- `game/src/render.js` — the canvas renderer: city, night wash, route line,
  HUD, minimap, title and end screens.
- `game/src/city.js` — the seeded city: road grid, buildings, park, plaza,
  docks, hotel, bank.
- `game/src/audio.js` — original WebAudio synth: engine, siren, horn, alarm,
  mission stings, and the three radio stations.
- `game/src/input.js` — keyboard and mouse, with per-key edge presses.
- `game/src/shots.js` — the staged screenshot scenes.
- `game/src/config.js` — every tuned number and the mission list.
- `game/src/random.js` — the seeded random helpers.
- `main.ts` — the hand-in program. `serve.ts` — the local static server.
- `shots.json` — the four shipped screenshots and their staging queries.
- `vendor/makefun-game.ts` — the vendored make.fun library (do not edit).
