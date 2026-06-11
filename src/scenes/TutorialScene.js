import LevelManager from '../systems/LevelManager.js';

const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '18px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super('TutorialScene');
  }

  create() {
    this.audio = this.registry.get('audioManager');
    this.audio.startMusic('menu');
    this.cameras.main.setBackgroundColor('#151225');
    this.drawBackdrop();

    this.add.text(480, 48, 'TUTORIAL', {
      ...TEXT_STYLE,
      fontSize: '42px',
      color: '#ffd166',
    }).setOrigin(0.5);

    this.add.text(480, 88, 'Learn PawPaw Power before the first boss.', {
      ...TEXT_STYLE,
      fontSize: '15px',
      color: '#ffb3c4',
    }).setOrigin(0.5);

    this.createVisualGuide();
    this.createInteractiveDemo();

    this.createButton(330, 486, 'START TUTORIAL LEVEL', () => {
      LevelManager.startNewRun(this, 0);
      this.scene.start('GameScene', { levelId: 0 });
    }, 340);
    this.createButton(675, 486, 'MAIN MENU', () => this.scene.start('MainMenuScene'), 210);

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MainMenuScene'));
    this.input.keyboard.on('keydown-M', () => this.audio.toggleMute());
    this.input.keyboard.on('keydown-UP', () => this.demoJump());
    this.input.keyboard.on('keydown-SPACE', () => this.demoThrow());
  }

  drawBackdrop() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x65c8ff, 1);
    graphics.fillRect(0, 0, 960, 205);
    graphics.fillStyle(0xf8df7a, 1);
    graphics.fillRect(0, 205, 960, 335);
    graphics.fillStyle(0x56c66c, 1);
    graphics.fillRect(0, 420, 960, 120);
    graphics.fillStyle(0x2f2950, 0.92);
    graphics.fillRect(48, 116, 864, 332);
    graphics.lineStyle(3, 0xffd166, 1);
    graphics.strokeRect(48, 116, 864, 332);
  }

  createVisualGuide() {
    const cards = [
      {
        x: 170,
        y: 188,
        texture: 'cat-idle-0',
        title: 'Move + Jump',
        body: 'Left / Right to run\nUp Arrow to jump',
      },
      {
        x: 390,
        y: 188,
        texture: 'fishbone',
        title: 'Throw',
        body: 'Space throws fishbones\nNeeded for bosses',
      },
      {
        x: 610,
        y: 188,
        texture: 'power-projectile',
        title: 'Power-Ups',
        body: 'Silver food upgrades\nfishbone damage',
      },
      {
        x: 805,
        y: 188,
        texture: 'boss-0',
        title: 'Bosses',
        body: 'Hit with fishbones\nthen jump weak spots',
      },
    ];

    cards.forEach((card) => {
      this.add.rectangle(card.x, card.y, 176, 132, 0x151225, 0.9)
        .setStrokeStyle(2, 0x6b5d7a);
      this.add.image(card.x, card.y - 30, card.texture)
        .setScale(card.texture === 'fishbone' ? 3 : 2);
      this.add.text(card.x, card.y + 8, card.title, {
        ...TEXT_STYLE,
        fontSize: '15px',
        color: '#ffd166',
      }).setOrigin(0.5);
      this.add.text(card.x, card.y + 44, card.body, {
        ...TEXT_STYLE,
        fontSize: '11px',
        align: 'center',
        lineSpacing: 3,
      }).setOrigin(0.5);
    });
  }

  createInteractiveDemo() {
    this.add.rectangle(480, 358, 700, 132, 0x211b38, 0.92)
      .setStrokeStyle(2, 0xffd166);
    this.add.text(480, 302, 'TRY IT HERE:  UP = HOP    SPACE = THROW', {
      ...TEXT_STYLE,
      fontSize: '15px',
      color: '#ffd166',
    }).setOrigin(0.5);

    this.add.tileSprite(480, 409, 620, 28, 'tile-grass');
    this.demoCat = this.add.sprite(330, 378, 'cat-idle-0').setScale(2);
    this.demoTarget = this.add.sprite(650, 376, 'enemy-walker-0').setScale(2);
    this.demoTargetText = this.add.text(650, 426, 'target', {
      ...TEXT_STYLE,
      fontSize: '12px',
    }).setOrigin(0.5);
  }

  demoJump() {
    if (!this.demoCat || this.demoCat.getData('jumping')) {
      return;
    }
    this.demoCat.setData('jumping', true);
    this.audio.play('jump');
    this.tweens.add({
      targets: this.demoCat,
      y: this.demoCat.y - 62,
      duration: 170,
      yoyo: true,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => this.demoCat.setData('jumping', false),
    });
  }

  demoThrow() {
    if (!this.demoCat || this.time.now < (this.nextDemoThrowAt || 0)) {
      return;
    }

    this.nextDemoThrowAt = this.time.now + 450;
    this.audio.play('throw');
    const bone = this.add.image(this.demoCat.x + 36, this.demoCat.y - 4, 'fishbone')
      .setScale(2.2)
      .setDepth(20);
    this.tweens.add({
      targets: bone,
      x: this.demoTarget.x - 28,
      duration: 360,
      ease: Phaser.Math.Easing.Linear,
      onComplete: () => {
        bone.destroy();
        this.audio.play('projectileHit');
        this.demoTarget.setTint(0xffd166);
        this.tweens.add({
          targets: this.demoTarget,
          x: this.demoTarget.x + 8,
          duration: 45,
          yoyo: true,
          repeat: 2,
          onComplete: () => this.demoTarget.clearTint(),
        });
      },
    });
  }

  createButton(x, y, label, callback, width) {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, width, 38, 0x2f2950, 1)
      .setStrokeStyle(2, 0xffd166);
    const text = this.add.text(0, 0, label, {
      ...TEXT_STYLE,
      fontSize: '18px',
    }).setOrigin(0.5);
    container.add([background, text]);
    container.setSize(width, 38);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      background.setFillStyle(0x4b3d73);
      this.audio.play('buttonHover');
    });
    container.on('pointerout', () => background.setFillStyle(0x2f2950));
    container.on('pointerdown', () => {
      this.audio.unlock();
      this.audio.play('buttonClick');
      callback();
    });
  }
}
