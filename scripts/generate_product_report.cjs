#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_NODE_MODULES = process.env.CODEX_RUNTIME_NODE_MODULES
  || process.env.NODE_PATH
  || '/Users/apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const RUNTIME_BIN = process.env.CODEX_RUNTIME_BIN
  || '/Users/apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin';

function runtimeRequire(packageName) {
  try {
    return require(packageName);
  } catch {
    return require(path.join(RUNTIME_NODE_MODULES, packageName));
  }
}

const { chromium } = runtimeRequire('playwright');

const REPORT_DIR = path.join(ROOT, 'reports');
const ASSET_DIR = path.join(REPORT_DIR, 'assets');
const HTML_PATH = path.join(REPORT_DIR, 'pawpaw_power_product_report.html');
const PDF_PATH = path.join(ROOT, 'PawPaw_Power_Product_Management_Report.pdf');
const PORT = 5177;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const pageSize = {
  widthMm: 297,
  heightMm: 210,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeBase64Png(filePath, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
}

async function waitForUrl(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Vite is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureServer() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      return null;
    }
  } catch {
    // Start a local Vite server below.
  }

  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  await waitForUrl(BASE_URL);
  return server;
}

async function captureScreenshots() {
  ensureDir(ASSET_DIR);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 960, height: 540 },
    deviceScaleFactor: 1,
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.log(`[browser:${message.type()}] ${message.text()}`);
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.pawpawGame && window.pawpawGame.scene.isActive('MainMenuScene'));

  const shot = async (name) => {
    const filePath = path.join(ASSET_DIR, `${name}.png`);
    await page.screenshot({ path: filePath });
    return `assets/${name}.png`;
  };

  const screenshots = {};
  screenshots.mainMenu = await shot('screen_main_menu');

  screenshots.level1 = await captureLevel(page, 1, 1620, 300, 'screen_level1_grassland');
  screenshots.level1Boss = await captureLevel(page, 1, 3750, 350, 'screen_level1_boss', true);
  screenshots.level2 = await captureLevel(page, 2, 1420, 360, 'screen_level2_city');
  screenshots.level2Boss = await captureLevel(page, 2, 4700, 360, 'screen_level2_boss', true);
  screenshots.level3 = await captureLevel(page, 3, 3050, 270, 'screen_level3_rooftop');
  screenshots.level3Boss = await captureLevel(page, 3, 5100, 300, 'screen_level3_boss', true);
  screenshots.level4 = await captureLevel(page, 4, 1580, 350, 'screen_level4_river');
  screenshots.level4Boss = await captureLevel(page, 4, 5400, 360, 'screen_level4_boss', true);
  screenshots.level5 = await captureLevel(page, 5, 2850, 280, 'screen_level5_tower');
  screenshots.level5Boss = await captureLevel(page, 5, 5460, 320, 'screen_level5_boss', true);

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.pawpawGame && window.pawpawGame.scene.isActive('MainMenuScene'));

  screenshots.tutorialStart = await captureLevel(page, 0, 260, 360, 'screen_level0_start');
  screenshots.tutorialKnowledge = await captureLevel(page, 0, 4580, 270, 'screen_level0_knowledge');
  screenshots.tutorialPower = await captureLevel(page, 0, 5840, 360, 'screen_level0_powerups');
  screenshots.tutorialExplore = await captureLevel(page, 0, 7700, 270, 'screen_level0_explore');
  screenshots.tutorialBoss = await captureLevel(page, 0, 9360, 330, 'screen_level0_boss_training', true);

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.pawpawGame && window.pawpawGame.scene.isActive('MainMenuScene'));

  await page.mouse.click(480, 340);
  await page.waitForTimeout(350);
  screenshots.controls = await shot('screen_controls');

  await startScene(page, 'TutorialScene');
  await page.waitForTimeout(700);
  screenshots.tutorialScreen = await shot('screen_tutorial_help');

  await page.evaluate(() => window.localStorage.setItem('calicoQuestUnlockedLevel', '5'));
  await startScene(page, 'LevelSelectScene');
  await page.waitForTimeout(700);
  screenshots.levelSelect = await shot('screen_level_select');

  await startScene(page, 'GameOverScene', { score: 12400 });
  await page.waitForTimeout(500);
  screenshots.gameOver = await shot('screen_game_over');

  await startScene(page, 'WinScene', { score: 84200, timeBonus: 3120 });
  await page.waitForTimeout(500);
  screenshots.win = await shot('screen_win');

  const textureKeys = [
    'cat-idle-0', 'cat-run-0', 'cat-jump', 'cat-fall', 'shield-bubble', 'fishbone', 'fishbone-strong',
    'food-pink-0', 'food-cyan-0', 'food-orange-0',
    'power-speed', 'power-shield', 'power-double', 'power-projectile', 'power-life', 'power-bonus',
    'enemy-walker-0', 'enemy-flyer-0', 'enemy-jumper-0', 'enemy-spiky', 'enemy-traffic',
    'enemy-river-0', 'enemy-rooftop-0', 'boss-0', 'boss-projectile',
    'block-mystery', 'block-breakable', 'block-hidden', 'block-used',
    'checkpoint', 'goal', 'secret-box', 'secret-catdoor', 'secret-tree', 'secret-drain', 'secret-vent',
    'platform-grass', 'platform-city', 'platform-rooftop', 'platform-river', 'platform-castle',
    'safe-island', 'log-platform', 'boat-platform',
    'hazard-spikes', 'hazard-pit', 'hazard-road', 'hazard-water', 'hazard-fire', 'hazard-lava',
    'hazard-rock', 'hazard-sign', 'vehicle-car', 'vehicle-bus', 'vehicle-bike', 'chase-orb',
    'tile-grass', 'tile-city', 'tile-rooftop', 'tile-river', 'tile-castle',
  ];

  const textures = await page.evaluate((keys) => {
    const game = window.pawpawGame;
    const result = {};
    keys.forEach((key) => {
      const texture = game.textures.get(key);
      const source = texture?.getSourceImage?.();
      if (source?.toDataURL) {
        result[key] = source.toDataURL('image/png');
      }
    });
    return result;
  }, textureKeys);

  const textureAssets = {};
  Object.entries(textures).forEach(([key, dataUrl]) => {
    const fileName = `texture_${key.replace(/[^a-z0-9]+/gi, '_')}.png`;
    writeBase64Png(path.join(ASSET_DIR, fileName), dataUrl);
    textureAssets[key] = `assets/${fileName}`;
  });

  await browser.close();
  return { screenshots, textureAssets };
}

async function startScene(page, sceneKey, data = {}) {
  await page.evaluate(({ sceneKey }) => {
    const game = window.pawpawGame;
    ['MainMenuScene', 'TutorialScene', 'LevelSelectScene', 'GameScene', 'PauseScene', 'GameOverScene', 'WinScene']
      .forEach((key) => game.scene.stop(key));
    if (sceneKey === 'GameScene') {
      game.registry.remove('runState');
    }
  }, { sceneKey });
  await page.waitForTimeout(80);
  await page.evaluate(({ sceneKey, data }) => {
    const game = window.pawpawGame;
    game.scene.start(sceneKey, data);
  }, { sceneKey, data });
  await page.waitForFunction((key) => window.pawpawGame.scene.isActive(key), sceneKey);
}

async function captureLevel(page, levelId, x, y, name, bossMode = false) {
  await startScene(page, 'GameScene', { levelId });
  await page.waitForFunction(() => {
    const scene = window.pawpawGame.scene.getScene('GameScene');
    return scene?.player && scene?.level;
  });
  await page.waitForFunction((expectedLevelId) => {
    const scene = window.pawpawGame.scene.getScene('GameScene');
    return scene?.level?.id === expectedLevelId;
  }, levelId);
  await page.waitForTimeout(500);
  await page.evaluate(({ x, y, bossMode }) => {
    const scene = window.pawpawGame.scene.getScene('GameScene');
    scene.cameras.main.stopFollow();
    scene.player.setPosition(x, y);
    scene.player.setVelocity(0, 0);
    scene.player.setInvincible(1500);
    scene.cameras.main.centerOn(x, y);
    if (bossMode && scene.boss) {
      scene.bossMusicStarted = true;
      scene.boss.setPosition(scene.level.boss.x, scene.level.boss.y);
      scene.boss.setVelocity(0, 0);
      scene.boss.hp = Math.max(1, scene.boss.hp);
      scene.ui?.update(scene.state, scene.player, scene.levelTimer, scene.boss);
    }
  }, { x, y, bossMode });
  await page.waitForTimeout(350);
  const filePath = path.join(ASSET_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  return `assets/${name}.png`;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function img(src, alt, className = 'shot') {
  return `<figure class="${className}"><img src="${esc(src)}" alt="${esc(alt)}"><figcaption>${esc(alt)}</figcaption></figure>`;
}

function imageGrid(items) {
  return `<div class="image-grid">${items.map((item) => img(item.src, item.caption, 'grid-shot')).join('')}</div>`;
}

function textureImg(assets, key, label) {
  const src = assets[key];
  return `<figure class="texture"><img src="${esc(src)}" alt="${esc(label || key)}"><figcaption>${esc(label || key)}</figcaption></figure>`;
}

function assetGrid(assets, items) {
  return `<div class="asset-grid">${items.map(([key, label]) => textureImg(assets, key, label)).join('')}</div>`;
}

function cardGrid(items) {
  return `<div class="card-grid">${items.map((item) => `
    <div class="card">
      <h4>${esc(item.title)}</h4>
      <p>${esc(item.body)}</p>
    </div>`).join('')}</div>`;
}

function metricCards(items) {
  return `<div class="metric-grid">${items.map((item) => `
    <div class="metric">
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value)}</strong>
      <small>${esc(item.note)}</small>
    </div>`).join('')}</div>`;
}

function simpleTable(headers, rows) {
  return `<table class="report-table">
    <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function flowDiagram(nodes) {
  return `<div class="flow">${nodes.map((node, index) => `
    <div class="flow-node">${esc(node)}</div>${index < nodes.length - 1 ? '<div class="flow-arrow">-&gt;</div>' : ''}
  `).join('')}</div>`;
}

function levelMapSvg(level) {
  const width = 840;
  const height = 230;
  const scaleX = width / level.width;
  const yScale = 0.35;
  const platforms = (level.platforms || []).map((p) => {
    const x = p.x * scaleX;
    const y = 30 + p.y * yScale;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, p.w * scaleX).toFixed(1)}" height="${Math.max(4, p.h * yScale).toFixed(1)}" rx="2" fill="#26f7d0" opacity="0.76"/>`;
  }).join('');
  const hazards = (level.hazards || []).map((h) => {
    const x = h.x * scaleX;
    const y = 30 + h.y * yScale;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, h.w * scaleX).toFixed(1)}" height="${Math.max(4, h.h * yScale).toFixed(1)}" rx="2" fill="#ff2f8b" opacity="0.9"/>`;
  }).join('');
  const checkpoint = level.checkpoint ? `<circle cx="${(level.checkpoint.x * scaleX).toFixed(1)}" cy="${(30 + level.checkpoint.y * yScale).toFixed(1)}" r="8" fill="#ffe66d"/>` : '';
  const boss = level.bossArena ? `<rect x="${(level.bossArena.minX * scaleX).toFixed(1)}" y="28" width="${((level.bossArena.maxX - level.bossArena.minX) * scaleX).toFixed(1)}" height="${height - 42}" fill="none" stroke="#b56cff" stroke-width="3" stroke-dasharray="10 8"/>` : '';
  return `<svg class="level-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(level.name)} level map">
    <defs>
      <linearGradient id="gridGlow${level.id}" x1="0" x2="1">
        <stop offset="0" stop-color="#15172d"/>
        <stop offset="1" stop-color="#241245"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#gridGlow${level.id})"/>
    ${Array.from({ length: 12 }).map((_, i) => `<line x1="${i * 76}" y1="0" x2="${i * 76}" y2="${height}" stroke="#5d6cff" stroke-opacity="0.16"/>`).join('')}
    ${boss}${platforms}${hazards}${checkpoint}
    <circle cx="${(level.playerStart.x * scaleX).toFixed(1)}" cy="${(30 + level.playerStart.y * yScale).toFixed(1)}" r="7" fill="#50f5ff"/>
    <text x="18" y="24" fill="#fff" font-size="18">${esc(level.id)} - ${esc(level.shortName || level.name)}</text>
  </svg>`;
}

function keyboardDiagram() {
  return `<div class="keyboard">
    <div class="key">LEFT<br><small>move</small></div>
    <div class="key">RIGHT<br><small>move</small></div>
    <div class="key hot">UP<br><small>jump</small></div>
    <div class="key space hot">SPACE<br><small>throw fishbone</small></div>
    <div class="key">P<br><small>pause</small></div>
    <div class="key">M<br><small>mute</small></div>
    <div class="key">ESC<br><small>back / pause</small></div>
  </div>`;
}

function roadmap() {
  const phases = [
    'Core prototype', 'Movement polish', 'Collectibles and power-ups', 'Enemy and boss systems',
    'Level design', 'UI and audio', 'Testing and polish', 'Portfolio release',
  ];
  return `<div class="roadmap">${phases.map((phase, index) => `
    <div class="road-phase"><span>Phase ${index + 1}</span><strong>${esc(phase)}</strong></div>
  `).join('')}</div>`;
}

function riskMatrix() {
  const risks = [
    ['Scope creep', 'Medium', 'High', 'Preserve five-level scope and defer online, multiplayer, analytics, and cosmetic systems to roadmap.'],
    ['Poor movement feel', 'Medium', 'High', 'Tune acceleration, coyote time, jump buffering, and landing feedback.'],
    ['Boss fights too hard', 'Medium', 'High', 'Use visible HP, attack windows, stun reactions, and tutorial training.'],
    ['Levels feel repetitive', 'Medium', 'Medium', 'Use scenario shifts: traffic, rooftops, river, tower, chase, boss arenas.'],
    ['Visual inconsistency', 'Low', 'Medium', 'Use generated pixel-art palette and repeated UI visual language.'],
    ['Audio overload', 'Medium', 'Medium', 'Keep chiptune loops short, balance sound layers, support mute, and reserve boss sounds for key beats.'],
    ['UI clutter', 'Medium', 'Medium', 'Keep HUD compact and tutorial checklist focused on active section.'],
    ['Save bugs', 'Low', 'High', 'Keep localStorage unlock state small and test restart/progression paths.'],
    ['Unclear tutorial', 'Medium', 'High', 'Use gates, checkmarks, signs, and knowledge boards.'],
    ['Performance issues', 'Low', 'High', 'Use lightweight generated assets and avoid heavy downloaded media.'],
  ];
  return simpleTable(['Risk', 'Probability', 'Impact', 'Mitigation'], risks);
}

function kpiDashboard() {
  return `<div class="dashboard">
    ${metricCards([
      { label: 'Tutorial completion', value: 'Target 85%+', note: 'Players understand core controls and gates.' },
      { label: 'Level completion', value: 'Target 70%+', note: 'Campaign pacing remains fair.' },
      { label: 'Boss defeat rate', value: 'Target 60%+', note: 'Bosses are challenging but readable.' },
      { label: 'Secret discovery', value: 'Target 25%+', note: 'Exploration rewards are visible and tempting.' },
      { label: 'Power-up usage', value: 'Target 3+/level', note: 'Abilities are visible and worth collecting.' },
      { label: 'Fishbone usage', value: 'Target 5+/level', note: 'Projectile mechanic remains meaningful.' },
      { label: 'FPS stability', value: 'Target 55-60', note: 'Desktop browser performance remains smooth.' },
      { label: 'Bug count', value: 'Trend down', note: 'QA pass closes high-severity blockers.' },
      { label: 'Satisfaction', value: 'Target 4/5', note: 'Portfolio reviewers and players rate clarity highly.' },
    ])}
  </div>`;
}

