# PawPaw Power Project Report

Report date: June 10, 2026

## 1. Project Overview

PawPaw Power is a desktop-only 2D retro platformer built with Phaser.js, HTML, CSS, and JavaScript. The game is an original cat-themed adventure inspired by the feel of classic side-scrolling platformers, while avoiding copied characters, sprites, music, sounds, level layouts, names, or copyrighted assets.

The player controls a cute calico cat hero who travels through a tutorial level and five main adventure levels. The cat collects colorful cat food, uses power-ups, throws fishbone projectiles, avoids hazards, discovers secrets, defeats enemies, and fights a boss at the end of every level.

The project is designed to run locally in the browser using a Vite development server. No backend is required.

## 2. Technology Stack

| Area | Technology |
| --- | --- |
| Game engine | Phaser 3 |
| Language | JavaScript ES modules |
| Markup | HTML |
| Styling | CSS |
| Local dev server | Vite |
| Audio | Web Audio API through the custom AudioManager |
| Assets | Runtime-generated pixel-art textures and synthesized retro audio |
| Persistence | localStorage for level unlock progress |

## 3. Project Structure

```text
index.html
package.json
README.md
PROJECT_REPORT.md
src/
  main.js
  scenes/
    BootScene.js
    PreloadScene.js
    MainMenuScene.js
    TutorialScene.js
    LevelSelectScene.js
    GameScene.js
    PauseScene.js
    GameOverScene.js
    WinScene.js
  objects/
    Player.js
    Enemy.js
    Boss.js
    PowerUp.js
    Collectible.js
  systems/
    AudioManager.js
    LevelManager.js
    UIManager.js
  data/
    levels.js
  styles/
    style.css
```

The required scene, object, system, and data separation is in place. External art and audio files are not required because the game generates pixel textures and sound effects at runtime.

## 4. Core Game Identity

Title: PawPaw Power

Main character: a cute calico cat hero with white, orange, and black pixel-art patches.

Core loop:

1. Start Level 0 tutorial or selected unlocked level.
2. Run, jump, collect cat food, avoid hazards, and defeat enemies.
3. Learn or use scenario-specific level mechanics.
4. Reach the boss arena.
5. Defeat the boss using fishbone projectiles, dodging, jumping, and timing.
6. Complete the level, unlock the next level, and automatically progress.

The game replaces classic platformer conventions with original cat-themed equivalents:

| Traditional Platformer Idea | PawPaw Power Equivalent |
| --- | --- |
| Coins | Colorful cat food |
| Power mushrooms | Colored cat food power-ups |
| Fireballs | Fishbone projectiles |
| Pipes | Cardboard boxes, cat doors, vents, drains, tree holes |
| Flags or castles | Cat tower / boss completion flow |
| Generic enemies | Original animal and obstacle-themed enemies |

## 5. Controls

| Input | Action |
| --- | --- |
| Left Arrow | Move left |
| Right Arrow | Move right |
| Up Arrow | Jump |
| Space | Throw fishbone projectile |
| P | Pause or resume |
| M | Mute or unmute audio |
| Esc | Pause in game or return from menus |

Space is intentionally reserved for throwing fishbones. This projectile mechanic is important for defeating enemies and bosses.

## 6. Scene Architecture

### BootScene

Initial boot scene. It prepares the game flow and moves into loading.

### PreloadScene

Generates the game's runtime assets:

- Calico cat animation frames
- Enemy sprites
- Boss sprites
- Cat food collectibles
- Power-up icons
- Tile and platform textures
- Vehicles
- Hazards
- Secret entrances
- Projectiles
- Particles

This keeps the project playable without downloaded or copyrighted assets.

### MainMenuScene

Displays the main menu and starts a new run from Level 0. It also links to level select, controls/tutorial help, and audio toggling.

### TutorialScene

Provides a menu-accessible tutorial/help screen and now starts the interactive Level 0 tutorial when selected.

### LevelSelectScene

Shows unlocked and locked level cards. Progress is based on localStorage unlock state. Level 0 is unlocked by default, and Level 1 unlocks after Level 0 is completed.

### GameScene

