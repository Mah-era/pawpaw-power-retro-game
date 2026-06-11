const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '22px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create(data) {
    this.audio = this.registry.get('audioManager');
    this.audio.startMusic('menu');
    this.audio.play('levelComplete');

    const state = this.registry.get('runState') || {};
    const score = data.score || state.score || 0;
    const timeBonus = data.timeBonus || state.lastTimeBonus || 0;

    this.drawBackdrop();
    this.add.text(480, 105, 'PAWPAW POWER WINS!', {
      ...TEXT_STYLE,
      fontSize: '42px',
      color: '#ffd166',
    }).setOrigin(0.5);
    this.add.text(480, 176, 'The calico hero cleared five boss worlds and restored snack-time peace.', {
      ...TEXT_STYLE,
      fontSize: '18px',
      color: '#ffb3c4',
    }).setOrigin(0.5);
    this.add.text(480, 245, `FINAL SCORE ${score}`, TEXT_STYLE).setOrigin(0.5);
    this.add.text(480, 286, `TIME BONUS ${timeBonus}`, TEXT_STYLE).setOrigin(0.5);
    this.createButton(480, 370, 'MAIN MENU', () => this.scene.start('MainMenuScene'));
  }

  drawBackdrop() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x65c8ff, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0xffd166, 1);
    graphics.fillRect(0, 310, 960, 230);
    graphics.fillStyle(0xff7ab8, 1);
    for (let i = 0; i < 10; i += 1) {
      graphics.fillRect(70 + i * 92, 86 + (i % 2) * 34, 28, 28);
    }
    graphics.fillStyle(0x56c66c, 1);
    graphics.fillRect(0, 430, 960, 110);
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