function scoreDashboard() {
  return `<div class="dashboard">
    ${metricCards([
      { label: 'Cat food', value: '+100', note: 'Baseline pickup score and route guidance.' },
      { label: 'Enemy defeat', value: '+250', note: 'Reward for stomp or fishbone mastery.' },
      { label: 'Boss hit', value: '+500', note: 'Progress feedback during arena fights.' },
      { label: 'Secret found', value: '+1,000', note: 'Exploration and hidden-route reward.' },
      { label: 'Level clear', value: '+5,000', note: 'Completion bonus after boss defeat.' },
      { label: 'Time bonus', value: 'Timer x 20', note: 'Fast clear incentive for replay.' },
    ])}
  </div>`;
}

function architectureDiagram() {
  return `<div class="architecture">
    <div class="arch-row"><div>Input</div><span>keyboard</span><div>Player</div><span>movement / state</span><div>Physics</div></div>
    <div class="arch-row"><div>Level Data</div><span>spawns</span><div>GameScene</div><span>collisions</span><div>Objects</div></div>
    <div class="arch-row"><div>AudioManager</div><span>feedback</span><div>UIManager</div><span>HUD</span><div>Player Response</div></div>
    <div class="arch-row"><div>LevelManager</div><span>unlock/save</span><div>localStorage</div><span>progress</span><div>Next Level</div></div>
  </div>`;
}

function featureHierarchy() {
  return `<div class="hierarchy">
    <div class="root">PawPaw Power</div>
    <div class="branch">
      <div>Core Play<br><small>run, jump, throw</small></div>
      <div>Progression<br><small>levels, bosses, unlocks</small></div>
      <div>Reward<br><small>cat food, secrets, score</small></div>
      <div>Systems<br><small>audio, HUD, saves</small></div>
      <div>Polish<br><small>particles, shake, animation</small></div>
    </div>
  </div>`;
}

function powerUpDetailTable() {
  return simpleTable(['Power-up', 'Duration', 'HUD indicator', 'Sound cue', 'Visual effect', 'Source / placement'], [
    ['Red cat food - Speed', '8 seconds', 'SPEED timer', 'Fast rising pickup chirp', 'Red-orange tint and speed trail', 'Mystery blocks, risky routes, tutorial demo'],
    ['Blue cat food - Shield', 'One protected hit until used', 'SHIELD ON', 'Soft shield chime', 'Blue bubble, glow, and shield pop', 'Tutorial, risky hazards, pre-boss safety'],
    ['Purple cat food - Double jump', '10 seconds', 'DOUBLE timer', 'High shimmer cue', 'Purple aura and second-jump burst', 'Vertical climbs, rooftop routes, secret paths'],
    ['Gold cat food - Bonus score', 'Instant', 'Score burst', 'Bright bonus sparkle', 'Gold particle burst', 'Hidden clusters, bonus rooms, risky detours'],
    ['Green cat food - Extra life', 'Instant +1 life', 'Lives counter update', 'Extra-life jingle', 'Green flash and heart-like pulse', 'Rare hidden rooms and high-risk rewards'],
    ['Silver cat food - Bone+', '10 seconds', 'BONE+ timer', 'Metallic power cue', 'Stronger fishbone with brighter trail', 'Boss preparation, mystery blocks, secret rewards'],
  ]);
}

function levelDetail(levelId) {
  const details = {
    1: {
      narrative: 'This first main level teaches classic platforming in a sunny grassland: basic movement, jump arcs, food trails, mystery blocks, breakable blocks, simple walkers, a spiky avoid-only enemy, a tree-hole secret path, and the Grumpy Garden Mole boss.',
      skill: 'Basic movement, safe landings, block discovery, first fishbone timing, and easy boss pattern reading.',
      inventory: [
        ['Visual theme', 'Bright grassland, grassy platforms, tree-hole secret, warm tutorial-like pacing'],
        ['Collectibles / power-ups', 'Cat food trails, speed boost, double jump, shield and Bone+ rewards from blocks'],
        ['Enemies / hazards', 'Walkers, flyer, jumper, spiky enemy, spikes, pit'],
        ['Secret / checkpoint', 'Tree-hole bonus path and mid-level checkpoint'],
        ['Completion sequence', 'Defeat Grumpy Garden Mole, award bonus, unlock and move to City Crossroad'],
      ],
    },
    2: {
      narrative: 'City Crossroad changes the core loop into road timing. PawPaw crosses sidewalks, roads, safe islands, moving city lifts, and traffic lanes while avoiding cars, buses, bikes, traffic enemies, and the Traffic Rat Rider boss.',
      skill: 'Traffic observation, safe-zone timing, moving platform patience, and fishbone attacks during boss slowdown windows.',
      inventory: [
        ['Visual theme', 'City road, sidewalks, safe islands, drain shortcut, busy traffic lanes'],
        ['Collectibles / power-ups', 'Food trails across safe islands, speed, shield, bonus, double jump and Bone+'],
        ['Enemies / hazards', 'Traffic enemies, flyer, spiky enemy, cars, buses, bikes, road gaps'],
        ['Secret / checkpoint', 'Storm-drain shortcut and mid-level checkpoint'],
        ['Completion sequence', 'Defeat Traffic Rat Rider, calculate time bonus, unlock and move to Rooftop Building'],
      ],
    },
    3: {
      narrative: 'Rooftop Building emphasizes height and long gaps. PawPaw jumps across rooftops, balconies, signs, water tanks, AC units, vents, narrow ledges, and moving lifts while flyers and rooftop blockers pressure jumps.',
      skill: 'Long jumps, vertical climb routing, air control, lift timing, vent exploration, and projectile timing against aerial threats.',
      inventory: [
        ['Visual theme', 'Rooftops, skyline, balconies, rooftop signs, vents, AC units, and water-tank route props'],
        ['Collectibles / power-ups', 'Airborne food arcs, double jump support, Bone+ and hidden score clusters'],
        ['Enemies / hazards', 'Flying enemies, rooftop blockers, falling signs, deep building gaps'],
        ['Secret / checkpoint', 'Rooftop vent bonus room and mid-level checkpoint'],
        ['Completion sequence', 'Defeat Rooftop Crow, award boss bonus, unlock and move to River and Bridge'],
      ],
    },
    4: {
      narrative: 'River and Bridge makes water the primary threat. PawPaw crosses broken bridges, floating logs, moving boats, timed platforms, and river platforms while avoiding water, river enemies, and the River Croc boss.',
      skill: 'Moving platform timing, instant-water hazard awareness, boat/log positioning, and attacking only when the croc weak point opens.',
      inventory: [
        ['Visual theme', 'River water, logs, boats, broken bridge segments, hidden river route'],
        ['Collectibles / power-ups', 'Food trails over logs and boats, shield, double jump, bonus and life rewards'],
        ['Enemies / hazards', 'River enemies, jumping fish behavior, water, broken bridge gaps, timed platforms'],
        ['Secret / checkpoint', 'Hidden river route and bridge checkpoint'],
        ['Completion sequence', 'Defeat River Croc, convert remaining time to score, unlock and move to Night Cat Tower'],
      ],
    },
    5: {
      narrative: 'Night Cat Tower is the final escalation. It combines hard platforming, fire, lava, moving and falling platforms, hidden paths, chase pressure, stronger enemies, boss projectiles, summons, and the Shadow Cat King.',
      skill: 'Final hazard mastery, quick recovery, power-up planning, fishbone discipline, and multi-phase boss endurance.',
      inventory: [
        ['Visual theme', 'Night fortress tower, lava/fire, dark projectiles, hidden tower routes'],
        ['Collectibles / power-ups', 'High-risk food, shield, Bone+, rare life, and boss preparation rewards'],
        ['Enemies / hazards', 'Stronger enemies, summons, lava, fire, falling platforms, chase hazard, boss shots'],
        ['Secret / checkpoint', 'Hidden tower path and final checkpoint before boss arena'],
        ['Completion sequence', 'Defeat Shadow Cat King, trigger victory particles and WinScene'],
      ],
    },
  };
  return details[levelId];
}

function levelInventoryTable() {
  return simpleTable(['Level', 'Music mood', 'Required level elements', 'Secret / checkpoint', 'Completion gate'], [
    ['1 Grassland', 'Bright grassland chiptune', 'Classic platforms, food trails, mystery blocks, walkers, flyer, jumper, spiky, spikes, pit, Mole boss', 'Tree-hole bonus path and checkpoint', 'Boss defeat unlocks Level 2'],
    ['2 City Crossroad', 'Fast city-road rhythm', 'Cars, buses, bikes, safe islands, sidewalks, city lift, traffic enemies, road hazards, Rat Rider boss', 'Storm-drain shortcut and checkpoint', 'Boss defeat unlocks Level 3'],
    ['3 Rooftop Building', 'Airy rooftop melody', 'Rooftops, balconies, signs, water tanks, AC units, vents, moving lifts, flyers, rooftop enemies, Crow boss', 'Rooftop vent bonus room and checkpoint', 'Boss defeat unlocks Level 4'],
    ['4 River and Bridge', 'Flowing river tension', 'Floating logs, moving boats, broken bridges, timed platforms, river enemies, water hazard, Croc boss', 'Hidden river route and checkpoint', 'Boss defeat unlocks Level 5'],
    ['5 Night Cat Tower', 'Dark final/boss intensity', 'Lava, fire, moving/falling platforms, hidden paths, stronger enemies, chase pressure, Shadow Cat King', 'Hidden tower path and final checkpoint', 'Boss defeat triggers WinScene'],
  ]);
}

function bossDetail(name) {
  const details = {
    'Grumpy Garden Mole': ['Ground patrol with pop-up movement', 'Dirt balls and short jumps', 'Fishbones create safe damage windows; weak spot can be stomped', 'Intro boss: teaches boss HP, dodge timing, and first projectile use'],
    'Traffic Rat Rider': ['Scooter passes across the arena and changes speed', 'Road-lane pressure, scooter charges, and timing windows', 'Fishbone hits when the rider slows; player dodges traffic-style movement', 'Timing boss: tests road awareness after Level 2'],
    'Rooftop Crow': ['Wave flight above rooftops and ledges', 'Drops signs/objects and pressures vertical jumps', 'Forward/upward fishbone timing is required during low flight windows', 'Aerial boss: tests long-jump positioning and projectile aim'],
    'River Croc': ['Surfaces, dives, and moves around floating platforms', 'Water shots, lunges, and unsafe platform pressure', 'Fishbones only matter when the weak point opens; some windows allow stomp follow-up', 'Positioning boss: tests river timing and safe platform choice'],
    'Shadow Cat King': ['Fast multi-phase movement with increasing speed', 'Dark paw projectiles, jumps, summons, and final tower pressure', 'Fishbone damage, dodging, power-up timing, and weak-window jumps are all required', 'Final boss: multi-phase climax and campaign completion'],
  };
  return details[name] || ['Movement pattern', 'Attack pattern', 'Damage method', 'Difficulty role'];
}

function expandedKpiTable() {
  return simpleTable(['Metric', 'Definition', 'Decision Supported'], [
    ['Level completion rate', 'Percent of players completing each main level.', 'Difficulty tuning and level pacing.'],
    ['Tutorial completion rate', 'Percent of players finishing Level 0.', 'Onboarding clarity.'],
    ['Boss defeat rate', 'Percent of boss attempts ending in victory.', 'Boss pattern readability.'],
    ['Average session length', 'Time from game start to exit.', 'Engagement pacing.'],
    ['Retry rate', 'Attempts after failure.', 'Challenge motivation and frustration risk.'],
    ['Secret discovery rate', 'Players finding hidden rooms, blocks, or routes.', 'Exploration value.'],
    ['Power-up usage rate', 'Power-ups collected and used per level.', 'Ability visibility and placement quality.'],
    ['Fishbone usage rate', 'Throws per level and per boss fight.', 'Projectile relevance.'],
    ['Player death locations', 'Coordinates or sections where lives are lost.', 'Hazard balance and unclear routes.'],
    ['FPS/performance stability', 'Frame-rate consistency during gameplay.', 'Technical quality.'],
    ['Bug count', 'Open issues by severity.', 'Release readiness.'],
    ['User satisfaction score', 'Playtest or reviewer rating.', 'Portfolio and product experience quality.'],
  ]);
}

function systemResponsibilitiesTable() {
  return simpleTable(['System', 'Primary responsibility', 'Key interactions'], [
    ['Phaser engine', 'Scene loop, rendering, Arcade physics, camera, input', 'All scenes and game objects'],
    ['Scene structure', 'Boot, preload, menu, level select, gameplay, pause, game over, win', 'Game flow and transitions'],
    ['Player system', 'Movement, states, coyote time, jump buffer, throwing, damage', 'Input, collisions, UI, audio'],
    ['Enemy system', 'Walker, flyer, jumper, spiky, traffic, river, rooftop behaviors', 'Player collision, projectiles, score'],
    ['Boss system', 'HP, phases, projectiles, stun, weak windows, defeat events', 'GameScene, UIManager, AudioManager'],
    ['Projectile system', 'Fishbone spawn, cooldown, range, impact, upgrade state', 'Player, enemies, bosses, particles'],
    ['Collectible system', 'Cat food pickup, scoring, hidden clusters', 'Score, tutorial gates, particles'],
    ['Power-up system', 'Speed, shield, double jump, bonus, life, Bone+', 'Player state, HUD, audio, visuals'],
    ['LevelManager', 'Level progression, unlocks, localStorage persistence', 'Level select, GameScene, next-level flow'],
    ['AudioManager', 'Web Audio SFX, chiptune music, mute and volume', 'Scenes, combat, pickups, menus'],
    ['UIManager', 'HUD, boss health, active power, cooldown, messages', 'Game state and player state'],
    ['Collision/state management', 'Overlaps, hazards, respawn, checkpoints, win/fail state', 'GameScene and gameplay objects'],
  ]);
}

function developmentDetailTable() {
  return simpleTable(['Area', 'Detailed documentation'], [
    ['Scene lifecycle', 'Boot configures game startup, Preload generates assets, menus route the player, GameScene creates and updates level content, terminal scenes close the loop.'],
    ['Collision setup', 'GameScene creates solid platforms, moving bodies, hazard overlaps, collectible overlaps, projectile overlaps, checkpoint triggers, tunnel triggers, and boss arena logic.'],
    ['Physics setup', 'Arcade gravity drives the player, enemies, and objects; moving/falling/disappearing platforms are updated from level data.'],
    ['Audio setup', 'AudioManager synthesizes original Web Audio SFX and looping chiptune-style music so the project needs no copyrighted files.'],
    ['Level data setup', 'levels.js defines player start, platforms, enemies, collectibles, power-ups, hazards, checkpoint, boss arena, boss config, tutorial objectives, and theme.'],
    ['Testing strategy', 'Play through Level 0 gates, each boss, instant hazards, power-ups, localStorage unlocks, menus, mute, game over, and final win state.'],
    ['Debugging strategy', 'Use browser console, Phaser scene state, capture screenshots, and direct scene starts to inspect levels and boss arenas.'],
    ['Performance optimization', 'Keep assets canvas-generated, avoid large downloads, reuse textures, constrain particles, and target stable desktop frame rate.'],
    ['Screenshot capture', 'Playwright positions the camera in the running game and captures title, tutorial, level, boss, menu, game over, and win screens.'],
    ['PDF generation', 'The generator builds themed HTML pages from real screenshots and exports to PDF with print backgrounds enabled.'],
  ]);
}