Main gameplay scene. It creates levels, platforms, hazards, enemies, collectibles, power-ups, blocks, secrets, boss arenas, player projectiles, tutorial overlays, UI, collisions, timers, checkpoints, and level completion.

### PauseScene

Allows resume, restart, main menu navigation, mute/unmute, and volume changes.

### GameOverScene

Shows final score after all lives are lost.

### WinScene

Shows victory after the final boss level is completed.

## 7. Object Architecture

### Player

The Player class owns movement, animation state, jump buffering, coyote time, power-up effects, shield state, invincibility blinking, and landing feedback.

Implemented player states include:

- idle
- walking
- running
- jumping
- falling
- throwing
- hurt / invincible
- powered-up
- defeated through game-over flow

Movement features:

- Arcade acceleration and deceleration
- Gravity
- Platform collision
- Coyote time
- Jump buffering
- Double-jump support when powered up
- Landing particle effect after a high fall
- Speed tint while boosted
- Shield aura while shielded
- Invincibility blinking after damage

### Enemy

Enemy types include:

- Walking enemy
- Flying enemy
- Jumping enemy
- Spiky enemy
- Traffic enemy
- River enemy
- Rooftop enemy

Enemy behaviors include patrol movement, wave movement, hop intervals, stomp defeat, projectile defeat, and non-stompable hazard behavior for spiky/traffic enemies.

### Boss

Bosses have:

- Health
- Visible HUD health display
- Movement inside an arena
- Projectile attacks
- Jump behavior
- Speed increases after hits
- Weak-spot logic
- Stun/react behavior
- Defeat animation
- Boss-defeated event that triggers level completion

The tutorial boss is tuned as a training boss: fishbones open the weak point, but the player must jump on the weak point to finish the fight.

### PowerUp

Power-ups are colored cat food:

| Color | Effect |
| --- | --- |
| Red | Temporary speed boost |
| Blue | One-hit shield |
| Purple | Temporary double jump |
| Gold | Large score bonus |
| Green | Extra life |
| Silver | Temporary stronger fishbone projectile |

### Collectible

Collectibles are cat food pieces. They increase score, food count, and can contribute to extra-life rewards.

## 8. System Architecture

### AudioManager

AudioManager uses Web Audio API synthesis instead of external audio files. It provides:

- Background chiptune-style music
- Jump sound
- Throw sound
- Collect sound
- Power-up sounds
- Enemy defeat sound
- Hurt sound
- Checkpoint/bonus sounds
- Level complete sound
- Boss hit and defeat sounds
- Button hover/click sounds
- Mute/unmute
- Volume control support

### LevelManager

LevelManager owns:

- Level lookup
- Max level detection
- localStorage unlock state
- Run state creation
- Run state persistence in Phaser registry
- Level completion and unlock progression

Default progression now starts from Level 0.

### UIManager

UIManager owns the retro HUD:

- Score
- Lives
- Timer
- Current level
- Food count
- Active power-up
- Shield status
- Fishbone cooldown
- Boss health display
- Temporary message banner

## 9. Level Progression

The project contains one tutorial level and five main campaign levels.

| Level | Name | Biome | Scenario | Boss |
| --- | --- | --- | --- | --- |
| 0 | PawPaw Training Trail | Grass | Interactive tutorial with gates, signs, secrets, hazards, and boss training | Training Dummy Boss |
| 1 | Sunny Grassland Tutorial | Grass | Classic platforming, mystery blocks, simple enemies | Grumpy Garden Mole |
| 2 | City Crossroad Dash | City | Traffic crossing, vehicles, safe islands | Traffic Rat Rider |
| 3 | Rooftop Building Leap | Rooftop | Rooftop gaps, lifts, vertical jumps, falling signs | Rooftop Crow |
| 4 | River and Bridge Crossing | River | Logs, boats, water hazards, broken bridge timing | River Croc |
| 5 | Night Cat Tower Final | Castle | Lava, fire, chase section, hidden route, final challenge | Shadow Cat King |

Every main level ends with a required boss fight. After a boss is defeated, the next level is unlocked and starts automatically. Level 5 completion triggers the WinScene.

## 10. Interactive Tutorial Level: Level 0

Level 0 is a complete interactive tutorial, not a text-only help page.

Tutorial name: PawPaw Training Trail

