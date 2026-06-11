import Phaser from 'phaser';
import LevelManager from '../systems/LevelManager.js';

const MENU_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '22px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    this.audio = this.registry.get('audioManager');
    this.unlockAudioOnInput();
    this.audio.startMusic('menu');

    this.drawBackground();

    this.add.text(480, 76, 'PAWPAW POWER', {
      fontFamily: '"Courier New", monospace',
      fontSize: '54px',
      color: '#ffd166',
      stroke: '#2d1638',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(480, 130, 'A 16-bit calico cat adventure', {
      ...MENU_STYLE,
      fontSize: '18px',
      color: '#ffb3c4',
    }).setOrigin(0.5);

    this.createButton(480, 196, 'START GAME', () => {
      LevelManager.startNewRun(this, 1);
      this.scene.start('GameScene', { levelId: 1 });
    });
    this.createButton(480, 244, 'TUTORIAL', () => this.scene.start('TutorialScene'));
    this.createButton(480, 292, 'LEVEL SELECT', () => this.scene.start('LevelSelectScene'));
    this.createButton(480, 340, 'CONTROLS', () => this.toggleControls());
    this.muteButton = this.createButton(480, 388, this.getMuteLabel(), () => this.toggleMute());

    this.controlsPanel = this.add.container(480, 470).setVisible(false);
    const panel = this.add.rectangle(0, 0, 740, 112, 0x151225, 0.92)
      .setStrokeStyle(2, 0xffd166);
    const controls = this.add.text(0, 0, [
      'LEFT / RIGHT: move',
      'UP: jump',
      'SPACE: throw fishbone',
      'P: pause   M: mute   ESC: back',
    ], {
      ...MENU_STYLE,
      fontSize: '16px',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);
    this.controlsPanel.add([panel, controls]);

    this.input.keyboard.on('keydown-M', () => this.toggleMute());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.controlsPanel.visible) {
        this.controlsPanel.setVisible(false);
      }
    });
  }

  unlockAudioOnInput() {
    const unlock = () => {
      this.audio.unlock();
      this.audio.startMusic('menu');
    };
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);
  }

  drawBackground() {
    this.cameras.main.setBackgroundColor('#17152b');
    const graphics = this.add.graphics();
    graphics.fillStyle(0x65c8ff, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0xf8df7a, 1);
    graphics.fillRect(0, 270, 960, 270);
    graphics.fillStyle(0x56c66c, 1);
    graphics.fillRect(0, 420, 960, 120);
    graphics.fillStyle(0x35834a, 1);
    for (let x = 0; x < 960; x += 48) {
      graphics.fillRect(x, 412 + (x % 96 === 0 ? 0 : 8), 32, 16);
    }
    graphics.fillStyle(0xffffff, 0.9);
    [[130, 120], [710, 92], [810, 180]].forEach(([x, y]) => {
      graphics.fillRect(x, y, 60, 18);
      graphics.fillRect(x + 16, y - 12, 42, 14);
      graphics.fillRect(x + 60, y + 5, 36, 13);
    });
  }

  createButton(x, y, label, callback) {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, 270, 38, 0x2f2950, 1)
      .setStrokeStyle(2, 0xffd166);
    const text = this.add.text(0, 0, label, MENU_STYLE).setOrigin(0.5);
    container.add([background, text]);
    container.setSize(270, 38);
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
    container.labelText = text;
    return container;
  }

  getMuteLabel() {
    return this.audio?.muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
  }

  toggleMute() {
    this.audio.toggleMute();
    this.muteButton?.labelText.setText(this.getMuteLabel());
  }

  toggleControls() {
    this.controlsPanel.setVisible(!this.controlsPanel.visible);
  }
}