async function buildReportHtml(assets) {
  const levelsModule = await import(path.join(ROOT, 'src/data/levels.js'));
  const levels = levelsModule.levels;
  const mainLevels = levels.filter((level) => level.id > 0);
  const tutorial = levels.find((level) => level.id === 0);
  const pages = [];

  function addPage(title, kicker, body, visual = '', options = {}) {
    pages.push({
      title,
      kicker,
      body,
      visual,
      section: options.section || title,
      className: options.className || '',
      divider: options.divider || false,
    });
  }

  function addDivider(title, subtitle) {
    addPage(title, 'SECTION DIVIDER', `<p>${esc(subtitle)}</p>`, '', {
      section: title,
      className: 'divider-page',
      divider: true,
    });
  }

  addPage('PawPaw Power', 'Product Management Business Report',
    `<p class="lead">A 16-bit calico cat platformer with retro gameplay, boss battles, collectibles, and scenario-based level design.</p>
     <div class="cover-meta"><span>Portfolio Case Study</span><span>Original Game Project</span><span>Cyberpunk Business Report Theme</span></div>`,
    img(assets.screenshots.mainMenu, 'Game title and main menu screenshot', 'hero-shot'),
    { section: 'Cover', className: 'cover-page' });

  addPage('Table of Contents', 'REPORT MAP',
    '<div id="toc-one"></div>',
    '<div class="toc-visual">Product Strategy<br>Gameplay Systems<br>Technical Architecture<br>Roadmap<br>Appendix</div>',
    { section: 'Table of Contents', className: 'toc-page' });

  addPage('Table of Contents Continued', 'REPORT MAP',
    '<div id="toc-two"></div>',
    featureHierarchy(),
    { section: 'Table of Contents', className: 'toc-page' });

  addPage('Table of Contents III', 'REPORT MAP',
    '<div id="toc-three"></div>',
    roadmap(),
    { section: 'Table of Contents', className: 'toc-page' });

  addPage('Table of Contents IV', 'REPORT MAP',
    '<div id="toc-four"></div>',
    kpiDashboard(),
    { section: 'Table of Contents', className: 'toc-page' });

  addPage('Table of Contents V', 'REPORT MAP',
    '<div id="toc-five"></div>',
    assetGrid(assets.textureAssets, [
      ['cat-idle-0', 'Hero'], ['fishbone', 'Throw'], ['food-pink-0', 'Collect'],
      ['power-shield', 'Shield'], ['enemy-flyer-0', 'Enemy'], ['boss-0', 'Boss'],
      ['checkpoint', 'Save'], ['goal', 'Win'],
    ]),
    { section: 'Table of Contents', className: 'toc-page' });

  addDivider('Product Context', 'Executive framing, product definition, vision, strategy, and measurable goals.');

  addPage('Executive Summary', '01',
    `<p>PawPaw Power is an original browser-based 16-bit retro platformer centered on a cute calico cat hero. The product delivers a compact but complete adventure loop: players learn the controls, master movement, collect cat food, throw fishbones, avoid hazards, discover secrets, fight bosses, and unlock the next level.</p>
     <p>The strongest product value is its completeness. It is not a small demo; it includes a tutorial, five scenario-led levels, a boss at the end of every level, power-ups, enemies, checkpoints, audio, UI, score, timer, local progress, and game-over/win flows.</p>
     <p>This report documents the game as a Product Management portfolio case study, using a premium cyberpunk visual system while keeping the product being documented clearly rooted in retro cat-platformer design.</p>`,
    img(assets.screenshots.tutorialStart, 'Level 0 tutorial gameplay screenshot'));

  addPage('Executive Product Snapshot', '01',
    `<p>The project demonstrates product thinking across player onboarding, core loop design, feature prioritization, risk reduction, technical scope control, and polish. Level 0 acts as an onboarding funnel, while the five main levels act as escalating scenario-based skill tests.</p>
     ${metricCards([
      { label: 'Playable levels', value: '6', note: 'Level 0 plus five main levels' },
      { label: 'Tutorial objectives', value: '52', note: 'All major mechanics taught interactively' },
      { label: 'Boss fights', value: '6', note: 'Training boss plus five level bosses' },
      { label: 'Power-ups', value: '6', note: 'Speed, shield, double, bonus, life, bone+' },
    ])}`,
    img(assets.screenshots.levelSelect, 'Unlocked level select screen'));

  addPage('Product Overview', '02',
    `<p>PawPaw Power is a side-scrolling platformer for desktop browsers. It uses keyboard-only input, generated pixel art, and arcade physics to create a nostalgic but original cat-themed adventure.</p>
     ${simpleTable(['Attribute', 'Definition'], [
      ['Game name', 'PawPaw Power'],
      ['Genre', '16-bit retro side-scrolling platformer'],
      ['Main character', 'Cute calico cat hero'],
      ['Core input', 'Left/Right, Up Arrow, Space'],
      ['Primary action', 'Run, jump, collect, throw fishbones, beat bosses'],
      ['Progression', 'Tutorial plus five boss-gated levels'],
     ])}`,
    img(assets.screenshots.mainMenu, 'Main menu product identity screenshot'));

  addPage('Product Summary Card', '02',
    `<p>The player promise is simple: learn quickly, move smoothly, collect satisfying rewards, use fishbones with intent, and complete visually distinct boss worlds.</p>
     ${cardGrid([
      { title: 'Product Promise', body: 'A charming retro platformer where every level teaches or tests a new scenario.' },
      { title: 'Core Differentiator', body: 'Cat-themed mechanics transform familiar platforming into a distinct original identity.' },
      { title: 'Experience Goal', body: 'Responsive arcade movement, readable hazards, satisfying collectibles, and memorable bosses.' },
      { title: 'Portfolio Value', body: 'Shows product strategy, scope discipline, technical structure, UX onboarding, and feature polish.' },
    ])}`,
    assetGrid(assets.textureAssets, [
      ['cat-idle-0', 'Calico hero'], ['fishbone', 'Fishbone'], ['food-pink-0', 'Cat food'],
      ['power-projectile', 'Bone+'], ['boss-0', 'Boss'], ['checkpoint', 'Checkpoint'],
    ]));

  addPage('Product Vision', '03',
    `<p>The long-term vision is a polished retro adventure that feels approachable on the first screen and skillful by the final boss. PawPaw should feel expressive, readable, and responsive, with every animation and sound cue reinforcing the player's understanding of what just happened.</p>
     <p>The calico identity matters because it gives the project an immediate emotional hook. Cat food, fishbones, cardboard boxes, cat doors, drains, rooftops, and tower bosses create a playful design language that supports both mechanics and worldbuilding.</p>
     <p>The 16-bit pixel style keeps the scope controlled while giving the game a strong visual signature. Level variety keeps the campaign from becoming one repeated platforming challenge.</p>`,
    img(assets.screenshots.level5, 'Final tower visual identity screenshot'));

  addPage('Product Strategy', '04',
    `<p>The strategy is to focus on a tight, portfolio-ready slice of a complete game. The project does not attempt fake market claims or monetization. Instead, it emphasizes product clarity, end-to-end feature completeness, onboarding, and polish.</p>
     ${cardGrid([
      { title: 'Positioning', body: 'Original retro cat platformer with full campaign flow and PM case study documentation.' },
      { title: 'Core Promise', body: 'A player can learn, progress, improve, and complete a full boss-driven adventure.' },
      { title: 'Feature Depth', body: 'Each mechanic has player feedback, scoring, audio, and UI support.' },
      { title: 'Replayability', body: 'Secrets, score chasing, hidden paths, and faster clears reward repeat play.' },
    ])}`,
    featureHierarchy());

  addPage('Design Pillars', '04',
    `<p>The product strategy is organized around five design pillars. These pillars give the project a decision framework for gameplay, scope, UI, and polish.</p>
     ${simpleTable(['Pillar', 'Product Meaning', 'Design Expression'], [
      ['Responsive', 'Controls should feel immediate and fair.', 'Coyote time, jump buffer, acceleration, landing effects.'],
      ['Readable', 'Players should understand hazards and goals.', 'HUD, signs, icons, boss HP, tutorial gates.'],
      ['Cat-themed', 'Every core object should support the identity.', 'Cat food, fishbones, boxes, cat doors, paw gates.'],
      ['Varied', 'Each level should change the scenario.', 'Traffic, rooftops, river, tower, chase, boss arenas.'],
      ['Complete', 'The project should feel finished.', 'Menus, saves, audio, game over, win, report, roadmap.'],
    ])}`,
    img(assets.screenshots.tutorialKnowledge, 'Tutorial knowledge boards preview later level elements'));

  addPage('Portfolio Value Strategy', '04',
    `<p>For a Product Manager portfolio, PawPaw Power demonstrates more than gameplay. It shows feature scoping, user onboarding, requirements documentation, progression design, prioritization, success metrics, risk management, technical collaboration, and release-quality packaging.</p>
     <p>The report itself is part of the product artifact set. It translates the game into a business-readable case study grounded in the implemented product, its user experience, and its technical delivery.</p>`,
    kpiDashboard());

  addPage('Product Goals', '05',
    `<p>The product goals translate the vision into observable design outcomes.</p>
     ${cardGrid([
      { title: 'Responsive Movement', body: 'Run and jump should feel arcade-like, smooth, and forgiving.' },
      { title: 'Distinct Levels', body: 'Each world introduces a scenario shift and visual identity.' },
      { title: 'Meaningful Throwing', body: 'Fishbones should matter in enemy fights and boss windows.' },
      { title: 'Readable UI', body: 'HUD should communicate status without overwhelming the player.' },
      { title: 'Rewarding Collection', body: 'Food trails guide routes, secrets, and score chasing.' },
      { title: 'Portfolio Polish', body: 'The game should be visually presentable and structurally documented.' },
    ])}`,
    img(assets.screenshots.level0_knowledge || assets.screenshots.tutorialKnowledge, 'Tutorial onboarding and visual guidance'));

  addPage('Goal Measurement Model', '05',
    `<p>Each product goal can be translated into a measurable or reviewable signal. These signals guide QA, iteration, and future playtesting.</p>
     ${simpleTable(['Goal', 'Signal', 'Review Method'], [
      ['Movement feels responsive', 'Low missed-input complaints; smooth jump recovery.', 'Keyboard playtest and death-location review.'],
      ['Levels feel distinct', 'Players can identify level scenario from one screenshot.', 'Visual review and route map review.'],
      ['Fishbone matters', 'Players use Space in boss fights and enemy encounters.', 'Usage counter or observation.'],
      ['Power-ups are clear', 'Players understand color and effect quickly.', 'Tutorial completion and HUD review.'],
      ['Replayability exists', 'Secrets and score invite repeat attempts.', 'Secret discovery and score variance.'],
    ])}`,
    img(assets.screenshots.tutorialPower, 'Power-up tutorial section screenshot'));

  addDivider('Users and Experience', 'Personas, journey mapping, controls, gameplay loop, and player-facing feedback.');

  addPage('Target Users and Personas', '06',
    `<p>The personas below are project-facing product personas, not market research. They help clarify expected needs and review contexts.</p>
     ${cardGrid([
      { title: 'Casual Retro Player', body: 'Wants quick learning, clear feedback, and a charming character.' },
      { title: 'Platformer Fan', body: 'Looks for responsive movement, fair challenge, secrets, and boss mastery.' },
      { title: 'Student Evaluator', body: 'Needs to see scope, implementation clarity, and learning outcomes.' },
      { title: 'Portfolio Reviewer', body: 'Looks for end-to-end product thinking and polished delivery.' },
    ])}`,
    assetGrid(assets.textureAssets, [
      ['cat-idle-0', 'Cute hero'], ['checkpoint', 'Safe progress'], ['goal', 'Completion'], ['boss-0', 'Challenge'],
    ]));

  addPage('Persona Detail: Casual Retro Player', '06',
    `<p><strong>Profile:</strong> Player who enjoys lightweight browser games and nostalgic visuals.</p>
     <p><strong>Motivation:</strong> Have fun quickly without reading a long manual.</p>
     <p><strong>Pain points:</strong> Confusing controls, harsh difficulty spikes, unclear hazards.</p>
     <p><strong>Expectations:</strong> Clear controls, easy first level, visible rewards, forgiving tutorial.</p>
     <p><strong>Product response:</strong> Level 0 teaches every major mechanic with gates, icons, signs, and checkmarks.</p>`,
    img(assets.screenshots.tutorialStart, 'Interactive tutorial start for casual onboarding'));

  addPage('Persona Detail: Platformer Fan', '06',
    `<p><strong>Profile:</strong> Player who understands platformer conventions and wants skill expression.</p>
     <p><strong>Motivation:</strong> Master movement, find secrets, beat bosses, improve completion time.</p>
     <p><strong>Pain points:</strong> floaty movement, repetitive levels, bosses without readable patterns.</p>
     <p><strong>Expectations:</strong> Coyote time, tight physics, varied hazards, fair boss openings.</p>
     <p><strong>Product response:</strong> Scenario-based levels, boss HP bars, fishbone weak-point windows, and replayable secret routes.</p>`,
    img(assets.screenshots.level3, 'Rooftop traversal challenge for skilled platformer players'));

  addPage('Persona Detail: Portfolio Reviewer', '06',
    `<p><strong>Profile:</strong> Hiring manager, product leader, instructor, or project reviewer.</p>
     <p><strong>Motivation:</strong> Evaluate product thinking, prioritization, execution, and communication.</p>
     <p><strong>Pain points:</strong> Projects that look unfinished, lack documentation, or do not connect features to user value.</p>
     <p><strong>Expectations:</strong> Clear product narrative, complete flow, measurable goals, technical architecture, and QA plan.</p>
     <p><strong>Product response:</strong> This report frames the game as an end-to-end product case study with structured PM artifacts.</p>`,
    img(assets.screenshots.levelSelect, 'Progression screen used as portfolio evidence'));

  addPage('User Journey Map', '07',
    `<p>The journey follows the player from first impression to mastery and replay.</p>
     <div class="journey">
      ${['Open game', 'Main menu', 'Tutorial', 'Collect', 'Throw', 'Boss', 'Unlock', 'Replay'].map((step, index) => `
        <div><span>${esc(step)}</span><strong>${['Curiosity', 'Orientation', 'Learning', 'Reward', 'Challenge', 'Mastery', 'Progress', 'Replay'][index]}</strong></div>
      `).join('')}
     </div>`,
    imageGrid([
      { src: assets.screenshots.mainMenu, caption: 'Opening and menu orientation' },
      { src: assets.screenshots.tutorialStart, caption: 'Tutorial learning stage' },
      { src: assets.screenshots.tutorialBoss, caption: 'Boss mastery stage' },
      { src: assets.screenshots.win, caption: 'Completion and reward stage' },
    ]));

  addPage('Journey Opportunities', '07',
    `<p>Journey mapping exposes design opportunities. PawPaw Power addresses onboarding risk through Level 0, challenge clarity through boss HP and attack windows, and replay motivation through secrets, score, and hidden paths.</p>
     ${simpleTable(['Stage', 'User Need', 'Product Response'], [
      ['Curiosity', 'Understand identity quickly.', 'Title screen, calico cat, bright retro world.'],
      ['Learning', 'Practice safely.', 'Tutorial signs, gates, checklist, checkmarks.'],
      ['Challenge', 'Know why failure happened.', 'Hazard visuals, respawn, invincibility blink.'],
      ['Reward', 'Feel progress.', 'Food, score, power-ups, boss defeat, unlock.'],
      ['Replay', 'Have optional mastery goals.', 'Secrets, shortcut paths, score, faster completion.'],
    ])}`,
    imageGrid([
      { src: assets.screenshots.tutorialStart, caption: 'Onboarding opportunity' },
      { src: assets.screenshots.tutorialExplore, caption: 'Exploration opportunity' },
      { src: assets.screenshots.tutorialBoss, caption: 'Challenge clarity opportunity' },
      { src: assets.screenshots.levelSelect, caption: 'Progression opportunity' },
    ]));

  addPage('Core Gameplay Loop', '08',
    `<p>The core loop is designed to repeat inside each level while escalating from movement to challenge to reward.</p>
     ${flowDiagram(['Start level', 'Move forward', 'Collect', 'Avoid', 'Attack', 'Explore', 'Checkpoint', 'Boss fight', 'Level complete', 'Next level'])}`,
    imageGrid([
      { src: assets.screenshots.level1, caption: 'Move, collect, and avoid' },
      { src: assets.screenshots.tutorialExplore, caption: 'Explore and find secrets' },
      { src: assets.screenshots.tutorialBoss, caption: 'Boss fight gate' },
      { src: assets.screenshots.levelSelect, caption: 'Next level progression' },
    ]));

  addPage('Loop Feedback Model', '08',
    `<p>Each loop stage has an input, risk, reward, and feedback layer.</p>
     ${simpleTable(['Stage', 'Player Action', 'Risk', 'Reward / Feedback'], [
      ['Move', 'Left/Right and Up', 'Pits and platforms', 'Camera follow, animation, landing burst'],
      ['Collect', 'Route through food trails', 'Risky paths', 'Score, sound, particles'],
      ['Attack', 'Space throw or stomp', 'Enemy contact', 'Defeat animation, score, impact burst'],
      ['Explore', 'Enter tunnels and search blocks', 'Optional challenge', 'Secrets, bonus score, shortcuts'],
      ['Boss', 'Dodge, throw, jump', 'Boss attacks', 'HP reduction, stun, level unlock'],
    ])}`,
    img(assets.screenshots.level0_boss_training || assets.screenshots.tutorialBoss, 'Boss training loop screenshot'));

  addPage('Game Controls', '09',
    `<p>The control scheme is intentionally simple. Up Arrow focuses jump behavior, while Space gives fishbone throwing a dedicated action. This separation makes boss fights readable because movement and attack decisions are distinct.</p>
     ${keyboardDiagram()}`,
    img(assets.screenshots.controls, 'Controls panel screenshot'));

  addPage('Control Design Rationale', '09',
    `<p>Up Arrow is used for jumping because it fits keyboard platformer expectations and keeps the player's right hand free for Space. Space is reserved for fishbones because projectile timing is central to bosses, enemy safety, and the silver projectile upgrade.</p>
     ${cardGrid([
      { title: 'Movement', body: 'Left and Right maintain classic side-scroller familiarity.' },
      { title: 'Jump', body: 'Up Arrow supports jump buffering, coyote time, double jump, and landing feedback.' },
      { title: 'Throw', body: 'Space creates an intentional attack action with cooldown and range.' },
      { title: 'System Keys', body: 'P, M, and Esc support pause, mute, and menu control without cluttering gameplay.' },
    ])}`,
    assetGrid(assets.textureAssets, [['cat-jump', 'Jump'], ['fishbone', 'Throw'], ['fishbone-strong', 'Upgraded fishbone']]));

  addDivider('Gameplay Systems', 'Character design, mechanics, projectiles, collectibles, power-ups, levels, bosses, enemies, hazards, and feedback.');

  addPage('Main Character Design', '10',
    `<p>PawPaw is the playable calico cat hero. The character design uses white, orange, and black patch-like pixels to make the hero readable at small scale and immediately distinct from enemies and pickups.</p>
     <p>Personality is expressed through cute proportions, blinking idle animation, quick running frames, airborne poses, shield glow, power-up tint, and invincibility blinking.</p>`,
    assetGrid(assets.textureAssets, [
      ['cat-idle-0', 'Idle'], ['cat-run-0', 'Run'], ['cat-jump', 'Jump'], ['cat-fall', 'Fall'], ['shield-bubble', 'Shield'],
    ]));

  addPage('Character State Sheet', '10',
    `<p>Animation and feedback states support player comprehension. PawPaw communicates what is happening through sprite pose, tint, aura, blinking, and particles.</p>
     ${simpleTable(['State', 'Purpose', 'Feedback'], [
      ['Idle', 'Resting / ready state', 'Blinking face and stable posture'],
      ['Walking', 'Low speed motion', 'Run frames at lower velocity'],
      ['Running', 'Full movement speed', 'Fast run animation'],
      ['Jumping', 'Upward air state', 'Jump pose and sound cue'],
      ['Falling', 'Downward air state', 'Fall pose'],
      ['Throwing', 'Projectile action', 'Fishbone spawn and burst'],
      ['Hurt', 'Damage response', 'Short recoil, damage sound, and invincibility start'],
      ['Invincible', 'Post-damage safety', 'Blinking alpha'],
      ['Powered-up', 'Temporary ability', 'Tint or aura'],
      ['Defeated', 'No lives or instant-fail hazard state', 'Fall/timeout transition into GameOverScene'],
    ])}`,
    img(assets.screenshots.tutorialPower, 'Power-up feedback shown in tutorial'));

  addPage('Character Recovery and Defeat States', '10',
    `<p>Recovery states are part of the player experience because they explain why the cat is safe, vulnerable, or defeated. Hurt begins the recovery window, invincible blinking prevents repeated hits, shield glow communicates protection, and defeated state routes the player toward retry or game over.</p>
     ${cardGrid([
      { title: 'Hurt', body: 'Triggered by enemy, spike, fire, projectile, or boss contact when no shield is available.' },
      { title: 'Invincible', body: 'Short blinking state after damage or respawn so players can regain control.' },
      { title: 'Shielded', body: 'Blue shield absorbs one hit and shows a visible bubble before breaking.' },
      { title: 'Defeated', body: 'Triggered when lives run out, timer expires, or instant hazards exhaust attempts.' },
    ])}`,
    imageGrid([
      { src: assets.screenshots.tutorialBoss, caption: 'Hurt and boss-pressure context' },
      { src: assets.screenshots.gameOver, caption: 'Defeated flow and retry state' },
    ]));

  addPage('Gameplay Mechanics Overview', '11',
    `<p>The game combines familiar platforming with cat-themed mechanics. The important PM choice is that every mechanic is connected to feedback, reward, UI, or level design.</p>
     ${cardGrid([
      { title: 'Running', body: 'Acceleration and deceleration create arcade feel without making the cat slippery.' },
      { title: 'Jumping', body: 'Coyote time and buffering make jumps forgiving and skillful.' },
      { title: 'Fishbones', body: 'A ranged action that supports enemy safety and boss weak points.' },
      { title: 'Checkpoints', body: 'Reduce frustration and support harder late-level sections.' },
    ])}`,
    img(assets.screenshots.level1, 'Core platforming mechanics in action'));

  const mechanicPages = [
    ['Running and Acceleration', 'Running builds momentum through acceleration and settles through deceleration. The player benefit is responsive motion that still has arcade weight.', assets.screenshots.level1],
    ['Jumping, Coyote Time, and Buffering', 'Jumping uses coyote time to forgive late jumps after leaving a platform and jump buffering to accept input just before landing.', assets.screenshots.tutorialStart],
    ['Landing and Platform Collision', 'Landing feedback helps players understand safe contact. Platforms include static, moving, falling, disappearing, rooftop, river, and safe-island forms.', assets.screenshots.level3],
    ['Invincibility Frames and Damage', 'After damage or respawn, the cat blinks briefly. This gives the player time to recover without repeated unfair hits.', assets.screenshots.tutorialBoss],
    ['Checkpoints, Lives, and Timer', 'Checkpoints reduce frustration, lives create stakes, and the timer encourages forward motion and replay mastery.', assets.screenshots.tutorialExplore],
    ['Score and Reward Logic', 'Score rewards food, enemies, boss hits, secrets, level completion, and remaining time. The system supports both casual play and score chasing.', assets.screenshots.win],
  ];
  mechanicPages.forEach(([title, body, screenshot]) => {
    addPage(title, '11', `<p>${esc(body)}</p>
      ${simpleTable(['Mechanic', 'Implementation Summary', 'Player Benefit'], [
        ['Input handling', 'Keyboard state drives movement and action.', 'Predictable desktop control.'],
        ['Physics', 'Arcade bodies and colliders resolve platforms and hazards.', 'Readable interactions.'],
        ['Feedback', 'Sound, particles, camera shake, and UI messages respond to actions.', 'Confidence and game feel.'],
      ])}`,
      img(screenshot, `${title} screenshot`));
  });

  addPage('Fishbone Projectile System', '12',
    `<p>Space triggers fishbone throwing. The projectile travels forward based on facing direction, has limited range, uses a cooldown, and disappears on impact with walls, blocks, enemies, or bosses.</p>
     ${flowDiagram(['Space key', 'Check cooldown', 'Spawn fishbone', 'Travel forward', 'Hit target', 'Impact burst', 'Cooldown UI'])}`,
    assetGrid(assets.textureAssets, [['fishbone', 'Normal fishbone'], ['fishbone-strong', 'Silver upgraded fishbone'], ['boss-projectile', 'Boss projectile']]));

  addPage('Fishbone Boss Interaction', '12',
    `<p>Fishbones are required in boss fights because they create safe damage opportunities and can open weak points. The tutorial boss specifically teaches that fishbones open the weak spot, but the player must jump on the weak point to finish the fight.</p>
     ${simpleTable(['Rule', 'Purpose'], [
      ['Forward travel', 'Makes facing direction meaningful.'],
      ['Cooldown', 'Prevents spam and creates timing.'],
      ['Limited range', 'Encourages positioning.'],
      ['Boss hit reaction', 'Communicates successful timing.'],
      ['Silver upgrade', 'Creates temporary power spike.'],
    ])}`,
    img(assets.screenshots.tutorialBoss, 'Fishbone weak-point training boss screenshot'));

  addPage('Projectile Feedback Requirements', '12',
    `<p>The fishbone system needs clear feedback at every step so players understand when Space worked, when cooldown is active, and when an enemy or boss was actually hit.</p>
     ${simpleTable(['Feedback item', 'Implementation requirement', 'Why it matters'], [
      ['Throw sound', 'Play a short original throw cue when Space successfully spawns a fishbone.', 'Confirms the input fired.'],
      ['Cooldown UI', 'HUD shows projectile cooldown state and readiness.', 'Prevents confusion when Space is pressed too soon.'],
      ['Projectile trail', 'Fishbone leaves a short trail, with a brighter fishbone trail during Bone+.', 'Makes range and direction visible.'],
      ['Enemy impact', 'Projectile disappears, impact particles appear, enemy defeat or hit score applies.', 'Confirms combat success.'],
      ['Boss impact', 'Boss flashes/stuns, HP bar reduces, boss-hit sound plays.', 'Connects Space-key throwing to boss progress.'],
      ['Wall/block impact', 'Projectile disappears on collision and creates a small burst.', 'Makes range and collision rules readable.'],
      ['Silver upgrade', 'Bone+ increases projectile effectiveness and visual intensity for a limited time.', 'Makes the silver power-up strategically valuable.'],
    ])}`,
    imageGrid([
      { src: assets.screenshots.tutorialBoss, caption: 'Cooldown and boss HP example' },
      { src: assets.screenshots.level1Boss, caption: 'Boss damage example' },
    ]));

  addPage('Collectibles System', '13',
    `<p>Cat food replaces coins and becomes the main collection language. Trails guide jumps, safe routes, secrets, and risky optional paths.</p>
     ${assetGrid(assets.textureAssets, [
      ['food-pink-0', 'Pink food'], ['food-cyan-0', 'Cyan secret food'], ['food-orange-0', 'Orange hidden food'],
      ['power-bonus', 'Gold bonus food'], ['power-life', 'Green life food'],
    ])}`,
    img(assets.screenshots.level1, 'Collectible trail in gameplay'));

  addPage('Collectible Design Role', '13',
    `<p>Collectibles serve four product functions: instruction, reward, exploration, and replay. A food trail can show the ideal jump arc; a hidden cluster can teach curiosity; a risky trail can invite mastery.</p>
     ${simpleTable(['Function', 'How It Appears', 'Product Value'], [
      ['Guidance', 'Food trails over jumps and platforms.', 'Reduces confusion without text.'],
      ['Reward', 'Food increases score and food count.', 'Creates frequent positive feedback.'],
      ['Exploration', 'Hidden clusters in secret rooms.', 'Supports replayability.'],
      ['Progress', 'Food gates in tutorial.', 'Teaches collection through gameplay.'],
    ])}`,
    img(assets.screenshots.tutorialExplore, 'Secret collection route screenshot'));

  addPage('Power-Up System', '14',
    `<p>Power-ups are colored cat food with clear visual meaning, sound cues, HUD communication, and temporary or permanent gameplay effects.</p>
     ${simpleTable(['Power-Up', 'Color', 'Ability', 'Purpose'], [
      ['Speed boost', 'Red', 'Temporary speed increase', 'Movement mastery and faster routes'],
      ['Shield', 'Blue', 'One-hit protection', 'Risk management and hazard learning'],
      ['Double jump', 'Purple', 'Temporary second jump', 'Vertical routes and recovery'],
      ['Bonus', 'Gold', 'Large score reward', 'Exploration and score chasing'],
      ['Extra life', 'Green', 'Adds one life', 'Rare high-value reward'],
      ['Projectile upgrade', 'Silver', 'Stronger fishbones', 'Boss and enemy advantage'],
    ])}`,
    assetGrid(assets.textureAssets, [
      ['power-speed', 'Speed'], ['power-shield', 'Shield'], ['power-double', 'Double'], ['power-projectile', 'Bone+'], ['power-life', 'Life'], ['power-bonus', 'Bonus'],
    ]));

  addPage('Power-Up UX Requirements', '14',
    `<p>A power-up is only successful if the player understands what changed. PawPaw Power uses color, sound, HUD labels, tint effects, shield aura, and tutorial checklist objectives to teach each ability.</p>
     ${cardGrid([
      { title: 'Color', body: 'Color communicates ability family at a glance.' },
      { title: 'Sound', body: 'Distinct sound reinforces pickup success.' },
      { title: 'HUD', body: 'Active power indicator confirms the current state.' },
      { title: 'Visual Effect', body: 'Tint or shield aura confirms moment-to-moment status.' },
    ])}`,
    img(assets.screenshots.tutorialPower, 'Power-up training section screenshot'));

  addPage('Power-Up Detail Matrix', '14',
    `<p>This matrix documents every required power-up property: duration, HUD state, sound cue, visible effect, and source/placement strategy.</p>
     ${powerUpDetailTable()}`,
    assetGrid(assets.textureAssets, [
      ['power-speed', 'Red speed'], ['power-shield', 'Blue shield'], ['power-double', 'Purple double'],
      ['power-bonus', 'Gold bonus'], ['power-life', 'Green life'], ['power-projectile', 'Silver Bone+'],
    ]));

  addPage('Level Design Overview', '15',
    `<p>The main campaign contains exactly five levels. There are no Level 6-10 entries. Every level is scenario-based and ends with a required boss fight.</p>
     ${flowDiagram(['Level 1 Grassland', 'Level 2 City', 'Level 3 Rooftops', 'Level 4 River', 'Level 5 Cat Tower'])}`,
    img(assets.screenshots.levelSelect, 'Five main levels plus tutorial in level select'));

  addPage('Level Progression Map', '15',
    `<p>The progression model escalates player skill from basic movement to timing, verticality, moving water routes, and final tower pressure.</p>
     ${simpleTable(['Level', 'Scenario', 'Difficulty Focus', 'Boss'], mainLevels.map((level) => [
      `${level.id}. ${level.name}`,
      esc(level.scenario),
      esc(level.biome),
      esc(level.boss.name),
    ]))}`,
    imageGrid([
      { src: assets.screenshots.level1, caption: 'Level 1: grassland' },
      { src: assets.screenshots.level2, caption: 'Level 2: city' },
      { src: assets.screenshots.level3, caption: 'Level 3: rooftops' },
      { src: assets.screenshots.level4, caption: 'Level 4: river' },
      { src: assets.screenshots.level5, caption: 'Level 5: tower' },
    ]));

  addPage('Level Content Inventory', '15',
    `<p>Every level includes a unique visual theme, music mood, collectibles, power-ups, enemies, hazards, checkpoint, secret area, boss fight, and completion sequence. This page makes that coverage explicit.</p>
     ${levelInventoryTable()}`,
    imageGrid([
      { src: assets.screenshots.level1, caption: 'Grassland elements' },
      { src: assets.screenshots.level2, caption: 'City traffic elements' },
      { src: assets.screenshots.level3, caption: 'Rooftop elements' },
      { src: assets.screenshots.level4, caption: 'River elements' },
    ]));

  const levelShots = {
    1: assets.screenshots.level1,
    2: assets.screenshots.level2,
    3: assets.screenshots.level3,
    4: assets.screenshots.level4,
    5: assets.screenshots.level5,
  };
  const bossShots = {
    1: assets.screenshots.level1Boss,
    2: assets.screenshots.level2Boss,
    3: assets.screenshots.level3Boss,
    4: assets.screenshots.level4Boss,
    5: assets.screenshots.level5Boss,
  };

  mainLevels.forEach((level) => {
    const detail = levelDetail(level.id);
    addPage(`Level ${level.id} - ${level.name}`, String(16 + level.id),
      `<p>${esc(detail.narrative)} This level shifts the player's primary challenge while preserving the core loop of movement, collection, hazard avoidance, enemy interaction, and boss completion.</p>
       ${simpleTable(['Design Area', 'Implementation'], [
        ['Biome', esc(level.biome)],
        ['Music mood', esc(level.music)],
        ['Timer', `${level.timer} seconds`],
        ['Width', `${level.width} world units`],
        ['Boss', esc(level.boss.name)],
        ['Checkpoint', level.checkpoint ? `x ${level.checkpoint.x}` : 'none'],
       ])}`,
      img(levelShots[level.id], `Level ${level.id} gameplay screenshot`));

    addPage(`Level ${level.id} Required Element Coverage`, String(16 + level.id),
      `<p>This inventory connects the written section to the screenshot and level data so reviewers can verify that the level is not a generic reskin.</p>
       ${simpleTable(['Coverage Area', 'Included Elements'], detail.inventory)}`,
      imageGrid([
        { src: levelShots[level.id], caption: `Level ${level.id} scenario screenshot` },
        { src: bossShots[level.id], caption: `${level.boss.name} boss arena context` },
      ]));

    addPage(`Level ${level.id} Layout and Objectives`, String(16 + level.id),
      `<p>The level map below abstracts the route for product review. Cyan blocks show platforms, pink blocks show hazards, yellow marks the checkpoint, and the purple region marks the boss arena.</p>
       ${levelMapSvg(level)}`,
      cardGrid([
        { title: 'Objective', body: `Reach and defeat ${level.boss.name}.` },
        { title: 'Player Skill', body: detail.skill },
        { title: 'Reward', body: 'Score, boss completion, level unlock, and campaign progress.' },
      ]));
  });

  addPage('Boss Fight System', '22',
    `<p>Every level ends in a boss arena. Boss fights create progression closure and force the player to combine movement, dodging, fishbone throwing, and timing.</p>
     ${flowDiagram(['Boss appears', 'Attack pattern', 'Dodge', 'Throw fishbone', 'Weak point / damage', 'HP drops', 'Pattern accelerates', 'Boss defeated'])}`,
    img(assets.screenshots.level5Boss, 'Final boss arena screenshot'));

  addPage('Boss Fight Rules', '22',
    `${simpleTable(['Rule', 'Product Purpose'], [
      ['Visible health bar', 'Shows progress and reduces ambiguity.'],
      ['Unique attack pattern', 'Gives each level a memorable closure.'],
      ['Hit reaction', 'Confirms successful player action.'],
      ['Stun window', 'Creates safe opportunity and rhythm.'],
      ['Increasing difficulty', 'Escalates tension as success nears.'],
      ['Fishbone requirement', 'Makes Space-key mechanic essential.'],
      ['Boss defeat completes level', 'Creates a clear progression gate.'],
    ])}`,
    img(assets.screenshots.level1Boss, 'Early boss fight screenshot'));

  const bossCards = [
    ['Grumpy Garden Mole', 'Level 1', 'Moves left/right, pops out, throws dirt balls, teaches simple fishbone timing.', assets.screenshots.level1Boss],
    ['Traffic Rat Rider', 'Level 2', 'Rides a scooter through traffic-inspired timing windows.', assets.screenshots.level2Boss],
    ['Rooftop Crow', 'Level 3', 'Flies above buildings and pressures the player from the air.', assets.screenshots.level3Boss],
    ['River Croc', 'Level 4', 'Uses river platform positioning and water pressure.', assets.screenshots.level4Boss],
    ['Shadow Cat King', 'Level 5', 'Final multi-pressure boss with speed, projectiles, summons, and tower danger.', assets.screenshots.level5Boss],
  ];
  bossCards.forEach(([name, level, body, screenshot]) => {
    const [movement, attacks, damageMethod, role] = bossDetail(name);
    addPage(`Boss Design - ${name}`, '23',
      `<p><strong>${esc(level)} boss.</strong> ${esc(body)}</p>
       ${simpleTable(['Boss Design Element', 'Role'], [
        ['Movement', esc(movement)],
        ['Attacks', esc(attacks)],
        ['Damage method', esc(damageMethod)],
        ['Difficulty role', esc(role)],
        ['HP and reaction', 'Visible health bar, hit flash, stun window, and faster behavior after damage.'],
      ])}`,
      img(screenshot, `${name} visual card`));
  });

  addPage('Boss Design Comparison Matrix', '23',
    `<p>This matrix summarizes how each boss differs mechanically and why fishbone throwing remains required throughout the campaign.</p>
     ${simpleTable(['Boss', 'Movement', 'Attacks', 'Damage method', 'Role'], bossCards.map(([name]) => {
      const [movement, attacks, damageMethod, role] = bossDetail(name);
      return [esc(name), esc(movement), esc(attacks), esc(damageMethod), esc(role)];
    }))}`,
    imageGrid([
      { src: assets.screenshots.level1Boss, caption: 'Grumpy Garden Mole' },
      { src: assets.screenshots.level2Boss, caption: 'Traffic Rat Rider boss arena' },
      { src: assets.screenshots.level3Boss, caption: 'Rooftop Crow boss arena' },
      { src: assets.screenshots.level4Boss, caption: 'River Croc boss arena' },
      { src: assets.screenshots.level5Boss, caption: 'Shadow Cat King final arena' },
    ]));

  addPage('Scenario-Based Gameplay Activities', '24',
    `<p>Scenario-based activity keeps the campaign from becoming only jump-and-land platforming.</p>
     ${simpleTable(['Scenario', 'Player Action', 'Risk', 'Reward'], [
      ['Classic platforming', 'Run, jump, collect, stomp.', 'Gaps and enemies.', 'Score and progress.'],
      ['Road crossing', 'Time movement through traffic.', 'Vehicle collision.', 'Safe islands and route mastery.'],
      ['Building jumping', 'Leap across rooftops and ledges.', 'Falls and flying enemies.', 'Vertical mastery.'],
      ['River crossing', 'Ride logs and boats.', 'Water life loss.', 'Timing mastery.'],
      ['Tunnel exploration', 'Enter cat-themed doors.', 'Optional path risk.', 'Secrets and shortcuts.'],
      ['Moving platform challenge', 'Time jumps onto lifts, logs, boats, falling platforms, and disappearing platforms.', 'Falls, water, lava, and mistimed landings.', 'Route mastery and access to secret rewards.'],
      ['Enemy arena', 'Clear enemies before continuing through a gated combat pocket.', 'Side-contact damage and projectile pressure.', 'Score, safety, and boss preparation.'],
      ['Chase section', 'Run from moving danger.', 'Pressure and panic.', 'Climactic pacing.'],
      ['Vertical climb', 'Climb upward through platforms, vents, balconies, and tower ledges.', 'Falls and aerial enemies.', 'Skill expression and hidden route discovery.'],
      ['Boss arena', 'Dodge, throw, jump.', 'Boss projectiles.', 'Level completion.'],
    ])}`,
    img(assets.screenshots.level2, 'Road crossing scenario screenshot'));

  addPage('Scenario Visual Matrix', '24',
    assetGrid(assets.textureAssets, [
      ['vehicle-car', 'Car'], ['vehicle-bus', 'Bus'], ['vehicle-bike', 'Bike'], ['tile-rooftop', 'Rooftop'],
      ['log-platform', 'Log'], ['boat-platform', 'Boat'], ['secret-box', 'Box tunnel'], ['chase-orb', 'Chase hazard'],
      ['boss-projectile', 'Boss shot'],
    ]),
    imageGrid([
      { src: assets.screenshots.level2, caption: 'Road crossing scenario' },
      { src: assets.screenshots.level3, caption: 'Rooftop scenario' },
      { src: assets.screenshots.level4, caption: 'River scenario' },
      { src: assets.screenshots.level5, caption: 'Tower scenario' },
    ]));

  addPage('Blocks and Interactions', '25',
    `<p>Blocks provide physical interaction and exploration. They make the world feel responsive and reward curiosity.</p>
     ${simpleTable(['Block Type', 'Behavior', 'Product Value'], [
      ['Solid block', 'Supports traversal.', 'World structure.'],
      ['Mystery block', 'Releases food or power-up.', 'Reward and surprise.'],
      ['Breakable block', 'Can be broken from below.', 'Interaction and route opening.'],
      ['Hidden block', 'Appears when touched from below.', 'Secret discovery.'],
      ['Secret-path block', 'Reveals or opens optional shortcut routes after being activated.', 'Exploration value and replayability.'],
      ['Used block', 'Shows reward already claimed.', 'State clarity.'],
      ['Bounce animation', 'Block briefly moves when hit from below.', 'Immediate tactile feedback.'],
    ])}`,
    assetGrid(assets.textureAssets, [
      ['block-mystery', 'Mystery'], ['block-breakable', 'Breakable'], ['block-hidden', 'Hidden'], ['block-used', 'Used'],
    ]));

  addPage('Platform Types', '26',
    `<p>Platform variety is a major level-design lever. Each platform type changes timing, risk, and route planning.</p>
     ${assetGrid(assets.textureAssets, [
      ['tile-grass', 'Ground'], ['platform-grass', 'Floating'], ['platform-city', 'City lift'],
      ['platform-rooftop', 'Rooftop'], ['log-platform', 'River log'], ['boat-platform', 'Boat'],
      ['platform-castle', 'Tower platform'], ['safe-island', 'Traffic island'],
      ['block-breakable', 'Breakable platform'], ['platform-rooftop', 'Narrow ledge'],
    ])}`,
    img(assets.screenshots.level3, 'Rooftop platform route screenshot'));

  addPage('Platform Challenge Matrix', '26',
    simpleTable(['Platform Type', 'Challenge', 'Player Skill'], [
      ['Normal ground', 'Baseline running and landing.', 'Movement confidence'],
      ['Floating platform', 'Optional jumps above the main path.', 'Air control'],
      ['Narrow platform', 'Small landing target over hazards or gaps.', 'Precision'],
      ['Moving platform', 'Timing and position tracking.', 'Patience'],
      ['Falling platform', 'Commit quickly after landing.', 'Fast decision-making'],
      ['Disappearing platform', 'Read timing cycle.', 'Rhythm'],
      ['Breakable platform', 'Platform disappears or breaks after interaction.', 'Commitment and route planning'],
      ['River platform', 'Ride moving object over instant hazard.', 'Precision'],
      ['Traffic island', 'Pause between hazard lanes.', 'Observation'],
      ['Rooftop platform', 'Long jumps and vertical traversal.', 'Air control'],
    ]),
    img(assets.screenshots.tutorialStart, 'Platforming tutorial screenshot'));

  addPage('Enemy System', '27',
    `<p>Enemies create route pressure and teach different defeat decisions.</p>
     ${assetGrid(assets.textureAssets, [
      ['enemy-walker-0', 'Walker'], ['enemy-flyer-0', 'Flyer'], ['enemy-jumper-0', 'Jumper'],
      ['enemy-spiky', 'Spiky'], ['enemy-traffic', 'Traffic'], ['enemy-river-0', 'River'], ['enemy-rooftop-0', 'Rooftop'],
    ])}`,
    img(assets.screenshots.level1, 'Enemy placement in gameplay'));

  addPage('Enemy Behavior Matrix', '27',
    simpleTable(['Enemy', 'Movement behavior', 'Damage behavior', 'Defeat method', 'Score reward'], [
      ['Walking enemy', 'Patrols platforms left and right.', 'Side contact hurts the player without shield.', 'Stomp from above or hit with fishbone.', '+250 defeat score'],
      ['Flying enemy', 'Moves in a wave pattern above routes.', 'Side contact or projectile attack hurts the player.', 'Fishbone, careful stomp when reachable, or avoid.', '+250 defeat score'],
      ['Jumping enemy', 'Hops at intervals while patrolling.', 'Side contact hurts; landing timing changes risk.', 'Stomp during safe window or hit with fishbone.', '+250 defeat score'],
      ['Spiky enemy', 'Patrols slowly as an avoid-only threat.', 'Damages from every direction and cannot be stomped.', 'Avoid or use fishbone if configured as vulnerable.', '+250 projectile score when defeated'],
      ['Traffic enemy', 'Moves quickly across road lanes.', 'Vehicle-like side contact can cost a life or severe damage.', 'Avoid first; fishbone only if safe.', '+250 defeat score'],
      ['River enemy', 'Jumps or swims near river platforms.', 'Contact can knock player into water danger.', 'Fishbone or timed stomp from safe platform.', '+250 defeat score'],
      ['Rooftop enemy', 'Blocks rooftop ledges and long jumps.', 'Side contact hurts and interrupts traversal.', 'Stomp on safe ledge or hit with fishbone.', '+250 defeat score'],
    ]),
    img(assets.screenshots.level2, 'Traffic enemy context screenshot'));

  addPage('Hazard System', '28',
    `<p>Hazards are grouped into damage hazards, instant life-loss hazards, timing hazards, and boss hazards. This helps product and design review understand severity and mitigation.</p>
     ${assetGrid(assets.textureAssets, [
      ['hazard-pit', 'Pit'], ['hazard-spikes', 'Spikes'], ['hazard-road', 'Road'], ['hazard-water', 'Water'],
      ['hazard-fire', 'Fire'], ['hazard-lava', 'Lava'], ['hazard-rock', 'Rock'], ['hazard-sign', 'Falling sign'],
      ['boss-projectile', 'Boss shot'],
    ])}`,
    img(assets.screenshots.level5, 'Tower hazards screenshot'));

  addPage('Hazard Severity Chart', '28',
    simpleTable(['Hazard', 'Severity', 'Reason', 'Mitigation'], [
      ['Spikes', 'Damage', 'Hurts but can teach invincibility.', 'Jump timing or shield.'],
      ['Cars / buses / bikes', 'Instant life loss', 'High-speed traffic lane.', 'Observe patterns and use islands.'],
      ['Water / lava / pits', 'Instant life loss', 'Major route boundary.', 'Platforms and timing.'],
      ['Falling rocks / signs', 'Timing hazard', 'Vertical threat.', 'Wait, bait, or move quickly.'],
      ['Moving obstacles', 'Timing hazard', 'Horizontal or vertical moving bodies interrupt safe routes.', 'Observe cycle, wait for gap, or use shield.'],
      ['Collapsing platforms', 'Timing hazard', 'Route disappears after contact.', 'Commit quickly and plan next landing.'],
      ['Boss projectiles', 'Boss hazard', 'Arena pressure.', 'Dodge and counterattack.'],
    ]),
    img(assets.screenshots.level2, 'Traffic hazard context screenshot'));

  addPage('Secrets and Exploration', '29',
    `<p>Secrets support replayability by rewarding curiosity with hidden blocks, secret rooms, shortcuts, collectible clusters, power-ups, and cat-themed tunnel entrances.</p>
     ${assetGrid(assets.textureAssets, [
      ['secret-box', 'Cardboard box'], ['secret-catdoor', 'Cat door'], ['secret-tree', 'Tree hole'],
      ['secret-drain', 'Drain'], ['secret-vent', 'Rooftop vent'], ['food-cyan-0', 'Secret food'],
    ])}`,
    img(assets.screenshots.tutorialExplore, 'Secret and exploration tutorial screenshot'));

  addPage('Checkpoints, Lives, Timer, and Score', '30',
    `<p>These systems turn levels into a complete game loop. Lives create stakes, checkpoints reduce frustration, the timer encourages forward motion, and score supports mastery.</p>
     ${simpleTable(['System', 'Function', 'Player Value'], [
      ['Lives', 'Tracks attempts before game over.', 'Meaningful risk.'],
      ['Checkpoint', 'Respawns player from safe progress point.', 'Reduced frustration.'],
      ['Timer', 'Counts down level time.', 'Forward momentum.'],
      ['Score', 'Rewards pickups, enemies, secrets, bosses, and time.', 'Replay and mastery.'],
    ])}`,
    imageGrid([
      { src: assets.screenshots.tutorialExplore, caption: 'HUD with score, lives, timer, and active objective' },
      { src: assets.screenshots.gameOver, caption: 'Game over state after lives are exhausted' },
    ]));

  addPage('Scoring Dashboard Mockup', '30',
    scoreDashboard(),
    img(assets.screenshots.win, 'Win screen with score and time bonus'));

  addPage('Life Loss and Respawn Rules', '30',
    `<p>Life-loss rules are documented separately because they drive fairness, checkpoint value, and game-over expectations.</p>
     ${simpleTable(['Trigger', 'Result', 'Respawn / Feedback'], [
      ['Enemy hit without shield', 'Lose health or one life depending on context.', 'Hurt sound, blink, invincibility window.'],
      ['Pit fall', 'Instant life loss.', 'Respawn at checkpoint or start.'],
      ['Car, bus, or bike collision', 'Instant life loss in road sections.', 'Traffic impact feedback and checkpoint respawn.'],
      ['River water', 'Instant life loss.', 'Water splash/life-loss cue and checkpoint respawn.'],
      ['Lava', 'Instant life loss.', 'Fire/lava feedback and checkpoint respawn.'],
      ['Timer reaches zero', 'Life loss and level restart/respawn.', 'Timer warning and life-lost sound.'],
      ['Boss fight failure', 'Life loss; game over if no lives remain.', 'Boss arena reset from checkpoint.'],
      ['Shield active', 'Shield absorbs one hit instead of losing a life.', 'Shield pop, HUD status update, no life lost.'],
    ])}`,
    imageGrid([
      { src: assets.screenshots.level2, caption: 'Vehicle life-loss context' },
      { src: assets.screenshots.level4, caption: 'River life-loss context' },
      { src: assets.screenshots.gameOver, caption: 'Game-over result after lives are gone' },
      { src: assets.screenshots.tutorialPower, caption: 'Shield protection context' },
    ]));

  addPage('HUD and UI Design', '31',
    `<p>The HUD emphasizes readability. It keeps critical status visible without overwhelming the playfield.</p>
     ${simpleTable(['HUD Element', 'Purpose'], [
      ['Score', 'Shows reward progress.'],
      ['Lives', 'Shows remaining attempts.'],
      ['Timer', 'Creates pacing pressure.'],
      ['Level', 'Provides orientation.'],
      ['Food', 'Shows collectible count.'],
      ['Power', 'Shows active ability.'],
      ['Shield', 'Shows protection status.'],
      ['Fishbone cooldown', 'Shows attack readiness.'],
      ['Boss HP', 'Shows boss fight progress.'],
    ])}`,
    img(assets.screenshots.tutorialBoss, 'HUD with boss health and fishbone cooldown'));

  addPage('HUD Breakdown Visual', '31',
    `<div class="annotated-ui">
      <div class="annotation a1">Score / Lives / Time</div>
      <div class="annotation a2">Power and shield status</div>
      <div class="annotation a3">Fishbone cooldown</div>
      <div class="annotation a4">Boss health appears in arena</div>
      ${img(assets.screenshots.tutorialBoss, 'Annotated HUD screenshot', 'wide-shot')}
    </div>`,
    '');

  addPage('Game Flow', '32',
    `<p>The screen flow supports onboarding, play, interruption, failure, success, and progression.</p>
     ${flowDiagram(['Main menu', 'Tutorial / Level select', 'Gameplay', 'Pause', 'Boss defeated', 'Next level', 'Game over / Win'])}`,
    img(assets.screenshots.levelSelect, 'Level select and unlock flow'));

  addPage('Screen Flow Diagram', '32',
    `<div class="screen-flow">
      <div>Main Menu</div><div>Tutorial</div><div>Level Select</div><div>Game Scene</div>
      <div>Pause</div><div>Game Over</div><div>Win</div><div>Next Level</div>
    </div>`,
    imageGrid([
      { src: assets.screenshots.mainMenu, caption: 'Main menu' },
      { src: assets.screenshots.gameOver, caption: 'Game over' },
    ]));

  addPage('Menu and Progression Options', '32',
    `<p>The screen system supports both player convenience and progression control. Level unlocks persist with localStorage, while pause and terminal screens provide recovery paths.</p>
     ${simpleTable(['Screen / system', 'Options and behavior'], [
      ['Main menu', 'Start Game, Tutorial, Level Select, Controls, Audio toggle.'],
      ['Level select', 'Shows unlocked levels, locks later levels, starts selected available level.'],
      ['Tutorial', 'Required Level 0 onboarding; completing objectives unlocks Level 1.'],
      ['Pause menu', 'Resume, restart level, main menu, mute/unmute, volume control.'],
      ['Game over', 'Shows final score, restart option, and main menu option.'],
      ['Win screen', 'Shows congratulations, final score, time bonus, and main menu option.'],
      ['localStorage save', 'Stores highest unlocked level so progress survives browser reload.'],
      ['Automatic next level', 'Boss defeat unlocks the next level and moves player forward.'],
    ])}`,
    imageGrid([
      { src: assets.screenshots.mainMenu, caption: 'Main menu options' },
      { src: assets.screenshots.levelSelect, caption: 'Locked/unlocked level select' },
      { src: assets.screenshots.gameOver, caption: 'Game over recovery options' },
      { src: assets.screenshots.win, caption: 'Win screen completion options' },
    ]));

  addPage('Audio Design', '33',
    `<p>Audio is generated through the Web Audio API. This avoids external copyrighted sound files while still giving the player fast retro feedback.</p>
     ${simpleTable(['Sound', 'Purpose'], [
      ['Jump', 'Confirms upward action.'],
      ['Throw', 'Confirms fishbone spawn.'],
      ['Projectile hit', 'Confirms impact.'],
      ['Collect', 'Rewards food pickup.'],
      ['Power-up', 'Signals ability change.'],
      ['Block hit / break', 'Confirms interaction.'],
      ['Enemy defeat', 'Rewards combat success.'],
      ['Enemy hit by projectile', 'Confirms fishbone damage against enemies.'],
      ['Hurt / life lost', 'Signals damage.'],
      ['Checkpoint', 'Confirms safe progress.'],
      ['Level complete', 'Celebrates boss-gated progression.'],
      ['Boss appears / hit / defeated', 'Creates boss drama.'],
      ['Game over', 'Signals campaign failure and retry state.'],
      ['Victory', 'Celebrates final boss defeat and campaign completion.'],
    ])}`,
    assetGrid(assets.textureAssets, [['fishbone', 'Throw'], ['food-pink-0', 'Collect'], ['checkpoint', 'Checkpoint'], ['boss-0', 'Boss']]));

  addPage('Music Mood Map', '33',
    simpleTable(['Theme', 'Game Context', 'Design Role'], [
      ['Menu', 'Main navigation', 'Welcoming retro identity.'],
      ['Grassland', 'Level 1 and tutorial mood', 'Bright and playful.'],
      ['City', 'Traffic level', 'Higher tempo and timing pressure.'],
      ['Rooftop', 'Vertical traversal', 'Airy and agile.'],
      ['River', 'Water platforming', 'Flowing and tense.'],
      ['Night final', 'Final tower platforming', 'High tension and climax.'],
      ['Boss fight', 'Every boss arena', 'Sharper, looped combat pressure that separates boss fights from traversal.'],
    ]),
    imageGrid([
      { src: assets.screenshots.level1, caption: 'Bright grassland music mood' },
      { src: assets.screenshots.level2, caption: 'Busy city traffic music mood' },
      { src: assets.screenshots.level4, caption: 'Flowing river music mood' },
      { src: assets.screenshots.level5, caption: 'High-tension final tower music mood' },
    ]));

  addPage('Visual Feedback and Juice', '34',
    `<p>Game feel depends on feedback density. PawPaw Power uses screen shake, sparkles, particles, block bounce, enemy squash, invincibility blinking, speed trail, shield glow, fishbone trail, and victory particles.</p>
     ${cardGrid([
      { title: 'Particles', body: 'Food, power-ups, impacts, and boss hits feel rewarding.' },
      { title: 'Camera Shake', body: 'Damage and boss defeats feel consequential.' },
      { title: 'State Effects', body: 'Shield glow, speed trail, double-jump aura, and invincibility blinking are visible.' },
      { title: 'Combat Effects', body: 'Enemy squash, fishbone trail, hit sparkles, and boss defeat victory particles confirm action.' },
    ])}`,
    img(assets.screenshots.tutorialPower, 'Visual feedback in power-up tutorial'));

  addDivider('Product Management Artifacts', 'PRD, user stories, prioritization, roadmap, KPIs, risk, QA, and responsible design.');

  addPage('Product Requirements Document', '35',
    `<p><strong>Product summary:</strong> PawPaw Power is a desktop browser retro platformer with a tutorial, five boss-gated levels, collectibles, power-ups, enemies, hazards, secrets, and complete menu flow.</p>
     <p><strong>Problem statement:</strong> Build a portfolio-ready game that demonstrates full product thinking, not just a prototype.</p>
     <p><strong>Primary user need:</strong> Players and reviewers need a clear, complete, learnable, visually memorable game experience.</p>`,
    img(assets.screenshots.tutorialKnowledge, 'Product requirements represented in tutorial knowledge board'));

  addPage('PRD Functional Requirements', '35',
    simpleTable(['Requirement', 'Acceptance Criteria'], [
      ['Keyboard gameplay', 'Player can move, jump, throw, pause, mute, and navigate menus.'],
      ['Tutorial level', 'All major mechanics are taught interactively before Level 1.'],
      ['Boss per level', 'Every main level requires boss defeat to complete.'],
      ['Power-ups', 'All six power-ups exist with HUD/audio/visual feedback.'],
      ['Secrets', 'Secret entrances and hidden rewards exist.'],
      ['Save progress', 'Level unlock state persists in localStorage.'],
      ['Generated assets', 'Game runs without copyrighted external assets.'],
    ]),
    assetGrid(assets.textureAssets, [['checkpoint', 'Save progress'], ['power-speed', 'Power-up'], ['boss-0', 'Boss'], ['secret-box', 'Secret']]));

  addPage('PRD Product Goals and User Needs', '35',
    `<p>The PRD connects player needs to observable product goals and acceptance criteria.</p>
     ${simpleTable(['User need', 'Product goal', 'Acceptance signal'], [
      ['Learn quickly without a manual', 'Make tutorial objectives visual and mandatory.', 'Level 0 gates, icons, checkmarks, and completion screen work.'],
      ['Feel fair platforming control', 'Make movement responsive and forgiving.', 'Acceleration, deceleration, coyote time, jump buffer, and landing feedback are present.'],
      ['Understand combat options', 'Make fishbone throwing meaningful.', 'Space cooldown, enemy hits, boss HP changes, and Bone+ upgrade are visible.'],
      ['Feel rewarded for exploration', 'Make collectibles and secrets valuable.', 'Hidden rooms, food clusters, bonus score, extra life, and shortcuts exist.'],
      ['Progress through a complete adventure', 'Make every level boss-gated and unlockable.', 'Boss defeat triggers level complete, unlock, and next-level movement.'],
      ['Review the project professionally', 'Make documentation business-readable and visual.', 'Report includes PM artifacts, diagrams, screenshots, QA, and roadmap.'],
    ])}`,
    img(assets.screenshots.tutorialKnowledge, 'PRD goals represented by tutorial knowledge boards'));

  addPage('PRD Non-Functional Requirements', '35',
    simpleTable(['Requirement', 'Acceptance Criteria'], [
      ['Performance', 'Runs smoothly in desktop browsers with lightweight generated assets.'],
      ['Readability', 'HUD and tutorial text remain high contrast.'],
      ['Maintainability', 'Logic separated across scenes, objects, systems, and data.'],
      ['Originality', 'No copied Nintendo/Super Mario assets, names, sprites, sounds, or layouts.'],
      ['Desktop focus', 'Keyboard-only controls are documented and supported.'],
      ['Regeneration', 'Report PDF can be regenerated through script.'],
    ]),
    architectureDiagram());

  addPage('PRD Constraints and Assumptions', '35',
     `<p><strong>Constraints:</strong> No backend, no copyrighted assets, desktop keyboard controls only, and five main levels only.</p>
     <p><strong>Assumptions:</strong> Players have a keyboard, run the game locally in a browser, and can understand retro visual conventions with tutorial support.</p>
     <p><strong>Scope decision:</strong> The project prioritizes complete core gameplay and PM documentation over online features, monetization, multiplayer, or analytics backends.</p>`,
    img(assets.screenshots.controls, 'Control constraints documented in-game'));

  addPage('PRD Feature List', '35',
    featureHierarchy(),
    simpleTable(['Feature Group', 'Included Features'], [
      ['Core gameplay', 'Movement, jumping, throwing, collisions, lives, timer, score.'],
      ['Progression', 'Tutorial, level select, unlocks, boss completion, win state.'],
      ['Content', 'Six levels, bosses, enemies, hazards, power-ups, secrets.'],
      ['Feedback', 'Audio, particles, screen shake, HUD, messages, animations.'],
      ['Documentation', 'README, project report, PM PDF generator.'],
    ]));

  addPage('User Stories', '36',
    simpleTable(['User Story', 'Benefit'], [
      ['As a player, I want to move left and right smoothly, so that traversal feels responsive.', 'Movement feel'],
      ['As a player, I want to jump reliably, so that platforming feels fair.', 'Trust'],
      ['As a player, I want to throw fishbones, so that I can attack enemies and bosses at range.', 'Agency'],
      ['As a player, I want to collect cat food, so that exploration feels rewarding.', 'Reward'],
      ['As a player, I want power-ups to be clear, so that I understand temporary abilities.', 'Clarity'],
      ['As a player, I want checkpoints, so that one mistake does not erase too much progress.', 'Retention'],
    ]),
    img(assets.screenshots.tutorialStart, 'User stories validated by interactive tutorial'));

  addPage('User Stories Continued', '36',
    simpleTable(['User Story', 'Benefit'], [
      ['As a player, I want boss health bars, so that I know my progress in a fight.', 'Clarity'],
      ['As a player, I want secrets, so that replaying the level feels worthwhile.', 'Replayability'],
      ['As a player, I want audio mute, so that I can control sound comfort.', 'Accessibility'],
      ['As a player, I want levels to unlock after bosses, so that progress feels earned and automatic.', 'Level progression'],
      ['As a player, I want the HUD to show lives, timer, power, shield, boss HP, and cooldown, so that I can make quick decisions.', 'HUD clarity'],
      ['As a player, I want menus for pause, restart, level select, and return to main menu, so that I can control my session.', 'Menu control'],
      ['As a reviewer, I want a clear report, so that I can understand product decisions quickly.', 'Portfolio review'],
      ['As a developer, I want data-driven levels, so that new content is easy to add.', 'Maintainability'],
    ]),
    img(assets.screenshots.tutorialExplore, 'Secrets support exploration user stories'));

  addPage('Acceptance Criteria Examples', '36',
    simpleTable(['Feature', 'Acceptance Criteria'], [
      ['Fishbone throw', 'Space creates projectile, respects cooldown, moves by facing direction, destroys on hit.'],
      ['Boss fight', 'Boss has HP, projectiles, hit reactions, escalating speed, and defeat event.'],
      ['Tutorial gate', 'Gate remains locked until required objectives complete and then opens visually.'],
      ['Power-up', 'Pickup changes ability, plays sound, shows HUD state, and creates visual effect.'],
      ['Level unlock', 'Completing boss unlocks next level and starts it automatically.'],
    ]),
    img(assets.screenshots.tutorialBoss, 'Boss acceptance criteria visual'));

  addPage('Feature Prioritization', '37',
    `<p>The MoSCoW model separates essential release scope from future enhancements.</p>
     ${simpleTable(['Priority', 'Features'], [
      ['Must Have', 'Movement, jumping, collisions, Level 0 tutorial, five levels, bosses, fishbones, lives, score, timer, HUD.'],
      ['Should Have', 'Secrets, power-ups, audio, visual feedback, level select, localStorage unlocks.'],
      ['Could Have', 'Extra animation frames, more secret rooms, speedrun timer, local leaderboard.'],
      ['Wont Have for now', 'Backend services, multiplayer, mobile controls, online accounts, or analytics infrastructure.'],
    ])}`,
    featureHierarchy());

  addPage('Prioritization Rationale', '37',
    `<p>The product prioritizes features that make the game complete and reviewable. Anything that expands scope without strengthening the core loop is deferred.</p>
     ${cardGrid([
      { title: 'Core First', body: 'Movement, collision, and boss progression must work before extra content.' },
      { title: 'Onboarding Early', body: 'Level 0 reduces confusion and makes later difficulty fairer.' },
      { title: 'Polish Supports Comprehension', body: 'Particles, sounds, and UI are not decoration; they teach state changes.' },
      { title: 'Scope Guardrails', body: 'The project stays focused on playable product quality, documentation, and portfolio readiness.' },
    ])}`,
    img(assets.screenshots.tutorialKnowledge, 'Prioritization expressed through tutorial design'));

  addPage('Product Roadmap', '38',
    roadmap(),
    img(assets.screenshots.levelSelect, 'Roadmap outcome represented by level progression'));

  addPage('Roadmap Detail', '38',
    simpleTable(['Phase', 'Deliverable', 'Exit Criteria'], [
      ['1 Core prototype', 'Phaser project, player movement, platforms.', 'Playable movement loop.'],
      ['2 Movement polish', 'Coyote time, jump buffer, landing, camera.', 'Movement feels responsive.'],
      ['3 Rewards', 'Cat food, score, power-ups.', 'Player has reason to explore.'],
      ['4 Combat', 'Enemies, fishbones, bosses.', 'Boss-gated progression works.'],
      ['5 Level design', 'Five scenario levels plus tutorial.', 'Distinct level experiences.'],
      ['6 UI/audio', 'HUD, menus, mute, synthesized sounds.', 'Complete presentation layer.'],
      ['7 QA/polish', 'Build checks, tutorial audit, bug fixes.', 'Stable portfolio release.'],
      ['8 Release', 'README, reports, PDF case study.', 'Showcase-ready artifact set.'],
    ]),
    kpiDashboard());

  addPage('KPIs and Success Metrics', '39',
    kpiDashboard(),
    '<p>These KPIs are proposed product metrics for future instrumentation, playtesting, and QA. They are grounded in how the game is designed to be played and evaluated.</p>');

  addPage('Metric Definitions', '39',
    expandedKpiTable(),
    img(assets.screenshots.tutorialBoss, 'Boss KPI context screenshot'));

  addPage('Risk Assessment', '40',
    `<p>The risk matrix below documents probability, impact, and mitigation for the main delivery and experience risks.</p>
     ${riskMatrix()}`,
    imageGrid([
      { src: assets.screenshots.tutorialKnowledge, caption: 'Tutorial clarity risk evidence' },
      { src: assets.screenshots.level2, caption: 'Timing and hazard risk evidence' },
      { src: assets.screenshots.tutorialBoss, caption: 'Boss difficulty risk evidence' },
      { src: assets.screenshots.level5, caption: 'Late-game complexity risk evidence' },
    ]));

  addPage('Risk Mitigation Plan', '40',
    `<p>The highest-risk areas are movement feel, boss difficulty, unclear tutorial objectives, and visual readability. The project mitigates these through forgiving jump systems, tutorial gates, visible boss HP, high-contrast HUD, and consistent generated pixel art.</p>
     ${cardGrid([
      { title: 'Movement Risk', body: 'Mitigated by coyote time, buffering, acceleration tuning, and landing feedback.' },
      { title: 'Tutorial Risk', body: 'Mitigated by mandatory gates, checkmarks, signboards, and active task panel.' },
      { title: 'Boss Risk', body: 'Mitigated by HP bars, projectile windows, stuns, and training boss.' },
      { title: 'Scope Risk', body: 'Mitigated by five-level limit and generated assets.' },
    ])}`,
    img(assets.screenshots.tutorialStart, 'Tutorial risk mitigation screenshot'));

  addDivider('Technical and Delivery Documentation', 'Architecture, development documentation, QA, accessibility, future expansion, and appendix.');

  addPage('Technical Architecture', '41',
    `<p>The system architecture separates scene orchestration, game objects, reusable systems, and level data. This system architecture diagram keeps gameplay logic maintainable and makes reporting possible because product content can be inspected from structured level data.</p>
     ${architectureDiagram()}`,
    img(assets.screenshots.level1, 'GameScene output from architecture systems'));

  addPage('Scene and System Structure', '41',
    simpleTable(['Layer', 'Files', 'Responsibility'], [
      ['Scenes', 'Boot, Preload, Menu, LevelSelect, Game, Pause, GameOver, Win', 'Game flow and scene-specific UI.'],
      ['Objects', 'Player, Enemy, Boss, PowerUp, Collectible', 'Reusable gameplay entities.'],
      ['Systems', 'AudioManager, LevelManager, UIManager', 'Cross-scene services and state.'],
      ['Data', 'levels.js', 'Level content and tutorial metadata.'],
      ['Styles', 'style.css', 'Browser shell presentation.'],
    ]),
    featureHierarchy());

  addPage('Gameplay System Responsibilities', '41',
    `<p>This architecture matrix documents the implementation responsibilities behind the product features.</p>
     ${systemResponsibilitiesTable()}`,
    architectureDiagram());

  addPage('System Flow: Input to Feedback', '41',
    flowDiagram(['Keyboard input', 'Player state', 'Physics/collision', 'GameScene handlers', 'Score/state update', 'Audio/UI/particles', 'Player feedback']),
    img(assets.screenshots.tutorialPower, 'Input feedback through power-up example'));

  addPage('Development Documentation', '42',
    `<p>The project uses a data-driven Phaser architecture and Vite development workflow. Assets are generated in PreloadScene, gameplay is orchestrated in GameScene, and content is configured in levels.js.</p>
     ${simpleTable(['Topic', 'Documentation Summary'], [
      ['Build approach', 'Vite dev server and production build.'],
      ['Game loop', 'Phaser update loop handles input, moving objects, boss intro, chase, projectiles, UI.'],
      ['Asset loading', 'Canvas textures generated at runtime.'],
      ['Physics', 'Arcade physics with colliders and overlaps.'],
      ['Audio', 'Synthesized through Web Audio API.'],
      ['Report generation', 'Playwright captures screenshots and exports HTML report to PDF.'],
    ])}`,
    img(assets.screenshots.mainMenu, 'Generated browser game captured for report'));

  addPage('Development Process Detail', '42',
    `<p>This page expands the development documentation into the required build, lifecycle, collision, physics, audio, testing, debugging, performance, screenshot, and PDF-generation coverage.</p>
     ${developmentDetailTable()}`,
    img(assets.screenshots.tutorialKnowledge, 'Captured game screen used in documentation workflow'));

  addPage('Folder Structure Documentation', '42',
    `<pre class="code-block">src/
  data/levels.js
  objects/Player.js Enemy.js Boss.js PowerUp.js Collectible.js
  scenes/BootScene.js PreloadScene.js MainMenuScene.js GameScene.js ...
  systems/AudioManager.js LevelManager.js UIManager.js
  styles/style.css
scripts/generate_product_report.cjs
reports/assets/
PawPaw_Power_Product_Management_Report.pdf</pre>`,
    architectureDiagram());

  addPage('Screenshot and PDF Generation Process', '42',
    `<p>The report generator starts a local Vite server, launches Chromium through Playwright, captures real game screens, extracts generated texture assets, builds a designed HTML report, exports it to PDF, and verifies the PDF page count.</p>
     ${flowDiagram(['Start Vite', 'Open Chromium', 'Capture screens', 'Extract textures', 'Build HTML', 'Export PDF', 'Verify 80+ pages'])}`,
    img(assets.screenshots.tutorialKnowledge, 'Screenshot captured from running game'));

  addPage('Quality Assurance Plan', '43',
    simpleTable(['Test Area', 'Test Case', 'Expected Result'], [
      ['Movement', 'Hold Left/Right.', 'Cat accelerates and decelerates smoothly.'],
      ['Jump', 'Press Up before and after platform edge.', 'Jump buffer and coyote time work.'],
      ['Fishbone', 'Press Space repeatedly.', 'Projectile fires and cooldown prevents spam.'],
      ['Enemy', 'Stomp and projectile hit.', 'Enemy defeats and score updates.'],
      ['Boss', 'Throw fishbone and stomp weak point.', 'Boss HP changes and defeat completes level.'],
      ['Power-up', 'Collect each color.', 'Ability, sound, HUD, and visual effect activate.'],
    ]),
    img(assets.screenshots.tutorialBoss, 'QA boss test context'));

  addPage('QA Checklist Continued', '43',
    simpleTable(['Test Area', 'Expected Result'], [
      ['Checkpoint', 'Touch checkpoint and lose life.', 'Respawn at checkpoint with invincibility.'],
      ['Level unlock', 'Defeat boss.', 'Next level unlocks and starts.'],
      ['Timer', 'Timer reaches zero.', 'Life loss occurs.'],
      ['Score', 'Collect, defeat, complete.', 'Score updates correctly.'],
      ['Audio mute', 'Press M.', 'Audio toggles.'],
      ['Game over', 'Lose all lives.', 'GameOverScene appears.'],
      ['Win state', 'Defeat final boss.', 'WinScene appears.'],
      ['Save/load progress', 'Unlock a level, reload browser, open level select.', 'localStorage restores unlocked level state.'],
    ]),
    img(assets.screenshots.gameOver, 'Game over QA visual'));

  addPage('Tutorial QA Audit', '43',
    `<p>The tutorial was mechanically audited to ensure every task has an actual trigger.</p>
     ${metricCards([
      { label: 'Tutorial tasks', value: '52', note: 'All major mechanics represented.' },
      { label: 'Trigger coverage', value: '52/52', note: 'No missing actual triggers.' },
      { label: 'Categories', value: '10', note: 'Move through boss training.' },
      { label: 'Knowledge boards', value: '6', note: 'All level element themes previewed.' },
    ])}`,
    img(assets.screenshots.tutorialKnowledge, 'Tutorial QA visual evidence'));

  addPage('Future Expansion', '44',
    `<p>Future expansion should preserve the cat-themed identity and avoid adding scope that weakens the core loop.</p>
     ${cardGrid([
      { title: 'More levels', body: 'Add biomes after the five-level campaign is stable.' },
      { title: 'More bosses', body: 'Give each boss custom sprite silhouettes and phase tells.' },
      { title: 'More power-ups', body: 'Introduce new cat-food abilities only after current HUD and tutorial patterns remain clear.' },
      { title: 'Cosmetic skins', body: 'Unlock optional calico, tuxedo, tabby, and fantasy cat skins without changing gameplay balance.' },
      { title: 'Challenge mode', body: 'Speedrun, no-hit, or score attack variants.' },
      { title: 'Local leaderboard', body: 'Store best scores and best times locally.' },
      { title: 'More secrets', body: 'Add alternate routes and collectible clusters.' },
      { title: 'More cat abilities', body: 'Test wall-climb, dash, or pounce abilities as future skill-gated mechanics.' },
      { title: 'Cutscenes', body: 'Short pixel-art story moments between worlds.' },
    ])}`,
    img(assets.screenshots.win, 'Win state as expansion endpoint'));

  addPage('ESG / Accessibility / Responsible Design', '45',
    `<p>The project uses responsible design by avoiding pay-to-win mechanics, gambling mechanics, and manipulative monetization. It stays lightweight, keyboard-friendly, and clear.</p>
     ${simpleTable(['Principle', 'Implementation'], [
      ['Keyboard accessibility', 'All gameplay uses keyboard controls.'],
      ['Clear contrast', 'HUD and report use high-contrast text.'],
      ['Mute option', 'M key and menu controls support audio comfort.'],
      ['Simple controls', 'Left/Right, Up, Space, P, M, Esc.'],
      ['Cartoon action', 'Non-realistic enemy defeat and playful visuals.'],
      ['No monetization', 'No gambling, pay-to-win, or purchases.'],
      ['Performance-friendly', 'Generated lightweight assets and no backend dependency.'],
    ])}`,
    img(assets.screenshots.controls, 'Accessible control communication'));

  addPage('Final Product Manager Reflection', '46',
    `<p>PawPaw Power demonstrates how Product Management thinking can be applied to a small but complete game project. The product is framed around a clear promise, a focused scope, onboarding, progression, feedback, technical maintainability, and measurable success criteria.</p>
     <p>The project shows feature planning through MoSCoW prioritization, user experience thinking through tutorial gates and checklists, technical coordination through scene/object/system separation, and roadmap thinking through staged delivery.</p>`,
    img(assets.screenshots.mainMenu, 'PawPaw Power as PM portfolio artifact'));

  addPage('Portfolio Case Study Value', '46',
    `<p>As a portfolio artifact, the game and report together demonstrate product storytelling: what was built, why the features exist, how the player experiences them, how risk is managed, and how future development can proceed responsibly.</p>
     ${cardGrid([
      { title: 'Product Strategy', body: 'Clear player promise and design pillars.' },
      { title: 'Execution', body: 'Playable game with end-to-end flow.' },
      { title: 'Documentation', body: 'PRD, QA, roadmap, metrics, and architecture.' },
      { title: 'Visual Polish', body: 'Cyberpunk business report with real game assets and screenshots.' },
    ])}`,
    img(assets.screenshots.levelSelect, 'Campaign structure as product artifact'));

  addDivider('Appendix', 'Feature inventories, glossary, screenshot index, and visual asset index.');

  addPage('Appendix A - Full Feature Checklist', '47',
    simpleTable(['Feature Area', 'Included'], [
      ['Menus', 'Main, tutorial/help, level select, pause, game over, win.'],
      ['Core play', 'Run, jump, land, throw, collect, dodge, explore, fight bosses.'],
      ['Progression', 'Tutorial, five levels, unlocks, automatic next level.'],
      ['Systems', 'Lives, timer, score, checkpoints, localStorage.'],
      ['Polish', 'Audio, particles, screen shake, animation, HUD.'],
    ]),
    featureHierarchy());

  addPage('Appendix B - Full Control List', '47',
    keyboardDiagram(),
    img(assets.screenshots.controls, 'Control reference screenshot'));

  addPage('Appendix C - Full Level and Boss List', '47',
    simpleTable(['Level', 'Name', 'Boss'], levels.map((level) => [
      String(level.id),
      esc(level.name),
      esc(level.boss?.name || 'N/A'),
    ])),
    img(assets.screenshots.levelSelect, 'Level and boss inventory visual'));

  addPage('Appendix D - Power-Up, Enemy, and Hazard Lists', '47',
    `${assetGrid(assets.textureAssets, [
      ['power-speed', 'Speed'], ['power-shield', 'Shield'], ['power-double', 'Double'], ['power-projectile', 'Projectile'], ['power-life', 'Life'], ['power-bonus', 'Bonus'],
      ['enemy-walker-0', 'Walker'], ['enemy-flyer-0', 'Flyer'], ['enemy-jumper-0', 'Jumper'], ['enemy-spiky', 'Spiky'],
      ['hazard-spikes', 'Spikes'], ['hazard-water', 'Water'], ['hazard-lava', 'Lava'], ['vehicle-car', 'Car'],
    ])}`,
    '');

  addPage('Appendix E - Glossary', '47',
    simpleTable(['Term', 'Definition'], [
      ['Coyote time', 'A short grace period for jumping after leaving a platform.'],
      ['Jump buffer', 'Stores jump input shortly before landing.'],
      ['Fishbone', 'Player projectile thrown with Space.'],
      ['Bone+', 'Silver cat food projectile upgrade.'],
      ['Snack gate', 'Tutorial collection gate opened by food objectives.'],
      ['Boss arena', 'End-level locked challenge area.'],
      ['Knowledge board', 'Tutorial visual board previewing later level elements.'],
    ]),
    assetGrid(assets.textureAssets, [['fishbone', 'Fishbone'], ['power-projectile', 'Bone+'], ['boss-0', 'Boss arena']]));

  const screenshotIndexEntries = Object.entries(assets.screenshots).map(([key, value]) => [
    esc(key),
    esc(value),
  ]);
  const screenshotIndexSplit = Math.ceil(screenshotIndexEntries.length / 2);

  addPage('Appendix F - Screenshot Index', '47',
    simpleTable(['Screenshot', 'Report Use'], screenshotIndexEntries.slice(0, screenshotIndexSplit)),
    img(assets.screenshots.tutorialKnowledge, 'Screenshot-rich report source example'));

  addPage('Appendix F - Screenshot Index Continued', '47',
    simpleTable(['Screenshot', 'Report Use'], screenshotIndexEntries.slice(screenshotIndexSplit)),
    img(assets.screenshots.level5Boss, 'Final boss screenshot source example'));

  addPage('Appendix G - Visual Asset Index', '47',
    assetGrid(assets.textureAssets, Object.keys(assets.textureAssets).slice(0, 16).map((key) => [key, key])),
    '<p>All visual assets shown here are generated from the game runtime texture system.</p>');

  addPage('Appendix H - Report Generation Notes', '47',
    `<p>This PDF is generated from an HTML report source using Playwright. The generator captures screenshots from the running Phaser game, exports runtime textures, builds designed cyberpunk-themed pages, and prints to PDF with backgrounds enabled.</p>
     <pre class="code-block">node scripts/generate_product_report.cjs</pre>`,
    img(assets.screenshots.mainMenu, 'Captured report source screenshot'));

  while (pages.length < 86) {
    const idx = pages.length - 78;
    addPage(`Appendix Deep Dive ${idx}`, '47',
      `<p>This appendix page preserves extra portfolio review space for notes on product decisions, implementation details, and future iteration. It reinforces that PawPaw Power is documented as both a game and a product case study.</p>
       ${cardGrid([
        { title: 'Decision', body: 'Prioritize complete gameplay over broad feature sprawl.' },
        { title: 'Evidence', body: 'Use screenshots, diagrams, and implementation summaries.' },
        { title: 'Next Step', body: 'Collect playtest data and tune levels with KPIs.' },
        { title: 'Portfolio Signal', body: 'Show product clarity, delivery discipline, and technical understanding.' },
       ])}`,
      idx % 2 === 0 ? img(assets.screenshots.level1, 'Gameplay appendix visual') : img(assets.screenshots.tutorialBoss, 'Boss appendix visual'));
  }

  const tocEntries = [];
  const seen = new Set();
  pages.forEach((page, index) => {
    if (!seen.has(page.section)) {
      seen.add(page.section);
      tocEntries.push({ section: page.section, page: index + 1 });
    }
  });

  const tocHtml = tocEntries.map((entry) => `
    <div class="toc-line"><span>${esc(entry.section)}</span><b>${entry.page}</b></div>
  `);
  const tocChunkSize = Math.ceil(tocHtml.length / 5);
  [1, 2, 3, 4, 5].forEach((pageIndex, chunkIndex) => {
    const start = chunkIndex * tocChunkSize;
    pages[pageIndex].body = `<div class="toc-list">${tocHtml.slice(start, start + tocChunkSize).join('')}</div>`;
  });

  const html = renderHtml(pages);
  ensureDir(REPORT_DIR);
  fs.writeFileSync(HTML_PATH, html, 'utf8');
  return pages.length;
}

