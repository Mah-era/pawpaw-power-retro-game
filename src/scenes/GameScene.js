import Phaser from 'phaser';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';
import PowerUp, { POWER_UPS } from '../objects/PowerUp.js';
import Collectible from '../objects/Collectible.js';
import LevelManager from '../systems/LevelManager.js';
import UIManager from '../systems/UIManager.js';

const POWER_DESCRIPTIONS = {
  speed: 'Red cat food: speed boost!',
  shield: 'Blue cat food: shield protection!',
  bonus: 'Gold cat food: bonus score!',
  life: 'Green cat food: extra life!',
  double: 'Purple cat food: double jump!',
  projectile: 'Silver cat food: stronger fishbones!',
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelId = data.levelId ?? 1;
  }

  create() {
    this.level = LevelManager.getLevel(this.levelId);
    this.audio = this.registry.get('audioManager');
    this.state = LevelManager.ensureRunState(this, this.levelId);
    this.levelTimer = this.level.timer;
    this.checkpoint = { ...this.level.playerStart };
    this.levelComplete = false;
    this.respawning = false;
    this.nextThrowAt = 0;
    this.bossMusicStarted = false;
    this.chaseActive = false;

    this.setupTutorialState();
    this.unlockAudioOnInput();
    this.audio.startMusic(this.level.music);
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 220);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);

    this.createBackground();
    this.createPlatforms();
    this.createMovingPlatforms();
    this.createScenarioHazards();
    this.createBlocks();
    this.createSecretEntrances();
    this.createCollectibles();
    this.createPowerUps();
    this.createCheckpoint();
    this.createGoal();
    this.createEnemies();
    this.createPlayer();
    this.createPlayerProjectiles();
    this.createChaseHazard();
    this.createBoss();
    this.createTutorialWorld();
    this.createCollisions();
    this.createEnemyArenas();

    this.ui = new UIManager(this, this.level);
    this.ui.showMessage(this.level.name, '#ffd166', 1800);
    this.createTutorialPanel();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickTimer,
      callbackScope: this,
    });

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 80);

    this.input.keyboard.on('keydown-P', () => this.pauseGame());
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-M', () => {
      this.audio.toggleMute();
      this.ui.showMessage(this.audio.muted ? 'Audio muted' : 'Audio on', '#9de8ff', 1000);
    });

    this.events.once('boss-defeated', () => {
      if (this.level.isTutorial) {
        ['boss_dodge', 'boss_throw', 'boss_weak', 'boss_health_zero', 'boss_defeated'].forEach((objectiveId) => {
          this.completeTutorialObjective(objectiveId);
        });
        this.showTutorialCelebration();
      }
      this.time.delayedCall(this.level.isTutorial ? 1300 : 700, () => this.completeLevel(true));
    });
  }

  update() {
    this.handleThrowInput();
    this.updateTutorialObjectives();
    this.updateMovingObjects();
    this.updateBossIntro();
    this.updateChase();
    this.updateArenas();
    if (!this.levelComplete && !this.respawning && this.player.y > this.level.height + 140) {
      this.loseLife('fall');
    }
    this.cleanupProjectiles();
    this.ui?.update(this.state, this.player, this.levelTimer, this.boss);
    this.updateTutorialPanel();
  }

  unlockAudioOnInput() {
    const unlock = () => {
      this.audio.unlock();
      this.audio.startMusic(this.level.music);
    };
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);
  }

  setupTutorialState() {
    if (!this.level.isTutorial) {
      return;
    }

    const tasks = this.level.tutorial?.tasks || {};
    this.tutorialCompleted = new Set();
    this.tutorialTaskOrder = Object.keys(tasks);
    this.tutorialTaskMap = new Map(
      Object.entries(tasks).map(([id, [icon, instruction]]) => [id, { id, icon, instruction }]),
    );
    this.tutorialCategories = (this.level.tutorial?.categories || []).map(([name, taskIds]) => ({
      name,
      taskIds,
    }));
    this.tutorialTotalTasks = this.tutorialTaskOrder.length;
    this.tutorialGateMessageAt = 0;
  }

  createTutorialWorld() {
    // Phaser reuses the scene instance across restarts, so stale references from
    // a previous (tutorial) level must be cleared on non-tutorial levels —
    // otherwise createCollisions() wires colliders to destroyed groups.
    if (!this.level.isTutorial) {
      this.tutorialGates = null;
      this.tutorialZones = null;
      this.tutorialPanel = null;
      return;
    }

    this.createTutorialSigns();
    this.createTutorialElementBoards();
    this.createTutorialGates();
    this.createTutorialZones();
  }

  createTutorialSigns() {
    const signs = this.level.tutorial?.signs || [];
    signs.forEach((sign, index) => {
      const container = this.add.container(sign.x, sign.y).setDepth(85);
      const board = this.add.rectangle(0, -62, 286, 92, 0x151225, 0.9)
        .setStrokeStyle(3, 0xffd166);
      const iconKey = this.getTutorialIconForCategory(sign.title);
      const icon = this.add.image(-118, -68, iconKey).setDisplaySize(30, 30);
      const title = this.add.text(-92, -92, sign.title, {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        color: '#ffd166',
        stroke: '#120f22',
        strokeThickness: 4,
      });
      const text = this.add.text(-126, -70, sign.text, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: '#fff7d6',
        stroke: '#120f22',
        strokeThickness: 3,
        wordWrap: { width: 238 },
        lineSpacing: 2,
      });
      const arrow = this.add.triangle(0, -3, 0, 0, 26, 0, 13, 18, 0xffd166, 1)
        .setStrokeStyle(2, 0x120f22);
      container.add([board, icon, title, text, arrow]);
      this.tweens.add({
        targets: arrow,
        y: 5,
        duration: 430 + index * 20,
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Sine.InOut,
      });
    });
  }

  createTutorialElementBoards() {
    (this.level.tutorial?.elementBoards || []).forEach((board, boardIndex) => {
      const width = 340;
      const height = 130;
      const container = this.add.container(board.x, board.y).setDepth(84);
      const background = this.add.rectangle(0, 0, width, height, 0x1d1a2d, 0.9)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0x9de8ff);
      const title = this.add.text(-width / 2 + 14, -height / 2 + 10, board.title, {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#ffd166',
        stroke: '#120f22',
        strokeThickness: 4,
      });
      const text = this.add.text(-width / 2 + 14, -height / 2 + 34, board.text, {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#fff7d6',
        stroke: '#120f22',
        strokeThickness: 3,
        wordWrap: { width: width - 28 },
        lineSpacing: 2,
      });
      container.add([background, title, text]);

      const icons = board.icons || [];
      const spacing = Math.min(52, (width - 24) / Math.max(1, icons.length));
      const frameSize = Math.min(42, spacing - 4);
      const iconSize = frameSize - 12;
      const startX = -(icons.length - 1) * (spacing / 2);
      icons.forEach((iconKey, index) => {
        const iconFrame = this.add.rectangle(startX + index * spacing, 36, frameSize, frameSize, 0x120f22, 0.7)
          .setStrokeStyle(2, 0x3b315d);
        const icon = this.add.image(startX + index * spacing, 36, this.textures.exists(iconKey) ? iconKey : 'particle')
          .setDisplaySize(iconSize, iconSize);
        container.add([iconFrame, icon]);
        this.tweens.add({
          targets: icon,
          y: 32,
          duration: 520 + index * 70 + boardIndex * 15,
          yoyo: true,
          repeat: -1,
          ease: Phaser.Math.Easing.Sine.InOut,
        });
      });
    });
  }

  createTutorialGates() {
    this.tutorialGates = this.physics.add.staticGroup();
    (this.level.tutorial?.gates || []).forEach((gateData, index) => {
      const gate = this.add.rectangle(gateData.x, gateData.y, gateData.w, gateData.h, 0x2f2950, 0.92)
        .setStrokeStyle(3, 0xffd166)
        .setDepth(90);
      this.physics.add.existing(gate, true);
      gate.body.setSize(gateData.w, gateData.h);
      gate.body.updateFromGameObject();
      gate.setData({ ...gateData, opened: false, index });
      gate.label = this.add.text(gateData.x, gateData.y - gateData.h / 2 - 18, 'LOCKED', {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: '#ffd166',
        stroke: '#120f22',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5).setDepth(91);
      this.tutorialGates.add(gate);
    });
    this.refreshTutorialGates();
  }

  createTutorialZones() {
    this.tutorialZones = this.physics.add.staticGroup();
    (this.level.tutorial?.zones || []).forEach((zoneData) => {
      const zone = this.add.zone(zoneData.x, zoneData.y, zoneData.w, zoneData.h);
      this.physics.add.existing(zone, true);
      zone.body.setSize(zoneData.w, zoneData.h);
      zone.body.updateFromGameObject();
      zone.setData('objectiveId', zoneData.id);
      this.tutorialZones.add(zone);
    });
  }

  createTutorialPanel() {
    if (!this.level.isTutorial) {
      return;
    }

    const panelX = this.scale.width - 306;
    this.tutorialPanel = this.add.container(panelX, 64).setScrollFactor(0).setDepth(1002);
    const background = this.add.rectangle(0, 0, 296, 456, 0x151225, 0.86)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffd166);
    const title = this.add.text(12, 10, 'TUTORIAL CHECKLIST', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ffd166',
      stroke: '#120f22',
      strokeThickness: 3,
    });
    this.tutorialProgressText = this.add.text(216, 10, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#fff7d6',
      stroke: '#120f22',
      strokeThickness: 3,
    });
    this.tutorialPanel.add([background, title, this.tutorialProgressText]);

    this.tutorialCategoryTexts = [];
    this.tutorialCategories.forEach((category, index) => {
      const text = this.add.text(14, 38 + index * 21, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: '#fff7d6',
        stroke: '#120f22',
        strokeThickness: 3,
      });
      this.tutorialCategoryTexts.push(text);
      this.tutorialPanel.add(text);
    });

    const activeTitle = this.add.text(14, 258, 'ACTIVE SECTION', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#9de8ff',
      stroke: '#120f22',
      strokeThickness: 3,
    });
    this.tutorialPanel.add(activeTitle);
    this.tutorialTaskRows = [];
    for (let i = 0; i < 6; i += 1) {
      const row = this.add.container(14, 282 + i * 27);
      const icon = this.add.image(8, 9, 'particle').setDisplaySize(16, 16);
      const text = this.add.text(24, 1, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#fff7d6',
        stroke: '#120f22',
        strokeThickness: 3,
        wordWrap: { width: 216 },
      });
      const status = this.add.text(252, 1, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#62d26f',
        stroke: '#120f22',
        strokeThickness: 3,
      });
      row.add([icon, text, status]);
      this.tutorialTaskRows.push({ row, icon, text, status });
      this.tutorialPanel.add(row);
    }
    this.updateTutorialPanel(true);
  }

  getTutorialIconForCategory(title) {
    const category = this.tutorialCategories?.find((item) => (
      item.name === title || item.name.startsWith(title) || title.startsWith(item.name)
    ));
    const firstTask = category ? this.tutorialTaskMap.get(category.taskIds[0]) : null;
    return this.textures.exists(firstTask?.icon) ? firstTask.icon : 'particle';
  }

  updateTutorialPanel(force = false) {
    if (!this.level.isTutorial || !this.tutorialPanel || (!force && !this.tutorialDirty)) {
      return;
    }
    this.tutorialDirty = false;

    const done = this.tutorialCompleted.size;
    this.tutorialProgressText.setText(`${done}/${this.tutorialTotalTasks}`);
    let activeCategory = this.tutorialCategories.find((category) => (
      !category.taskIds.every((id) => this.tutorialCompleted.has(id))
    ));
    if (!activeCategory) {
      activeCategory = this.tutorialCategories[this.tutorialCategories.length - 1];
    }

    this.tutorialCategories.forEach((category, index) => {
      const completed = category.taskIds.filter((id) => this.tutorialCompleted.has(id)).length;
      const isComplete = completed === category.taskIds.length;
      const isActive = category === activeCategory && !isComplete;
      const mark = isComplete ? '\u2713' : isActive ? '>' : '-';
      this.tutorialCategoryTexts[index].setText(`${mark} ${category.name} ${completed}/${category.taskIds.length}`);
      this.tutorialCategoryTexts[index].setColor(isComplete ? '#62d26f' : isActive ? '#ffd166' : '#fff7d6');
    });

    const activeTasks = activeCategory.taskIds.map((id) => this.tutorialTaskMap.get(id)).filter(Boolean);
    this.tutorialTaskRows.forEach((rowData, index) => {
      const task = activeTasks[index];
      rowData.row.setVisible(Boolean(task));
      if (!task) {
        return;
      }
      rowData.icon.setTexture(this.textures.exists(task.icon) ? task.icon : 'particle');
      rowData.icon.setDisplaySize(16, 16);
      rowData.text.setText(task.instruction);
      const isComplete = this.tutorialCompleted.has(task.id);
      rowData.status.setText(isComplete ? '\u2713' : '...');
      rowData.status.setColor(isComplete ? '#62d26f' : '#ffb3c4');
      rowData.text.setColor(isComplete ? '#9de8ff' : '#fff7d6');
    });
  }

  updateTutorialObjectives() {
    if (!this.level.isTutorial || !this.player || this.levelComplete) {
      return;
    }

    const speed = Math.abs(this.player.body.velocity.x);
    if (speed > 26) {
      this.completeTutorialObjective('move_walk', { silent: true });
    }
    if (speed > this.player.baseSpeed * 0.78) {
      this.completeTutorialObjective('move_run', { silent: true });
    }
    if (this.player.isInvincible()) {
      this.completeTutorialObjective('survive_invincible', { silent: true });
    }
    if (this.boss?.projectiles?.getLength() > 0 && this.bossMusicStarted) {
      this.completeTutorialObjective('boss_dodge', { silent: true });
    }
  }

  onPlayerJump(isDoubleJump) {
    this.completeTutorialObjective('move_jump');
    if (isDoubleJump) {
      this.completeTutorialObjective('power_double');
    }
  }

  completeTutorialObjective(id, options = {}) {
    if (!this.level.isTutorial || !id || this.tutorialCompleted?.has(id) || !this.tutorialTaskMap?.has(id)) {
      return;
    }

    this.tutorialCompleted.add(id);
    this.tutorialDirty = true;
    const task = this.tutorialTaskMap.get(id);
    if (!options.silent && this.ui) {
      this.ui.showMessage(`\u2713 ${task.instruction}`, '#62d26f', 1000);
      this.audio.play('bonus');
    }
    if (this.player) {
      this.spawnBurst(this.player.x, this.player.y - 20, 0x62d26f, options.silent ? 3 : 8);
    }
    this.refreshTutorialGates();
  }

  refreshTutorialGates() {
    if (!this.tutorialGates) {
      return;
    }

    this.tutorialGates.children.each((gate) => {
      const requirements = gate.getData('requires') || [];
      const completed = requirements.filter((id) => this.tutorialCompleted?.has(id)).length;
      if (gate.getData('opened')) {
        return;
      }

      gate.label?.setText(`LOCKED ${completed}/${requirements.length}`);
      if (completed !== requirements.length) {
        return;
      }

      gate.setData('opened', true);
      gate.body.enable = false;
      gate.label?.setText('OPEN');
      gate.label?.setColor('#62d26f');
      gate.setFillStyle(0x62d26f, 0.18);
      gate.setStrokeStyle(3, 0x62d26f);
      this.audio?.play('levelComplete');
      this.tweens.add({
        targets: [gate, gate.label],
        alpha: 0.22,
        duration: 420,
        ease: Phaser.Math.Easing.Sine.Out,
      });
    });
  }

  handleTutorialGate(player, gate) {
    if (gate.getData('opened') || this.time.now < this.tutorialGateMessageAt) {
      return;
    }
    this.tutorialGateMessageAt = this.time.now + 900;
    const missingId = (gate.getData('requires') || []).find((id) => !this.tutorialCompleted.has(id));
    const missing = this.tutorialTaskMap.get(missingId);
    this.ui?.showMessage(missing ? `Finish: ${missing.instruction}` : 'Finish this section first!', '#ffb3c4', 900);
  }

  handleTutorialZone(player, zone) {
    this.completeTutorialObjective(zone.getData('objectiveId'));
  }

  isTutorialComplete() {
    return !this.level.isTutorial || this.tutorialCompleted?.size === this.tutorialTotalTasks;
  }

  showTutorialCelebration() {
    this.ui?.showMessage('PawPaw is Ready!', '#ffd166', 1800);
    for (let i = 0; i < 6; i += 1) {
      this.time.delayedCall(i * 120, () => {
        this.spawnBurst(this.player.x + Phaser.Math.Between(-90, 90), this.player.y - Phaser.Math.Between(30, 120), 0xffd166, 14);
      });
    }
  }

  createBackground() {
    const theme = this.level.theme;
    const graphics = this.add.graphics().setDepth(-30);
    graphics.fillStyle(this.hex(theme.sky), 1);
    graphics.fillRect(0, 0, this.level.width, this.level.height);
    graphics.fillStyle(this.hex(theme.horizon), 1);
    graphics.fillRect(0, 260, this.level.width, 280);

    if (this.level.biome === 'city') {
      this.drawCityBackground(graphics);
    } else if (this.level.biome === 'rooftop') {
      this.drawRooftopBackground(graphics);
    } else if (this.level.biome === 'river') {
      this.drawRiverBackground(graphics);
    } else if (this.level.biome === 'cave') {
      this.drawCaveBackground(graphics);
    } else if (this.level.biome === 'sky') {
      this.drawSkyBackground(graphics);
    } else if (this.level.biome === 'forest') {
      this.drawForestBackground(graphics);
    } else if (this.level.biome === 'castle') {
      this.drawCastleBackground(graphics);
    } else {
      this.drawGrassBackground(graphics);
    }
  }

  drawGrassBackground(graphics) {
    graphics.fillStyle(0xffffff, 0.9);
    for (let x = 120; x < this.level.width; x += 620) {
      graphics.fillRect(x, 100, 68, 18);
      graphics.fillRect(x + 20, 84, 48, 18);
      graphics.fillRect(x + 62, 110, 42, 14);
    }
    graphics.fillStyle(0x4a9d67, 1);
    for (let x = 0; x < this.level.width; x += 260) {
      graphics.fillTriangle(x, 360, x + 160, 190, x + 340, 360);
    }
  }

  drawCityBackground(graphics) {
    graphics.fillStyle(0x4d5b8f, 1);
    for (let x = 40; x < this.level.width; x += 190) {
      const height = 130 + (x % 380);
      graphics.fillRect(x, 400 - height, 120, height);
      graphics.fillStyle(0xf5d95a, 0.8);
      for (let wy = 400 - height + 24; wy < 380; wy += 32) {
        graphics.fillRect(x + 18, wy, 16, 12);
        graphics.fillRect(x + 58, wy, 16, 12);
      }
      graphics.fillStyle(0x4d5b8f, 1);
    }
    graphics.fillStyle(0x252a34, 1);
    graphics.fillRect(0, 455, this.level.width, 55);
    graphics.fillStyle(0xf5d95a, 1);
    for (let x = 0; x < this.level.width; x += 96) {
      graphics.fillRect(x, 480, 44, 4);
    }
  }

  drawRooftopBackground(graphics) {
    graphics.fillStyle(0xf8d7a0, 0.95);
    graphics.fillRect(0, 320, this.level.width, 220);
    graphics.fillStyle(0x7f8ca0, 1);
    for (let x = 0; x < this.level.width; x += 330) {
      graphics.fillRect(x, 220, 210, 230);
      graphics.fillRect(x + 30, 175, 90, 45);
      graphics.fillStyle(0x5b6375, 1);
      graphics.fillRect(x + 150, 185, 18, 35);
      graphics.fillStyle(0x7f8ca0, 1);
    }
    graphics.fillStyle(0xffffff, 0.85);
    for (let x = 120; x < this.level.width; x += 700) {
      graphics.fillRect(x, 95, 76, 18);
      graphics.fillRect(x + 22, 78, 52, 20);
    }
  }

  drawRiverBackground(graphics) {
    graphics.fillStyle(0x72d8ff, 1);
    graphics.fillRect(0, 0, this.level.width, 540);
    graphics.fillStyle(0x4cb6e8, 1);
    graphics.fillRect(0, 410, this.level.width, 130);
    graphics.fillStyle(0xd9f7ff, 0.8);
    for (let x = 0; x < this.level.width; x += 130) {
      graphics.fillRect(x, 450, 70, 4);
      graphics.fillRect(x + 42, 485, 80, 4);
    }
    graphics.fillStyle(0x439967, 1);
    for (let x = 0; x < this.level.width; x += 420) {
      graphics.fillTriangle(x, 360, x + 160, 220, x + 330, 360);
    }
  }

  drawCaveBackground(graphics) {
    graphics.fillStyle(0x111020, 0.55);
    for (let x = 0; x < this.level.width; x += 120) {
      graphics.fillRect(x, 0, 36, 120 + (x % 240));
      graphics.fillRect(x + 56, 420 - (x % 100), 42, 140);
    }
    graphics.fillStyle(0x8f7fd0, 0.75);
    for (let x = 220; x < this.level.width; x += 500) {
      graphics.fillRect(x, 150, 8, 38);
      graphics.fillRect(x + 14, 135, 8, 54);
    }
  }

  drawSkyBackground(graphics) {
    graphics.fillStyle(0xffffff, 0.92);
    for (let x = 80; x < this.level.width; x += 430) {
      graphics.fillRect(x, 150, 90, 22);
      graphics.fillRect(x + 24, 126, 64, 26);
      graphics.fillRect(x + 86, 160, 54, 18);
    }
    graphics.fillStyle(0xf8df7a, 0.7);
    graphics.fillRect(0, 418, this.level.width, 122);
  }

  drawForestBackground(graphics) {
    graphics.fillStyle(0xd8e6ff, 1);
    for (let x = 80; x < this.level.width; x += 540) {
      graphics.fillRect(x, 74, 4, 4);
      graphics.fillRect(x + 120, 130, 4, 4);
      graphics.fillRect(x + 260, 96, 4, 4);
    }
    for (let x = 0; x < this.level.width; x += 90) {
      graphics.fillStyle(0x152a2a, 1);
      graphics.fillRect(x + 28, 300, 18, 140);
      graphics.fillStyle(0x20513a, 1);
      graphics.fillTriangle(x, 320, x + 38, 205, x + 86, 320);
      graphics.fillTriangle(x + 8, 270, x + 38, 168, x + 78, 270);
    }
  }

  drawCastleBackground(graphics) {
    graphics.fillStyle(0x0b0812, 0.55);
    for (let x = 0; x < this.level.width; x += 180) {
      graphics.fillRect(x, 210, 86, 240);
      graphics.fillRect(x + 18, 172, 50, 40);
      graphics.fillRect(x + 24, 245, 14, 22);
      graphics.fillRect(x + 52, 245, 14, 22);
    }
    graphics.fillStyle(0xd53b68, 0.85);
    if (this.level.bossArena) {
      graphics.fillRect(this.level.bossArena.minX, 164, this.level.bossArena.maxX - this.level.bossArena.minX, 8);
    }
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    this.level.platforms.forEach((platformData) => {
      const texture = platformData.texture || `tile-${this.level.theme.ground}`;
      const platform = this.add.tileSprite(
        platformData.x + platformData.w / 2,
        platformData.y + platformData.h / 2,
        platformData.w,
        platformData.h,
        texture,
      );
      platform.setDepth(5);
      this.physics.add.existing(platform, true);
      platform.body.setSize(platformData.w, platformData.h);
      platform.body.updateFromGameObject();
      this.platforms.add(platform);
    });
  }

  createMovingPlatforms() {
    this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.fallingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
    this.disappearingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });

    const makeOneWay = (platform) => {
      platform.body.checkCollision.down = false;
      platform.body.checkCollision.left = false;
      platform.body.checkCollision.right = false;
    };

    (this.level.movingPlatforms || []).forEach((data) => {
      const platform = this.add.tileSprite(data.x, data.y, data.w, data.h, data.texture || `tile-${this.level.theme.ground}`);
      this.physics.add.existing(platform);
      platform.body.allowGravity = false;
      platform.body.immovable = true;
      platform.body.setSize(data.w, data.h);
      makeOneWay(platform);
      platform.setData({ ...data, startX: data.x, startY: data.y, direction: 1 });
      platform.body.setVelocity(
        data.axis === 'x' ? data.speed : 0,
        data.axis === 'y' ? data.speed : 0,
      );
      platform.setDepth(8);
      this.movingPlatforms.add(platform);
    });

    (this.level.fallingPlatforms || []).forEach((data) => {
      const platform = this.add.tileSprite(data.x, data.y, data.w, data.h, data.texture || `tile-${this.level.theme.ground}`);
      this.physics.add.existing(platform);
      platform.body.allowGravity = false;
      platform.body.immovable = true;
      platform.body.setSize(data.w, data.h);
      makeOneWay(platform);
      platform.setData({ ...data, startX: data.x, startY: data.y, falling: false });
      platform.setDepth(8);
      this.fallingPlatforms.add(platform);
    });

    (this.level.disappearingPlatforms || []).forEach((data) => {
      const platform = this.add.tileSprite(data.x, data.y, data.w, data.h, data.texture || `tile-${this.level.theme.ground}`);
      this.physics.add.existing(platform);
      platform.body.allowGravity = false;
      platform.body.immovable = true;
      platform.body.setSize(data.w, data.h);
      makeOneWay(platform);
      platform.setData({ ...data, startTime: this.time.now });
      platform.setDepth(8);
      this.disappearingPlatforms.add(platform);
    });
  }

  createScenarioHazards() {
    this.hazards = this.physics.add.staticGroup();
    this.movingHazards = this.physics.add.group({ allowGravity: false, immovable: true });

    (this.level.hazards || []).forEach((data) => {
      const hazard = this.add.tileSprite(data.x + data.w / 2, data.y + data.h / 2, data.w, data.h, `hazard-${data.type}`);
      this.physics.add.existing(hazard, true);
      hazard.body.setSize(data.w, data.h);
      hazard.body.updateFromGameObject();
      hazard.setDepth(12);
      hazard.setData({ ...data, instant: data.instant, hazardType: data.type });
      this.hazards.add(hazard);
    });

    (this.level.movingHazards || []).forEach((data) => {
      const hazard = this.add.sprite(data.x, data.y, data.texture || 'vehicle-car');
      this.physics.add.existing(hazard);
      hazard.body.allowGravity = false;
      hazard.body.immovable = true;
      hazard.body.setSize(data.w, data.h);
      hazard.setDisplaySize(data.w, data.h);
      hazard.setDepth(32);
      hazard.setData({ ...data });
      if (data.vertical) {
        hazard.body.setVelocityY(data.speed);
      } else {
        hazard.body.setVelocityX(data.speed);
      }
      this.movingHazards.add(hazard);
    });
  }

  createBlocks() {
    this.blocks = this.physics.add.staticGroup();
    (this.level.blocks || []).forEach((data) => {
      const texture = data.type === 'hidden' ? 'block-hidden' : `block-${data.type}`;
      const block = this.physics.add.staticSprite(data.x, data.y, texture);
      block.body.setSize(32, 32);
      block.setDepth(18);
      block.setData({ ...data, used: false });
      if (data.type === 'hidden') {
        block.setAlpha(0);
      }
      this.blocks.add(block);
    });
  }

  createSecretEntrances() {
    this.secretEntrances = this.physics.add.staticGroup();
    (this.level.secretEntrances || []).forEach((data) => {
      const entrance = this.physics.add.staticSprite(data.x, data.y, data.texture || 'secret-box');
      entrance.body.setSize(data.w, data.h);
      entrance.setDepth(16);
      entrance.setData({ ...data, used: false });
      this.secretEntrances.add(entrance);
    });
  }

  createCollectibles() {
    this.collectibles = this.physics.add.group({ allowGravity: false, immovable: true });
    const powerPositions = new Set(this.level.powerUps.map((item) => `${item.x},${item.y}`));
    this.level.collectibles
      .filter((data) => !powerPositions.has(`${data.x},${data.y}`))
      .forEach((data) => {
        this.collectibles.add(new Collectible(this, data));
      });
  }

  createPowerUps() {
    this.powerUps = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.powerUps.forEach((data) => {
      this.powerUps.add(new PowerUp(this, data));
    });
  }

  createCheckpoint() {
    this.checkpointSprite = null;
    if (!this.level.checkpoint) {
      return;
    }
    this.checkpointSprite = this.physics.add.staticSprite(
      this.level.checkpoint.x,
      this.level.checkpoint.y,
      'checkpoint',
    );
    // Tall trigger body so the checkpoint registers when running past on the
    // ground below the floating bell sprite.
    this.checkpointSprite.body.setSize(36, 150);
    this.checkpointSprite.setDepth(20);
  }

  createGoal() {
    this.goal = null;
    if (!this.level.goal) {
      return;
    }
    this.goal = this.physics.add.staticSprite(this.level.goal.x, this.level.goal.y, 'goal');
    this.goal.body.setSize(28, 56);
    this.goal.setDepth(20);
  }

  createEnemies() {
    this.enemies = this.physics.add.group();
    this.level.enemies.forEach((enemyData) => {
      this.enemies.add(new Enemy(this, enemyData));
    });
  }

  createPlayer() {
    this.player = new Player(this, this.level.playerStart.x, this.level.playerStart.y);
    this.player.play('cat-idle');
  }

  createPlayerProjectiles() {
    this.playerProjectiles = this.physics.add.group({ allowGravity: false });
  }

  createChaseHazard() {
    this.chaser = null;
    if (!this.level.chase) {
      return;
    }

    const data = this.level.chase;
    this.chaser = this.physics.add.sprite(data.startX - 160, 456, data.texture || 'chase-orb');
    this.chaser.body.allowGravity = false;
    this.chaser.body.setSize(42, 42);
    this.chaser.setDepth(38);
    this.chaser.setVisible(false);
    this.chaser.setData({ ...data });
  }

  createBoss() {
    this.boss = null;
    if (!this.level.boss) {
      return;
    }
    this.boss = new Boss(this, this.level.boss, this.level.bossArena);
  }

  createEnemyArenas() {
    this.arenas = [];
    this.arenaWalls = this.physics.add.staticGroup();
    this.activeArena = null;
    (this.level.arenas || []).forEach((data) => {
      const triggerZone = this.add.zone(data.trigger.x, data.trigger.y, data.trigger.w, data.trigger.h);
      this.physics.add.existing(triggerZone, true);

      const wallTop = data.wallTop ?? 280;
      const wallHeight = data.wallHeight ?? 260;
      const wallWidth = data.wallWidth ?? 24;
      const makeWall = (wx) => {
        const wall = this.add.rectangle(wx, wallTop + wallHeight / 2, wallWidth, wallHeight, 0xffb3c4, 0.16)
          .setStrokeStyle(2, 0xffd166)
          .setDepth(40)
          .setVisible(false);
        this.physics.add.existing(wall, true);
        wall.body.enable = false;
        this.arenaWalls.add(wall);
        return wall;
      };

      const arena = {
        ...data,
        triggerZone,
        leftWall: makeWall(data.minX),
        rightWall: makeWall(data.maxX),
        enemies: [],
        activated: false,
        cleared: false,
      };
      this.arenas.push(arena);

      this.physics.add.overlap(this.player, triggerZone, () => this.activateArena(arena), null, this);
    });

    this.physics.add.collider(this.player, this.arenaWalls);
  }

  activateArena(arena) {
    if (arena.activated || arena.cleared || this.levelComplete) {
      return;
    }
    arena.activated = true;
    this.activeArena = arena;

    [arena.leftWall, arena.rightWall].forEach((wall) => {
      wall.setVisible(true);
      wall.body.enable = true;
      this.tweens.add({ targets: wall, alpha: 0.42, duration: 250, yoyo: true, repeat: 2 });
    });

    (arena.enemies || []).forEach((enemyData) => {
      const enemy = new Enemy(this, enemyData);
      this.enemies.add(enemy);
      this.physics.add.collider(enemy, this.platforms);
      this.physics.add.collider(enemy, this.movingPlatforms);
      this.physics.add.overlap(this.player, enemy, this.handleEnemyCollision, null, this);
      this.physics.add.overlap(enemy, this.playerProjectiles, (e, projectile) => this.projectileHitsEnemy(projectile, e), null, this);
      arena.spawned = arena.spawned || [];
      arena.spawned.push(enemy);
    });

    this.audio.play('bossAppear');
    this.ui.showMessage(arena.label || 'Arena! Defeat every enemy to pass!', '#ffb3c4', 2000);
  }

  updateArenas() {
    if (!this.activeArena || this.levelComplete) {
      return;
    }
    const arena = this.activeArena;
    const remaining = (arena.spawned || []).filter((enemy) => enemy.active && !enemy.defeated);
    if (remaining.length > 0) {
      return;
    }

    arena.cleared = true;
    this.activeArena = null;
    [arena.leftWall, arena.rightWall].forEach((wall) => {
      wall.body.enable = false;
      this.tweens.add({
        targets: wall,
        alpha: 0,
        duration: 320,
        onComplete: () => wall.setVisible(false),
      });
    });
    this.state.score += arena.reward || 800;
    LevelManager.saveRunState(this, this.state);
    this.audio.play('levelComplete');
    this.ui.showMessage('Arena cleared! The path is open!', '#62d26f', 1700);
    this.spawnBurst(this.player.x, this.player.y - 20, 0x62d26f, 18);
  }

  createCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.movingPlatforms, this.handleMovingPlatform, null, this);
    this.physics.add.collider(this.player, this.disappearingPlatforms, this.handleDisappearingPlatform, null, this);
    this.physics.add.collider(this.player, this.fallingPlatforms, this.handleFallingPlatform, null, this);
    this.physics.add.collider(this.player, this.blocks, this.handleBlockCollision, null, this);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.movingPlatforms);
    this.physics.add.overlap(this.player, this.collectibles, this.collectFood, null, this);
    this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.handleHazardCollision, null, this);
    this.physics.add.overlap(this.player, this.movingHazards, this.handleHazardCollision, null, this);
    this.physics.add.overlap(this.player, this.secretEntrances, this.enterSecret, null, this);

    if (this.checkpointSprite) {
      this.physics.add.overlap(this.player, this.checkpointSprite, this.activateCheckpoint, null, this);
    }
    if (this.goal) {
      this.physics.add.overlap(this.player, this.goal, () => this.completeLevel(false), null, this);
    }

    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, null, this);
    this.physics.add.collider(this.playerProjectiles, this.platforms, this.destroyProjectile, null, this);
    this.physics.add.collider(this.playerProjectiles, this.blocks, this.projectileHitsBlock, null, this);
    this.physics.add.overlap(this.playerProjectiles, this.enemies, this.projectileHitsEnemy, null, this);

    if (this.boss) {
      this.physics.add.collider(this.boss, this.platforms);
      this.physics.add.collider(this.boss, this.movingPlatforms);
      this.physics.add.collider(this.boss.projectiles, this.platforms, (projectile) => projectile.destroy());
      this.physics.add.overlap(this.player, this.boss, this.handleBossCollision, null, this);
      this.physics.add.overlap(this.player, this.boss.projectiles, this.handleProjectileCollision, null, this);
      this.physics.add.overlap(this.boss, this.playerProjectiles, this.projectileHitsBoss, null, this);
    }

    if (this.chaser) {
      this.physics.add.overlap(this.player, this.chaser, this.handleHazardCollision, null, this);
    }
    if (this.tutorialGates) {
      this.physics.add.collider(this.player, this.tutorialGates, this.handleTutorialGate, null, this);
    }
    if (this.tutorialZones) {
      this.physics.add.overlap(this.player, this.tutorialZones, this.handleTutorialZone, null, this);
    }
  }

  handleThrowInput() {
    if (
      !this.player
      || this.player.disableInput
      || this.levelComplete
      || this.respawning
      || !Phaser.Input.Keyboard.JustDown(this.player.controls.space)
    ) {
      return;
    }
    this.throwFishbone();
  }

  throwFishbone() {
    const now = this.time.now;
    const boosted = this.player.hasProjectileBoost(now);
    const cooldown = boosted ? 260 : 430;
    if (now < this.nextThrowAt) {
      this.completeTutorialObjective('attack_cooldown');
      return;
    }

    this.nextThrowAt = now + cooldown;
    this.completeTutorialObjective('attack_throw');
    const direction = this.player.flipX ? -1 : 1;
    const projectile = this.playerProjectiles.create(
      this.player.x + direction * 22,
      this.player.y - 4,
      boosted ? 'fishbone-strong' : 'fishbone',
    );
    projectile.body.allowGravity = false;
    projectile.setDepth(60);
    projectile.setFlipX(direction < 0);
    projectile.setVelocity(direction * (boosted ? 520 : 420), boosted ? -20 : 0);
    projectile.setData('bornAt', now);
    projectile.setData('damage', boosted ? 2 : 1);
    projectile.setData('range', boosted ? 560 : 410);
    projectile.setData('startX', projectile.x);
    this.player.stateName = 'throwing';
    this.audio.play('throw');
    this.spawnBurst(projectile.x - direction * 6, projectile.y, boosted ? 0xd8dde8 : 0xfff7d6, 4);
  }

  destroyProjectile(projectile) {
    if (!projectile?.active) {
      return;
    }
    this.spawnBurst(projectile.x, projectile.y, 0xfff7d6, 4);
    projectile.destroy();
  }

  projectileHitsBlock(projectile, block) {
    if (block.getData('type') === 'breakable') {
      this.breakBlock(block);
    }
    this.destroyProjectile(projectile);
  }

  projectileHitsEnemy(projectile, enemy) {
    if (!projectile.active || !enemy.active || enemy.defeated) {
      return;
    }
    enemy.defeat();
    this.completeTutorialObjective(enemy.getData('objectiveId'));
    this.completeTutorialObjective('attack_enemy_projectile');
    this.state.score += 300;
    LevelManager.saveRunState(this, this.state);
    this.audio.play('enemyProjectile');
    this.destroyProjectile(projectile);
  }

  projectileHitsBoss(boss, projectile) {
    if (!projectile.active || !boss.active || boss.defeated) {
      return;
    }

    const damage = boss.projectileDamage === 0 ? 0 : projectile.getData('damage') || 1;
    const didHit = boss.takeProjectileHit(damage);
    if (didHit) {
      this.completeTutorialObjective('boss_throw');
      this.state.score += 650;
      LevelManager.saveRunState(this, this.state);
      this.audio.play('projectileHit');
      this.spawnBurst(projectile.x, projectile.y, 0xffd166, 12);
    }
    this.destroyProjectile(projectile);
  }

  updateMovingObjects() {
    this.movingPlatforms?.children.each((platform) => {
      const data = platform.data.values;
      if (data.axis === 'x') {
        if (platform.x > data.startX + data.distance || platform.x < data.startX - data.distance) {
          platform.body.setVelocityX(-platform.body.velocity.x);
        }
      } else if (platform.y > data.startY + data.distance || platform.y < data.startY - data.distance) {
        platform.body.setVelocityY(-platform.body.velocity.y);
      }
    });

    this.disappearingPlatforms?.children.each((platform) => {
      const period = platform.getData('period') || 1600;
      const visible = Math.floor((this.time.now - platform.getData('startTime')) / period) % 2 === 0;
      platform.setVisible(visible);
      platform.body.enable = visible;
      platform.setAlpha(visible ? 1 : 0.25);
    });

    this.movingHazards?.children.each((hazard) => {
      const data = hazard.data.values;
      if (data.vertical) {
        if (hazard.y > data.maxY || hazard.y < data.minY) {
          hazard.body.setVelocityY(-hazard.body.velocity.y);
        }
      } else if (hazard.x > data.maxX || hazard.x < data.minX) {
        hazard.body.setVelocityX(-hazard.body.velocity.x);
        hazard.setFlipX(hazard.body.velocity.x < 0);
      }
    });

    this.playerProjectiles?.children.each((projectile) => {
      if (!projectile?.active) {
        return;
      }
      if (Math.abs(projectile.x - projectile.getData('startX')) > projectile.getData('range')) {
        this.destroyProjectile(projectile);
      }
    });
  }

  updateBossIntro() {
    if (!this.boss || this.bossMusicStarted || this.player.x < this.level.bossArena.minX - 160) {
      return;
    }
    this.bossMusicStarted = true;
    this.audio.play('bossAppear');
    this.audio.startMusic('boss');
    this.ui.showMessage(`${this.boss.bossName} appears! Use Space to throw fishbones.`, '#ffb3c4', 2400);
  }

  updateChase() {
    if (!this.chaser || !this.chaser.active || !this.chaser.data || this.levelComplete || this.respawning) {
      return;
    }

    const data = this.chaser.data.values;
    if (!this.chaseActive && this.player.x >= data.startX) {
      this.chaseActive = true;
      this.chaser.setVisible(true);
      this.chaser.setPosition(this.player.x - 190, 456);
      this.ui.showMessage('Run! The tower core is rolling!', '#ffb3c4', 1700);
    }

    if (!this.chaseActive) {
      return;
    }

    this.chaser.setVelocityX(data.speed);
    if (this.chaser.x < this.player.x - 240) {
      this.chaser.x = this.player.x - 240;
    }
    if (this.player.x > data.endX) {
      this.chaseActive = false;
      this.chaser.setVelocityX(0);
      this.chaser.setVisible(false);
    }
  }

  collectFood(player, collectible) {
    if (!collectible.active) {
      return;
    }
    collectible.disableBody(true, true);
    this.completeTutorialObjective('collect_food');
    this.completeTutorialObjective(collectible.getData('objectiveId'));
    if (collectible.getData('hiddenCollectible')) {
      this.completeTutorialObjective('collect_hidden');
    }
    this.state.score += 100;
    this.state.food += 1;
    if (this.level.isTutorial && this.state.food >= (this.level.tutorial?.foodGateRequirement || 6)) {
      this.completeTutorialObjective('collect_gate');
    }
    if (!this.state.nextFoodLifeAt) {
      this.state.nextFoodLifeAt = 30;
    }
    if (this.state.food >= this.state.nextFoodLifeAt) {
      this.state.lives += 1;
      this.state.nextFoodLifeAt += 30;
      this.audio.play('life');
      this.ui.showMessage('Snack streak: extra life!', '#62d26f', 1300);
    }
    LevelManager.saveRunState(this, this.state);
    this.audio.play('collect');
    this.spawnBurst(collectible.x, collectible.y, 0xff7ab8, 6);
  }

  collectPowerUp(player, powerUp) {
    if (!powerUp.active) {
      return;
    }

    const data = POWER_UPS[powerUp.type];
    powerUp.disableBody(true, true);
    this.completeTutorialObjective('collect_power');
    if (powerUp.type !== 'double') {
      this.completeTutorialObjective(powerUp.getData('objectiveId'));
    }
    if (powerUp.type === 'life') {
      this.completeTutorialObjective('collect_life');
    }
    if (['speed', 'shield', 'projectile'].includes(powerUp.type)) {
      this.completeTutorialObjective(`power_${powerUp.type}`);
    }
    this.completeTutorialObjective('power_indicator');
    this.state.food += 1;
    this.state.score += 150;

    if (powerUp.type === 'speed') {
      this.player.activateSpeed(data.duration);
    } else if (powerUp.type === 'shield') {
      this.player.activateShield();
    } else if (powerUp.type === 'bonus') {
      this.state.score += 1000;
    } else if (powerUp.type === 'life') {
      this.state.lives += 1;
    } else if (powerUp.type === 'double') {
      this.player.activateDoubleJump(data.duration);
    } else if (powerUp.type === 'projectile') {
      this.player.activateProjectileBoost(data.duration);
    }

    LevelManager.saveRunState(this, this.state);
    this.audio.play(data.sound);
    this.ui.showMessage(POWER_DESCRIPTIONS[powerUp.type], '#ffd166');
    this.spawnBurst(powerUp.x, powerUp.y, data.color, 14);
  }

  handleMovingPlatform(player, platform) {
    this.completeTutorialObjective(platform.getData('objectiveId'));
    this.completeTutorialObjective('platform_moving', { silent: true });
  }

  handleDisappearingPlatform(player, platform) {
    this.completeTutorialObjective(platform.getData('objectiveId'));
  }

  handleFallingPlatform(player, platform) {
    if (platform.getData('falling')) {
      return;
    }
    this.completeTutorialObjective(platform.getData('objectiveId'));
    platform.setData('falling', true);
    this.time.delayedCall(platform.getData('delay') || 550, () => {
      platform.body.enable = false;
      this.tweens.add({
        targets: platform,
        alpha: 0,
        y: platform.y + 18,
        duration: 260,
      });
    });
    this.time.delayedCall(3900, () => {
      platform.setPosition(platform.getData('startX'), platform.getData('startY'));
      platform.setAlpha(1);
      platform.body.enable = true;
      platform.setData('falling', false);
    });
  }

  handleBlockCollision(player, block) {
    // Arcade physics zeroes the upward velocity during separation *before* this
    // collide callback runs, so checking velocity.y < 0 never matched. Use the
    // touch/blocked flags set during separation to detect a hit from below.
    const hitFromBelow = (player.body.blocked.up || player.body.touching.up)
      && player.y > block.y;
    if (!hitFromBelow) {
      return;
    }

    player.setVelocityY(100);
    this.hitBlock(block);
  }

  hitBlock(block) {
    this.completeTutorialObjective(block.getData('objectiveId'));
    if (block.getData('type') === 'hidden') {
      this.completeTutorialObjective('interact_hidden');
      block.setAlpha(1);
      block.setTexture('block-used');
    }

    this.tweens.add({
      targets: block,
      y: block.y - 8,
      duration: 70,
      yoyo: true,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    if (block.getData('type') === 'breakable') {
      this.completeTutorialObjective('interact_break');
      this.breakBlock(block);
      return;
    }

    if (block.getData('used')) {
      this.audio.play('blockHit');
      return;
    }

    block.setData('used', true);
    block.setTexture('block-used');
    if (block.getData('type') === 'mystery') {
      this.completeTutorialObjective('interact_mystery');
    }
    this.releaseBlockReward(block);
  }

  breakBlock(block) {
    if (!block.active) {
      return;
    }
    this.completeTutorialObjective(block.getData('objectiveId'));
    this.audio.play('blockBreak');
    this.spawnBurst(block.x, block.y, 0xc58a4a, 12);
    block.disableBody(true, true);
  }

  releaseBlockReward(block) {
    const reward = block.getData('reward');
    this.audio.play('blockHit');
    if (!reward) {
      this.state.score += 100;
      return;
    }

    if (reward.type === 'power') {
      const power = new PowerUp(this, {
        type: reward.powerType,
        x: block.x,
        y: block.y - 42,
      });
      this.powerUps.add(power);
      this.spawnBurst(power.x, power.y, POWER_UPS[reward.powerType]?.color || 0xffd166, 10);
    } else {
      const count = reward.count || 1;
      for (let i = 0; i < count; i += 1) {
        const food = new Collectible(this, {
          x: block.x - (count - 1) * 16 + i * 32,
          y: block.y - 42,
          color: 'orange',
        });
        this.collectibles.add(food);
      }
    }
  }

  handleHazardCollision(player, hazard) {
    if (this.respawning || this.levelComplete) {
      return;
    }
    this.completeTutorialObjective(hazard.getData?.('objectiveId'));
    if (hazard.getData?.('type') === 'car') {
      this.completeTutorialObjective('avoid_vehicle');
    }
    if (hazard.getData?.('type') === 'rock') {
      this.completeTutorialObjective('avoid_moving');
    }
    if (hazard.getData?.('type') === 'sign') {
      this.completeTutorialObjective('avoid_falling');
    }
    const instant = hazard.getData?.('instant') ?? true;
    if (instant) {
      this.completeTutorialObjective('survive_life_loss');
      this.loseLife('instantHazard');
    } else {
      this.damagePlayer('hazard');
    }
  }

  enterSecret(player, entrance) {
    if (entrance.getData('used')) {
      return;
    }
    entrance.setData('used', true);
    const target = entrance.getData('target');
    if (!target) {
      return;
    }
    this.state.score += entrance.getData('rewardScore') || 500;
    this.completeTutorialObjective(entrance.getData('objectiveId'));
    LevelManager.saveRunState(this, this.state);
    this.audio.play('secret');
    this.ui.showMessage(entrance.getData('label') || 'Secret found!', '#ffd166', 1900);
    this.spawnBurst(player.x, player.y, 0xffd166, 18);
    player.setPosition(target.x, target.y);
    player.setVelocity(0, 0);
    player.setInvincible(800);
  }

  spawnBossMinions(x, y) {
    [
      { type: 'walker', x: x - 90, y: y + 30, patrol: 120, speed: 84 },
      { type: 'flyer', x: x + 90, y: y - 60, patrol: 160, speed: 106, amplitude: 38 },
    ].forEach((enemyData) => {
      const enemy = new Enemy(this, enemyData);
      this.enemies.add(enemy);
      this.physics.add.collider(enemy, this.platforms);
      this.physics.add.collider(enemy, this.movingPlatforms);
      this.physics.add.overlap(this.player, enemy, this.handleEnemyCollision, null, this);
      this.physics.add.overlap(enemy, this.playerProjectiles, (e, projectile) => this.projectileHitsEnemy(projectile, e), null, this);
    });
    this.ui.showMessage('Shadow minions summoned!', '#ffb3c4', 1400);
  }

  activateCheckpoint() {
    if (this.checkpoint.x === this.level.checkpoint.x) {
      return;
    }
    this.checkpoint = { ...this.level.checkpoint };
    this.completeTutorialObjective('interact_checkpoint');
    this.checkpointSprite.setTint(0xffd166);
    this.audio.play('bonus');
    this.ui.showMessage('Checkpoint reached!', '#9de8ff', 1600);
  }

  handleEnemyCollision(player, enemy) {
    if (!enemy.active || enemy.defeated || this.respawning || this.levelComplete) {
      return;
    }

    const stomped = player.body.velocity.y > 90 && player.y < enemy.y - 8;
    if (stomped && enemy.canStomp) {
      enemy.defeat();
      this.completeTutorialObjective(enemy.getData('objectiveId'));
      this.completeTutorialObjective('attack_stomp');
      player.bounce(500);
      this.state.score += 250;
      LevelManager.saveRunState(this, this.state);
      return;
    }

    this.damagePlayer('enemy');
  }

  handleBossCollision(player, boss) {
    if (!boss.active || boss.defeated || this.respawning || this.levelComplete) {
      return;
    }

    const stomped = player.body.velocity.y > 110 && player.y < boss.y - 26;
    if (stomped && boss.canTakeStompHit()) {
      boss.takeStompHit();
      this.completeTutorialObjective('boss_weak');
      player.bounce(580);
      this.state.score += 500;
      LevelManager.saveRunState(this, this.state);
      return;
    } else if (stomped) {
      player.bounce(420);
      this.ui.showMessage('Open the weak spot with fishbones!', '#ffb3c4', 900);
      return;
    }

    this.damagePlayer('boss');
  }

  handleProjectileCollision(player, projectile) {
    if (!projectile.active || this.respawning || this.levelComplete) {
      return;
    }
    projectile.destroy();
    this.damagePlayer('projectile');
  }

  damagePlayer(source) {
    if (this.player.isInvincible()) {
      return;
    }

    this.completeTutorialObjective('survive_damage');
    if (this.player.consumeShield()) {
      this.completeTutorialObjective('survive_shield');
      this.completeTutorialObjective('survive_invincible');
      this.player.setInvincible(900);
      this.audio.play('shield');
      this.ui.showMessage('Shield absorbed the hit!', '#9de8ff', 1200);
      return;
    }

    this.loseLife(source);
  }

  loseLife(source) {
    if (this.respawning || this.levelComplete) {
      return;
    }
    this.respawning = true;
    if (source === 'instantHazard' || source === 'fall') {
      this.completeTutorialObjective('survive_life_loss');
    }
    this.state.lives -= 1;
    LevelManager.saveRunState(this, this.state);
    this.audio.play('hurt');
    this.cameras.main.shake(180, 0.008);

    if (this.state.lives <= 0) {
      this.player.setDefeated();
      this.audio.play('gameOver');
      this.time.delayedCall(800, () => {
        this.scene.start('GameOverScene', { score: this.state.score, levelId: this.level.id });
      });
      return;
    }

    this.player.setHurt();

    if (source === 'timeout') {
      this.levelTimer = Math.max(90, Math.floor(this.level.timer * 0.45));
    }

    this.ui.showMessage(source === 'fall' ? 'Careful below!' : 'Ouch! Try again.', '#ffb3c4', 1200);
    this.time.delayedCall(260, () => this.respawnPlayer());
  }

  respawnPlayer() {
    this.player.disableInput = true;
    this.completeTutorialObjective('survive_respawn');
    this.player.setPosition(this.checkpoint.x, this.checkpoint.y);
    this.player.setVelocity(0, 0);
    this.player.setAlpha(1);
    this.player.setInvincible(1700);
    this.time.delayedCall(180, () => {
      this.player.disableInput = false;
      this.respawning = false;
    });
  }

  completeLevel(fromBoss) {
    if (this.levelComplete) {
      return;
    }
    if (!fromBoss && this.boss && !this.boss.defeated) {
      this.ui.showMessage(`Defeat ${this.boss.bossName} first!`, '#ffb3c4', 1400);
      return;
    }
    if (this.level.isTutorial && !this.isTutorialComplete()) {
      this.ui.showMessage('Finish every tutorial check first!', '#ffb3c4', 1600);
      this.levelComplete = false;
      return;
    }
    this.levelComplete = true;
    this.player.disableInput = true;
    this.player.setVelocity(0, 0);
    const timeBonus = Math.max(0, this.levelTimer) * 10;
    this.state.score += 1000 + timeBonus;
    LevelManager.completeLevel(this, this.level.id, timeBonus);
    this.audio.play(fromBoss ? 'bossDefeat' : 'levelComplete');
    const bossName = this.boss?.bossName || 'Boss';
    const completeMessage = this.level.isTutorial
      ? 'PawPaw is Ready!'
      : fromBoss
        ? `${bossName} defeated!`
        : 'Level complete!';
    this.ui.showMessage(completeMessage, '#ffd166', 1800);

    this.time.delayedCall(1700, () => {
      if (this.level.isTutorial) {
        this.scene.start('MainMenuScene');
      } else if (this.level.id >= LevelManager.getMaxLevel()) {
        this.scene.start('WinScene', {
          score: this.state.score,
          timeBonus,
        });
      } else {
        this.scene.start('GameScene', { levelId: this.level.id + 1 });
      }
    });
  }

  tickTimer() {
    if (this.levelComplete) {
      return;
    }
    this.levelTimer -= 1;
    if (this.levelTimer <= 0) {
      this.loseLife('timeout');
    }
  }

  pauseGame() {
    if (this.levelComplete || this.respawning) {
      return;
    }
    this.scene.pause();
    this.scene.launch('PauseScene', { levelId: this.level.id });
  }

  cleanupProjectiles() {
    if (!this.boss?.projectiles) {
      return;
    }
    this.boss.projectiles.children.each((projectile) => {
      if (!projectile || !projectile.active) {
        return;
      }
      const age = this.time.now - projectile.getData('bornAt');
      if (age > 4500 || projectile.y > this.level.height + 80) {
        projectile.destroy();
      }
    });
  }

  spawnBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.add.image(x, y, 'particle')
        .setTint(color)
        .setDepth(200)
        .setScale(Phaser.Math.FloatBetween(1, 2));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, 52);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(260, 460),
        ease: Phaser.Math.Easing.Quadratic.Out,
        onComplete: () => particle.destroy(),
      });
    }
  }

  hex(value) {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}
