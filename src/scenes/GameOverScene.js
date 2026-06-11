import LevelManager from '../systems/LevelManager.js';

const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '22px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    this.audio = this.registry.get('audioManager');
    this.audio.startMusic('menu');
    this.audio.play('gameOver');
    const score = data.score || this.registry.get('runState')?.score || 0;
    const restartLevelId = data.levelId ?? this.registry.get('runState')?.currentLevel ?? 1;

    this.cameras.main.setBackgroundColor('#120f22');
    this.add.rectangle(480, 270, 960, 540, 0x120f22, 1);
    this.add.text(480, 130, 'GAME OVER', {
      ...TEXT_STYLE,
      fontSize: '52px',
      color: '#ff6b8a',
    }).setOrigin(0.5);
    this.add.text(480, 205, `FINAL SCORE ${score}`, TEXT_STYLE).setOrigin(0.5);
    this.createButton(480, 290, 'RESTART', () => {
      LevelManager.startNewRun(this, restartLevelId);
      this.scene.start('GameScene', { levelId: restartLevelId });
    });
    this.createButton(480, 346, 'MAIN MENU', () => this.scene.start('MainMenuScene'));
  }

  createButton(x, y, label, callback) {
    const button = this.add.text(x, y, label, TEXT_STYLE)
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
      callback();
    });
  }
}
