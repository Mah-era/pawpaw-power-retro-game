# PawPaw Power

PawPaw Power is an original desktop-only 16-bit style calico cat adventure platformer built with Phaser.js. It uses generated pixel-art textures and Web Audio sound effects/music, so it runs without external copyrighted assets.

The calico hero runs, jumps, throws fishbones, collects colorful cat food, finds secrets, clears scenario-based platforming challenges, and defeats a boss at the end of every level.

## Links

- Live game: https://pawpaw-power-retro-game.vercel.app/
- GitHub repo: [Mah-era/pawpaw-power-retro-game](https://github.com/Mah-era/pawpaw-power-retro-game)

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:5173
```

## Controls

- Left Arrow: move left
- Right Arrow: move right
- Up Arrow: jump
- Space: throw fishbone
- P: pause or resume
- M: mute or unmute audio
- Esc: pause in-game or go back from menus

## Tutorial

The game starts with Level 0: PawPaw Training Trail, a fully interactive tutorial level. It uses signboards, animated arrows, pixel-art icons, knowledge boards for all five main level themes, locked tutorial gates, and a categorized checklist panel.

Level 0 teaches movement, collecting, fishbone throwing, hazards, power-ups, blocks, checkpoints, tunnels, moving/falling/disappearing platforms, river crossing, rooftop jumps, respawning, shield protection, and boss weak-point combat through actual gameplay. Completing every checklist objective triggers the "PawPaw is Ready!" sequence, unlocks Level 1, and automatically moves into the main campaign.

## Campaign

PawPaw Power has one tutorial level plus five main levels. Each main level has a different scenario, secret entrance, checkpoint, collectibles, power-ups, hazards, and a required boss fight.

- Level 0: PawPaw Training Trail
- Level 1: Sunny Grassland Tutorial
- Level 2: City Crossroad Dash
- Level 3: Rooftop Building Leap
- Level 4: River and Bridge Crossing
- Level 5: Night Cat Tower Final

After a boss is defeated, the next level unlocks and starts automatically. There is no normal goal object that skips the boss.

## Features

- Smooth side-scrolling Phaser arcade physics
- Up Arrow jumping with coyote time and jump buffering
- Space-key fishbone throwing with cooldown, range, hit effects, and boss/enemy damage
- Silver cat food projectile upgrade for stronger fishbones
- Bosses that require projectile timing and get more dangerous as they lose health
- Scenario systems for traffic, rooftops, rivers, moving platforms, falling platforms, disappearing platforms, blocks, tunnels, chase sections, and hazards
- Mystery blocks, breakable blocks, hidden blocks, and secret entrances
- Cat food score, food streak extra lives, timer, checkpoints, lives, game over, pause, win, level select, and localStorage unlocks
- Original generated 16-bit style visuals and original Web Audio chiptune sound

## Power-Ups

- Red cat food: temporary speed boost
- Blue cat food: one-hit shield
- Purple cat food: temporary double jump
- Gold cat food: large score bonus
- Green cat food: rare extra life
- Silver cat food: temporary fishbone projectile upgrade

## Level Editing

Level data lives in `src/data/levels.js`.

Each level can define:

- `platforms`
- `movingPlatforms`
- `fallingPlatforms`
- `disappearingPlatforms`
- `blocks`
- `hazards`
- `movingHazards`
- `secretEntrances`
- `collectibles`
- `powerUps`
- `enemies`
- `checkpoint`
- `bossArena`
- `boss`

Bosses support settings such as `name`, `hp`, `speed`, `projectileSpeed`, `projectileInterval`, `jumpVelocity`, `projectileDamage`, `stompDamage`, and `summonAtHp`.