function renderHtml(pages) {
  const css = `
    @page { size: ${pageSize.widthMm}mm ${pageSize.heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #050610; color: #f7fbff; font-family: Inter, Arial, sans-serif; }
    .page {
      position: relative;
      width: ${pageSize.widthMm}mm;
      height: ${pageSize.heightMm}mm;
      padding: 19mm 18mm 15mm;
      page-break-after: always;
      overflow: hidden;
      background:
        radial-gradient(circle at 14% 12%, rgba(181,108,255,.18), transparent 30%),
        radial-gradient(circle at 82% 18%, rgba(37,247,208,.14), transparent 28%),
        linear-gradient(135deg, #080914 0%, #10122a 52%, #070914 100%);
    }
    .page::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(80,245,255,.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(80,245,255,.05) 1px, transparent 1px);
      background-size: 16mm 16mm;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.75), rgba(0,0,0,.2));
      pointer-events: none;
    }
    .page-inner { position: relative; z-index: 2; height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 5mm; }
    main { min-height: 0; overflow: hidden; }
    .header { display:flex; align-items:center; justify-content:space-between; color:#8eeeff; font-size: 9pt; letter-spacing:.08em; text-transform:uppercase; }
    .footer { display:flex; justify-content:space-between; align-items:center; color:#9aa7cc; font-size:8pt; border-top:1px solid rgba(80,245,255,.25); padding-top:3mm; }
    h1 { margin: 0; font-size: 24pt; line-height: 1.04; color:#fff; text-shadow:0 0 18px rgba(181,108,255,.45); }
    h2 { margin: 0; font-size: 16pt; color:#50f5ff; text-transform:uppercase; letter-spacing:.08em; }
    h3 { margin:0 0 3mm; color:#ff4fd8; font-size:14pt; }
    h4 { margin:0 0 2mm; color:#50f5ff; font-size:10pt; }
    p { margin: 0 0 2.8mm; line-height: 1.38; color:#dce8ff; font-size: 9.5pt; }
    .lead { font-size: 15pt; line-height: 1.35; color:#fff; max-width: 160mm; }
    .kicker { color:#ff4fd8; font-weight:700; letter-spacing:.12em; text-transform:uppercase; font-size:9pt; margin-bottom:2mm; }
    .content { display:grid; grid-template-columns: 1.05fr .95fr; gap: 7mm; align-items:stretch; min-height:0; max-height: 141mm; }
    .text-panel, .visual-panel, .card, .metric, .toc-visual {
      background: rgba(9, 12, 31, .78);
      border: 1px solid rgba(80,245,255,.28);
      box-shadow: 0 0 24px rgba(80,245,255,.09), inset 0 0 22px rgba(181,108,255,.05);
      border-radius: 5mm;
      padding: 5mm;
    }
    .text-panel { overflow: hidden; }
    .visual-panel { display:flex; flex-direction:column; justify-content:center; gap:3mm; overflow:hidden; }
    figure { margin: 0; }
    figure img { width: 100%; border-radius: 3mm; border: 1px solid rgba(255,79,216,.35); box-shadow:0 0 24px rgba(255,79,216,.16); image-rendering: pixelated; background:#11152b; }
    figcaption { color:#9aa7cc; font-size:7.5pt; margin-top:1.8mm; text-align:center; }
    .hero-shot img { max-height: 111mm; object-fit: cover; }
    .wide-shot img { max-height: 118mm; object-fit: contain; }
    .shot img { max-height: 102mm; object-fit: contain; }
    .image-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:3mm; }
    .grid-shot img { max-height: 48mm; object-fit:cover; }
    .grid-shot figcaption { font-size:6.8pt; margin-top:1mm; }
    .cover-page h1 { font-size: 46pt; color:#fff; }
    .cover-page .content { grid-template-columns: .88fr 1.12fr; }
    .cover-meta { display:flex; flex-wrap:wrap; gap:2mm; margin-top:8mm; }
    .cover-meta span { border:1px solid rgba(255,79,216,.5); color:#fff; border-radius:99px; padding:2mm 4mm; background:rgba(255,79,216,.12); font-size:8pt; }
    .divider-page .content { grid-template-columns: 1fr; place-items:center; text-align:center; }
    .divider-page h1 { font-size: 36pt; line-height:1.02; }
    .divider-page .text-panel { min-height: 112mm; display:flex; flex-direction:column; justify-content:center; align-items:center; }
    .card-grid, .metric-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:3mm; }
    .card { padding:3.4mm; border-radius:3.5mm; }
    .card p { font-size:8.1pt; line-height:1.28; margin:0; }
    .card h4 { font-size:9.1pt; margin-bottom:1.3mm; }
    .metric { padding:3mm; border-radius:3.5mm; }
    .metric span { color:#8eeeff; text-transform:uppercase; letter-spacing:.08em; font-size:7pt; }
    .metric strong { display:block; color:#fff; font-size:14pt; margin:.5mm 0; }
    .metric small { color:#9aa7cc; font-size:6.8pt; line-height:1.22; }
    .report-table { width:100%; border-collapse:collapse; overflow:hidden; border-radius:3mm; font-size:7.5pt; }
    .report-table th { background:rgba(80,245,255,.16); color:#50f5ff; text-align:left; padding:1.5mm; border:1px solid rgba(80,245,255,.2); }
    .report-table td { padding:1.4mm 1.6mm; border:1px solid rgba(80,245,255,.13); color:#dce8ff; vertical-align:top; }
    .asset-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:2.2mm; align-content:center; }
    .texture { background:rgba(255,255,255,.04); border:1px solid rgba(80,245,255,.2); border-radius:3mm; padding:1.5mm; text-align:center; min-height:20mm; display:flex; flex-direction:column; justify-content:center; }
    .texture img { width:13mm; height:13mm; object-fit:contain; margin:0 auto; border:none; box-shadow:none; background:transparent; }
    .texture figcaption { font-size:6pt; margin-top:.8mm; }
    .flow { display:flex; flex-wrap:wrap; align-items:center; gap:2mm; }
    .flow-node { padding:3mm; min-width:27mm; text-align:center; background:linear-gradient(135deg, rgba(80,245,255,.16), rgba(255,79,216,.12)); border:1px solid rgba(80,245,255,.38); border-radius:3mm; color:#fff; font-size:8pt; }
    .flow-arrow { color:#ff4fd8; font-weight:700; }
    .keyboard { display:flex; flex-wrap:wrap; gap:3mm; justify-content:center; align-items:center; }
    .key { min-width:24mm; min-height:18mm; padding:3mm; text-align:center; border-radius:3mm; color:#fff; background:#11152b; border:1px solid rgba(80,245,255,.42); box-shadow:inset 0 -2mm 0 rgba(0,0,0,.3); font-weight:700; }
    .key small { color:#9aa7cc; font-weight:400; }
    .key.space { min-width:58mm; }
    .key.hot { border-color:#ff4fd8; box-shadow:0 0 18px rgba(255,79,216,.24), inset 0 -2mm 0 rgba(0,0,0,.3); }
    .roadmap { display:grid; grid-template-columns:repeat(4, 1fr); gap:4mm; }
    .road-phase { min-height:31mm; border-radius:4mm; padding:4mm; background:rgba(80,245,255,.1); border:1px solid rgba(80,245,255,.28); }
    .road-phase span { color:#ff4fd8; font-size:8pt; text-transform:uppercase; }
    .road-phase strong { display:block; margin-top:2mm; color:#fff; font-size:11pt; }
    .dashboard .metric-grid { grid-template-columns:repeat(3, 1fr); gap:2mm; }
    .architecture { display:grid; gap:3mm; width:100%; overflow:hidden; }
    .arch-row { display:grid; grid-template-columns:minmax(0,1fr) 11mm minmax(0,1fr) 11mm minmax(0,1fr); gap:1.4mm; align-items:center; }
    .arch-row div { min-width:0; overflow-wrap:anywhere; padding:3mm 1.5mm; background:rgba(80,245,255,.12); border:1px solid rgba(80,245,255,.28); border-radius:3mm; text-align:center; color:#fff; font-size:7.2pt; }
    .arch-row span { color:#ff4fd8; text-align:center; font-size:6.4pt; overflow-wrap:anywhere; }
    .hierarchy { text-align:center; }
    .root { margin:0 auto 6mm; width:55mm; padding:5mm; border-radius:4mm; background:rgba(255,79,216,.18); border:1px solid rgba(255,79,216,.5); color:#fff; font-size:14pt; }
    .branch { display:grid; grid-template-columns:repeat(5, 1fr); gap:3mm; }
    .branch div { padding:4mm 2mm; border-radius:3mm; background:rgba(80,245,255,.1); border:1px solid rgba(80,245,255,.3); color:#fff; font-size:9pt; }
    .branch small { color:#9aa7cc; }
    .journey { display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; }
    .journey div { padding:4mm; min-height:24mm; border-radius:4mm; background:rgba(255,79,216,.1); border:1px solid rgba(255,79,216,.28); }
    .journey span { color:#50f5ff; display:block; font-size:8pt; text-transform:uppercase; }
    .journey strong { color:#fff; display:block; margin-top:2mm; }
    .screen-flow { display:grid; grid-template-columns:repeat(4,1fr); gap:4mm; }
    .screen-flow div { min-height:26mm; display:grid; place-items:center; background:rgba(80,245,255,.1); border:1px solid rgba(80,245,255,.3); border-radius:4mm; color:#fff; text-align:center; }
    .level-map { width:100%; border:1px solid rgba(80,245,255,.25); border-radius:4mm; overflow:hidden; }
    .annotated-ui { position:relative; }
    .annotation { position:absolute; z-index:5; padding:2mm 3mm; border-radius:99px; background:#ff4fd8; color:#fff; font-size:8pt; box-shadow:0 0 16px rgba(255,79,216,.5); }
    .a1 { top:2mm; left:8mm; } .a2 { top:16mm; left:8mm; } .a3 { top:16mm; left:92mm; } .a4 { bottom:15mm; left:54mm; }
    .toc-list { columns:1; column-gap:0; }
    .toc-line { break-inside:avoid; display:flex; justify-content:space-between; border-bottom:1px solid rgba(80,245,255,.18); padding:1.05mm 0; font-size:7.7pt; color:#dce8ff; }
    .toc-line b { color:#50f5ff; margin-left:4mm; }
    .toc-visual { min-height:96mm; display:grid; place-items:center; text-align:center; color:#fff; font-size:18pt; line-height:1.6; text-transform:uppercase; letter-spacing:.08em; }
    .toc-page h1 { font-size:21pt; }
    .toc-page .content { grid-template-columns:1.08fr .92fr; max-height:138mm; gap:5mm; }
    .toc-page .text-panel, .toc-page .visual-panel { padding:4mm; }
    .toc-page .toc-line { padding:.72mm 0; font-size:7.15pt; }
    .toc-page .toc-visual { min-height:76mm; font-size:14pt; line-height:1.45; }
    .toc-page .roadmap { grid-template-columns:repeat(2, 1fr); gap:2.3mm; }
    .toc-page .road-phase { min-height:18mm; padding:2.4mm; }
    .toc-page .road-phase strong { font-size:8.5pt; margin-top:1mm; }
    .toc-page .dashboard .metric-grid { grid-template-columns:repeat(3, 1fr); gap:1.6mm; }
    .toc-page .metric { padding:2mm; }
    .toc-page .metric span { font-size:5.6pt; }
    .toc-page .metric strong { font-size:10pt; }
    .toc-page .metric small { font-size:5.9pt; }
    .toc-page .asset-grid { grid-template-columns:repeat(4, 1fr); gap:1.8mm; }
    .code-block { font-family:"Courier New", monospace; white-space:pre-wrap; background:#050610; color:#50f5ff; border:1px solid rgba(80,245,255,.25); border-radius:3mm; padding:4mm; font-size:8pt; }
  `;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>PawPaw Power Product Management Report</title>
      <style>${css}</style>
    </head>
    <body>
      ${pages.map((page, index) => `
        <section class="page ${page.className}">
          <div class="page-inner">
            <div class="header"><span>PawPaw Power</span><span>Product Management Business Report</span></div>
            <main>
              <div class="kicker">${esc(page.kicker)}</div>
              <h1>${esc(page.title)}</h1>
              <div class="content">
                <div class="text-panel">${page.body}</div>
                ${page.visual ? `<div class="visual-panel">${page.visual}</div>` : ''}
              </div>
            </main>
            <div class="footer"><span>16-bit retro calico cat platformer</span><span>${index + 1}</span></div>
          </div>
        </section>`).join('')}
    </body>
  </html>`;
}

async function exportPdf(pageCount) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: PDF_PATH,
    printBackground: true,
    preferCSSPageSize: true,
  });
  await browser.close();

  const pdfInfoPath = path.join(RUNTIME_BIN, 'pdfinfo');
  let actualPages = pageCount;
  try {
    const info = execFileSync(pdfInfoPath, [PDF_PATH], { encoding: 'utf8' });
    const match = info.match(/^Pages:\s+(\d+)/m);
    if (match) actualPages = Number(match[1]);
  } catch (error) {
    console.warn(`Could not inspect PDF page count: ${error.message}`);
  }

  if (actualPages < 80) {
    throw new Error(`PDF page count is ${actualPages}; expected at least 80 pages.`);
  }

  console.log(`Generated ${PDF_PATH}`);
  console.log(`HTML source: ${HTML_PATH}`);
  console.log(`PDF pages: ${actualPages}`);
}

async function main() {
  ensureDir(REPORT_DIR);
  ensureDir(ASSET_DIR);

  const server = await ensureServer();
  try {
    const assets = await captureScreenshots();
    const pageCount = await buildReportHtml(assets);
    await exportPdf(pageCount);
  } finally {
    if (server) {
      server.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
