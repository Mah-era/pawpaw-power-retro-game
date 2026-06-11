import Phaser from 'phaser';

const TEXT_STYLE = {
  fontFamily: '"Courier New", monospace',
  fontSize: '16px',
  color: '#fff7d6',
  stroke: '#1c1630',
  strokeThickness: 4,
};

export default class UIManager {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.messageTimer = null;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const panel = scene.add.rectangle(0, 0, scene.scale.width, 54, 0x121022, 0.88)
      .setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x3b315d);
    this.container.add(panel);

    this.scoreText = this.addText(12, 8);
    this.livesText = this.addText(160, 8);
    this.timerText = this.addText(270, 8);
    this.levelText = this.addText(390, 8);
    this.foodText = this.addText(560, 8);
    this.powerText = this.addText(12, 30);
    this.shieldText = this.addText(250, 30);
    this.cooldownText = this.addText(420, 30);

    this.messageText = scene.add.text(scene.scale.width / 2, 64, '', {
      ...TEXT_STYLE,
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1001);
    this.messageText.setVisible(false);

    this.bossText = scene.add.text(scene.scale.width / 2, 478, '', {
      ...TEXT_STYLE,
      fontSize: '16px',
      color: '#ffb3c4',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(1002);
    this.bossText.setVisible(false);

    this.bossBarWidth = 320;
    this.bossBar = scene.add.container(scene.scale.width / 2, 502)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);
    const bossBarBack = scene.add.rectangle(0, 0, this.bossBarWidth + 8, 22, 0x120f22, 0.9)
      .setStrokeStyle(2, 0xffb3c4);
    this.bossBarFill = scene.add.rectangle(-this.bossBarWidth / 2, 0, this.bossBarWidth, 14, 0xff5b7a)
      .setOrigin(0, 0.5);
    this.bossBar.add([bossBarBack, this.bossBarFill]);
  }

  addText(x, y) {
    const text = this.scene.add.text(x, y, '', TEXT_STYLE);
    this.container.add(text);
    return text;
  }

  update(state, player, timer, boss = null) {
    this.scoreText.setText(`SCORE ${String(state.score).padStart(6, '0')}`);
    this.livesText.setText(`LIVES ${state.lives}`);
    this.timerText.setText(`TIME ${Math.max(0, timer)}`);
    this.levelText.setText(`LEVEL ${this.level.id}-${this.level.shortName}`);
    this.foodText.setText(`FOOD ${state.food}`);

    const activePower = player?.getActivePowerLabel(this.scene.time.now) || 'NONE';
    this.powerText.setText(`POWER ${activePower}`);
    this.shieldText.setText(player?.hasShield ? 'SHIELD ON' : 'SHIELD --');
    const cooldown = Math.max(0, (this.scene.nextThrowAt || 0) - this.scene.time.now);
    this.cooldownText.setText(cooldown > 0 ? `FISHBONE ${Math.ceil(cooldown / 100)}` : 'FISHBONE READY');

    if (boss && boss.active && this.scene.bossMusicStarted) {
      this.bossText.setVisible(true);
      this.bossBar.setVisible(true);
      this.bossText.setText(`${boss.bossName.toUpperCase()} HP ${Math.max(0, boss.hp)}/${boss.maxHp}`);
      const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      this.bossBarFill.width = this.bossBarWidth * ratio;
      this.bossBarFill.fillColor = ratio > 0.5 ? 0xff5b7a : ratio > 0.25 ? 0xffa23a : 0xff3b3b;
    } else {
      this.bossText.setVisible(false);
      this.bossBar.setVisible(false);
    }
  }

  showMessage(message, color = '#fff7d6', duration = 2200) {
    if (this.messageTimer) {
      this.messageTimer.remove(false);
    }

    this.messageText.setColor(color);
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.messageText.setVisible(true);
    this.scene.tweens.add({
      targets: this.messageText,
      y: 62,
      duration: 120,
      yoyo: true,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    this.messageTimer = this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this.messageText,
        alpha: 0,
        duration: 180,
        onComplete: () => this.messageText.setVisible(false),
      });
    });
  }

  destroy() {
    this.container.destroy(true);
    this.messageText.destroy();
    this.bossText.destroy();
    this.bossBar.destroy(true);
  }
}
