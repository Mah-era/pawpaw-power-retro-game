const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '20px',
  color: '#fff7d6',
  stroke: '#120f22',
  strokeThickness: 5,
};

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(data) {
    this.levelId = data.levelId;
    this.audio = this.registry.get('audioManager');
    this.audio.play('pause');

    this.add.rectangle(480, 270, 960, 540, 0x070611, 0.72);
    this.add.rectangle(480, 270, 420, 380, 0x151225, 0.98)
      .setStrokeStyle(3, 0xffd166);
    this.add.text(480, 116, 'PAUSED', {
      ...TEXT_STYLE,
      fontSize: '42px',
      color: '#ffd166',
    }).setOrigin(0.5);

    this.createButton(480, 190, 'RESUME', () => this.resumeGame());
    this.createButton(480, 244, 'RESTART LEVEL', () => this.restartLevel());
    this.createButton(480, 298, 'MAIN MENU', () => this.mainMenu());
    this.muteButton = this.createButton(480, 352, this.getMuteLabel(), () => this.toggleMute());

    this.volumeText = this.add.text(480, 408, '', {
      ...TEXT_STYLE,
      fontSize: '18px',
    }).setOrigin(0.5);
    this.updateVolumeText();
    this.createVolumeButton(336, 408, '<', -0.1);
    this.createVolumeButton(624, 408, '>', 0.1);

    this.input.keyboard.on('keydown-P', () => this.resumeGame());
    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-M', () => this.toggleMute());
  }

  createButton(x, y, label, callback) {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, 280, 38, 0x2f2950, 1)
      .setStrokeStyle(2, 0xffd166);
    const text = this.add.text(0, 0, label, TEXT_STYLE).setOrigin(0.5);
    container.add([background, text]);
    container.setSize(280, 38);
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

  createVolumeButton(x, y, label, delta) {
    const button = this.add.text(x, y, label, {
      ...TEXT_STYLE,
      fontSize: '26px',
      color: '#ffd166',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      this.audio.unlock();
      this.audio.setVolume(this.audio.volume + delta);
      this.audio.play('buttonClick');
      this.updateVolumeText();
    });
  }

  updateVolumeText() {
    this.volumeText.setText(`VOLUME ${Math.round(this.audio.volume * 100)}%`);
  }

  getMuteLabel() {
    return this.audio.muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
  }

  toggleMute() {
    this.audio.toggleMute();
    this.muteButton.labelText.setText(this.getMuteLabel());
  }

  resumeGame() {
    this.audio.play('buttonClick');
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  restartLevel() {
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('GameScene', { levelId: this.levelId });
  }

  mainMenu() {
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('MainMenuScene');
  }
}
