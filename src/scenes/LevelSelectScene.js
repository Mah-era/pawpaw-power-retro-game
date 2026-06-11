import Phaser from 'phaser';
import LevelManager from '../systems/LevelManager.js';

const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '20px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    this.audio = this.registry.get('audioManager');
    this.audio.startMusic('menu');
    this.cameras.main.setBackgroundColor('#151225');
    this.drawBackdrop();

    this.add.text(480, 64, 'SELECT LEVEL', {
      ...TEXT_STYLE,
      fontSize: '42px',
      color: '#ffd166',
    }).setOrigin(0.5);

    const unlocked = LevelManager.getUnlockedLevel();
    LevelManager.getLevels()
      .filter((level) => !level.isTutorial)
      .forEach((level, index) => {
        const x = 110 + (index % 5) * 185;
        const y = 185 + Math.floor(index / 5) * 145;
        this.createLevelCard(x, y, level, level.id <= unlocked);
      });

    this.createBackButton();
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MainMenuScene'));
    this.input.keyboard.on('keydown-M', () => this.audio.toggleMute());
  }

  drawBackdrop() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x151225, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0x2c244a, 1);
    for (let y = 0; y < 540; y += 32) {
      for (let x = (y / 32) % 2 === 0 ? 0 : 16; x < 960; x += 64) {
        graphics.fillRect(x, y, 32, 16);
      }
    }
  }

  createLevelCard(x, y, level, unlocked) {
    const container = this.add.container(x, y);
    const fill = unlocked ? 0x2f2950 : 0x1d1a2d;
    const stroke = unlocked ? 0xffd166 : 0x6b5d7a;
    const background = this.add.rectangle(0, 0, 165, 92, fill, 1)
      .setStrokeStyle(2, stroke);
    const title = this.add.text(0, -22, `${level.id}. ${level.shortName}`, {
      ...TEXT_STYLE,
      fontSize: '16px',
      color: unlocked ? '#fff7d6' : '#8f879f',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 12, unlocked ? level.name : 'LOCKED', {
      ...TEXT_STYLE,
      fontSize: '10px',
      color: unlocked ? '#ffb3c4' : '#6b5d7a',
      align: 'center',
      wordWrap: { width: 142 },
    }).setOrigin(0.5);

    container.add([background, title, subtitle]);
    if (!unlocked) {
      return;
    }

    container.setSize(165, 92);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      background.setFillStyle(0x4b3d73);
      this.audio.play('buttonHover');
    });
    container.on('pointerout', () => background.setFillStyle(fill));
    container.on('pointerdown', () => {
      this.audio.unlock();
      this.audio.play('buttonClick');
      LevelManager.startNewRun(this, level.id);
      this.scene.start('GameScene', { levelId: level.id });
    });
  }

  createBackButton() {
    const button = this.add.text(480, 472, 'BACK TO MENU', TEXT_STYLE)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setColor('#ffd166');
      this.audio.play('buttonHover');
    });
    button.on('pointerout', () => button.setColor('#fff7d6'));
    button.on('pointerdown', () => {
      this.audio.unlock();
      this.audio.play('buttonClick');
      this.scene.start('MainMenuScene');
    });
  }
}