Tutorial structure:

- 52 total objectives
- 10 objective categories
- 10 signboards
- 6 visual knowledge boards
- 8 progress gates
- 13 trigger zones
- Completion requirement before Level 1 unlocks
- Celebration sequence: "PawPaw is Ready!"

### Tutorial Categories and Objective Counts

| Category | Objective Count | Teaches |
| --- | ---: | --- |
| MOVE | 7 | Walking, running, jumping, landing, gaps, moving platforms, vertical climb |
| COLLECT | 5 | Cat food, food gate, hidden collectible, power-up, extra life |
| ATTACK | 5 | Space throw, target dummy, projectile defeat, stomp defeat, cooldown |
| AVOID | 5 | Spikes, moving hazard, falling object, enemy attack, vehicle |
| POWER-UPS | 5 | Speed, shield, double jump, projectile upgrade, HUD indicator |
| INTERACT | 5 | Mystery block, breakable block, hidden block, secret path, checkpoint |
| EXPLORE | 5 | Cardboard box, cat door, portal tunnel, secret room, shortcut |
| PLATFORMS | 5 | Moving, falling, disappearing, river crossing, rooftop jumping |
| SURVIVE | 5 | Damage, invincibility, shield protection, life-loss hazard, respawn |
| BOSS TRAINING | 5 | Dodge boss attacks, throw fishbones, hit weak point, reduce health, defeat boss |

### Tutorial Knowledge Boards

The tutorial includes visual knowledge boards that preview the elements used throughout the full game.

| Board | Visual Elements Shown |
| --- | --- |
| Level 1: Grassland | Mystery block, walker, spiky enemy, spikes, boss icon |
| Level 2: City Road | Car, bus, bike, traffic enemy, road hazard, city platform, drain, safe island |
| Level 3: Rooftops | Rooftop tiles, rooftop platforms, vent, flying enemy, rooftop enemy, falling sign |
| Power-Up Cat Food | Speed, shield, double jump, projectile upgrade, life, bonus |
| Level 4: River | Water, log platform, boat platform, river enemy, river platform |
| Level 5: Cat Tower | Lava, fire, castle/falling platform, chase orb, boss projectile, boss icon |

These boards satisfy the requirement that the tutorial includes every level's important visual elements for player knowledge before the player encounters them under full difficulty.

### Tutorial Gates

Progress gates prevent the player from accidentally skipping important mechanics. A gate opens only when its required objectives are completed.

Examples:

- The first gate requires movement tasks.
- The collect gate requires food, hidden food, power-up, and extra-life learning.
- The attack gate requires fishbone throwing, cooldown learning, projectile defeat, and stomp defeat.
- The final training area requires platform and survival objectives before boss training.

### Tutorial Completion

Level 0 can only complete when all 52 tutorial objectives have been triggered. After the training boss is defeated and every task is complete:

1. Victory particles play.
2. The message "PawPaw is Ready!" appears.
3. Level 1 unlocks.
4. The game automatically moves into Level 1.

## 11. Gameplay Mechanics

### Platforming

The game supports:

- Solid ground
- Floating platforms
- Moving platforms
- Falling platforms
- Disappearing platforms
- Narrow platforms
- Rooftop platforms
- River floating platforms
- Traffic-safe island platforms

### Projectiles

The fishbone projectile:

- Fires with Space
- Travels in the direction the cat faces
- Has limited range
- Has cooldown
- Hits enemies
- Hits bosses
- Can open boss weak spots
- Can be upgraded by silver cat food
- Shows a burst on impact

### Blocks and Interactions

Block types:

- Solid blocks
- Mystery blocks
- Breakable blocks
- Hidden blocks
- Used-block state after activation

Secret entrances include:

- Cardboard boxes
- Cat doors
- Vents
- Drains
- Tree holes

### Hazards

Hazards include:

- Pits
- Spikes
- Cars
- Buses
- Bikes
- Roads
- Rivers/water
- Falling rocks
- Falling signs
- Fire
- Lava
- Chase hazard
- Boss projectiles

Instant hazards cause life loss. Softer hazards can trigger damage, shield use, invincibility, and respawn learning.

### Checkpoints and Lives

The game includes:

