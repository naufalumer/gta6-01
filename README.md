# AZURA BAY — Neon Tide

![Make GTA 6](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/naufalumer/gta6-01/rank.svg)
![Reward](https://make.fun/badge/gta6-01/naufalumer/gta6-01/reward.svg)

An original open-world crime game for make.fun's **Make GTA 6** bounty.
Rico Vane is back in Azura Bay after three years away. The Harbor Syndicate
owns the port, the streets and the cops on its payroll. Build your crew, earn
respect district by district, and take the Bay back — on foot, by car, by
bike, by helicopter and by jetpack.

No characters, places, music or assets from any Rockstar Games title. Every
sound and song is synthesized live with WebAudio; the hip-hop radio is
original, beat by beat.

## Play it

Open `game/index.html` in a desktop browser (or serve the folder with any
static server). No network needed at play time — Three.js is vendored and
all audio is synthesized in the game.

## Controls — desktop

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Look & aim (click the game to lock the mouse) |
| Click | Shoot (when armed) |
| F | Enter / steal vehicle, exit vehicle |
| Space | Jump / handbrake / jetpack thrust / helicopter climb |
| Shift | Sprint / nitro (with the nitro kit) |
| 1 / 2 / 3 | Pistol / SMG / Shotgun |
| R | Reload |
| E | Talk / shop / fish / play ball / take a job |
| Q | Next radio station |
| Z / X / C | Active crew: Lena (hacker) / Tank (mechanic) / Mira (driver) |
| H | Horn |
| M | Full map (districts, standing, stats) |
| N | Mute |
| Esc | Pause |

## Controls — touch (phone / tablet)

Left stick to move, drag the right side of the screen to look, on-screen
buttons for FIRE / JUMP / ENTER / USE, plus pause and map. Desktop controls
are untouched — touch only appears on touch devices.

## What is in the game

- **A living Vegas-style crime city**: 64 pedestrians who walk, cross,
  chat, drive off in parked cars and flee gunfire; 26 traffic cars; a neon
  strip, the Golden Gull casino, a wooden pier, a streetball court, a
  container port with cranes and two helipads.
- **Day cycle**: morning, noon, orange dusk and night with the neon burning.
  The sky, sun, fog, water and street lights all change with the hour.
- **Wanted ladder**: 1 star foot cops, 2 patrol cars, 3 roadblocks, 4 Air
  One helicopter, 5 everything. Cops ram, PIT, shoot and arrest. The HUD
  lists every patrol unit with its distance and tactic.
- **Six story jobs** against the Harbor Syndicate, plus courier runs and
  street races. District standing changes payouts and shop prices.
- **Six ways to move**: cars, motorcycles (lean into turns), a flyable
  helicopter, a jetpack, fishing at Pier 9 (cast, bite, reel), and
  streetball with charged shots and streaks.
- **Crew**: Lena (police scanner), Tank (self-repairing cars), Mira (longer
  nitro, faster cooldown) — switch with Z / X / C.
- **Garage**: Tideworks Customs sells upgrades, weapons and gear; the
  Golden Gull runs slots; the full map screen tracks cars stolen, stars
  lost, knockouts, races won, best lap and distance driven.
- **Radio**: three original hip-hop stations (Westside Bounce, Boom Bap,
  Night Drive). The beat gets intense when the heat is on. Q switches
  station while driving.

## Build

`node serve.ts` serves `game/` on http://localhost:8080.
`MAKEFUN_OUTPUT_DIR=out node main.ts` builds the hand-in (game +
screenshots + dossier.json).