- Lives
- Checkpoints
- Respawn at last checkpoint
- Invincibility after respawn
- Game over when lives reach zero

## 12. UI and Feedback

The UI is designed for retro readability:

- Top HUD panel
- Score, lives, time, level, food, power, shield, fishbone cooldown
- Boss health during boss fights
- Message banner for pickups, checkpoints, damage, and level events
- Tutorial checklist panel during Level 0

Visual feedback includes:

- Cat animations
- Invincibility blink
- Shield aura
- Power-up tint
- Collectible bobbing/spinning animation
- Power-up flashing/bobbing
- Particle bursts
- Screen shake on damage and boss hits
- Boss defeat animation
- Tutorial gate opening animation
- Animated tutorial arrows and icon boards

## 13. Asset Strategy

The project avoids copyrighted art and audio by generating placeholder pixel-art assets through Phaser canvas textures in PreloadScene.

Generated assets include:

- Calico cat frames
- Enemies
- Bosses
- Fishbones
- Cat food
- Power-ups
- Tiles
- Platforms
- Vehicles
- Hazards
- Secret entrances
- Particles

This makes the game self-contained and playable without downloading external files.

## 14. Audio Strategy

Audio is generated using synthesis rather than external files. The system provides original retro-style feedback for gameplay actions and background music moods for different areas.

Implemented audio categories:

- Menu music
- Grassland music
- City music
- Rooftop music
- River music
- Final/boss music
- Jump, throw, collect, power-up, hit, hurt, checkpoint, complete, game-over, and victory sounds

Mute and volume controls are available through UI and key input.

## 15. Data-Driven Level Design

All level content lives in `src/data/levels.js`.

Levels can define:

- Player start
- Width and height
- Timer
- Theme
- Platforms
- Moving platforms
- Falling platforms
- Disappearing platforms
- Blocks
- Hazards
- Moving hazards
- Secret entrances
- Collectibles
- Power-ups
- Enemies
- Checkpoint
- Boss arena
- Boss configuration
- Tutorial metadata for Level 0

This makes the game easy to extend by adding or editing level data.

## 16. Verification Summary

Completed checks:

- Production build passes with `npm run build`.
- Dev server responds locally.
- Tutorial data audit passed:
  - 52 tutorial tasks
  - 10 tutorial categories
  - 10 signboards
  - 6 knowledge boards
  - 8 gates
  - 13 trigger zones
  - 0 task/category mismatches
  - 0 gate/task mismatches
- Tutorial trigger audit passed:
  - 52 tutorial tasks
  - 52 actual completion triggers
  - 0 missing actual triggers

Known note:

- Vite reports a large chunk warning because Phaser is bundled into the main JavaScript output. This is a performance optimization warning, not a startup failure.

## 17. How to Run

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

If that port is busy, Vite will choose the next available port.

Build for production:

```bash
npm run build
```

## 18. How to Add More Levels

1. Open `src/data/levels.js`.
2. Add a new level object with a unique `id`.
3. Define `playerStart`, `platforms`, `collectibles`, `powerUps`, `enemies`, `hazards`, `checkpoint`, `bossArena`, and `boss`.
4. Choose a biome/theme and music key.
5. Add secret entrances or scenario-specific hazards if needed.
6. Ensure the boss can be reached and defeated.
7. Run `npm run build` to verify the project compiles.

## 19. Future Improvement Ideas

The current project is playable and complete as a local Phaser game. Future polish could include:

- Browser automation screenshots for visual regression testing
- Code splitting to remove the Vite large chunk warning
- More boss-specific sprites
- More enemy animation frames
- Extra secret rooms in every level
- Save slots
- Time-trial mode
- More music pattern variation per biome
- Controller support as an optional enhancement

## 20. Final Status

PawPaw Power now includes:

- A complete original retro calico cat platformer identity
- A fully interactive Level 0 tutorial
- Five main adventure levels
- Boss fight at the end of every level
- Automatic level progression
- Data-driven level structure
- Runtime-generated original visuals
- Original synthesized retro audio
- Full menu, pause, game over, win, level select, and localStorage unlock flow

The tutorial has been specifically expanded to teach all major mechanics and visually preview every main level's important gameplay elements before the player enters the campaign.
