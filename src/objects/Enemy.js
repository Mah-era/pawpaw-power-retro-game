import Phaser from 'phaser';

const TEXTURES = {
  walker: 'enemy-walker-0',
  flyer: 'enemy-flyer-0',
  jumper: 'enemy-jumper-0',
  spiky: 'enemy-spiky',
  traffic: 'enemy-traffic',
  river: 'enemy-river-0',
  rooftop: 'enemy-rooftop-0',
};

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config) {
    super(scene, config.x, config.y, TEXTURES[config.type] || TEXTURES.walker);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = config.type;
    this.speed = config.speed ?? 55;
    this.direction = -1;
    this.patrolStart = config.x - (config.patrol || 160) / 2;
    this.patrolEnd = config.x + (config.patrol || 160) / 2;
    this.baseY = config.y;
    this.amplitude = config.amplitude || 36;
    this.nextHopAt = 0;
    this.defeated = false;
    this.canStomp = !['spiky', 'traffic'].includes(config.type);
    this.setData({ ...config });

    this.setDepth(40);
    this.body.setSize(config.type === 'spiky' ? 25 : 24, config.type === 'flyer' ? 18 : 24);
    this.body.setOffset(4, config.type === 'flyer' ? 7 : 6);

    if (config.type === 'flyer') {
      this.body.allowGravity = false;
      this.play('enemy-flyer', true);
    } else if (config.type === 'river') {
      this.play('enemy-river', true);
    } else if (config.type === 'rooftop') {
      this.play('enemy-rooftop', true);
    } else if (config.type === 'jumper') {
      this.play('enemy-jumper', true);
    } else if (config.type === 'walker') {
      this.play('enemy-walker', true);
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.defeated) {
      return;
    }

    if (this.enemyType === 'flyer') {
      this.updateFlying(time);
    } else if (this.enemyType === 'jumper' || this.enemyType === 'river') {
      this.updateJumping(time);
    } else {
      this.updatePatrol();
    }
  }

  updatePatrol() {
    this.setVelocityX(this.speed * this.direction);
    if (this.x <= this.patrolStart) {
      this.direction = 1;
    } else if (this.x >= this.patrolEnd) {
      this.direction = -1;
    }
    this.setFlipX(this.direction > 0);
  }

  updateFlying(time) {
    this.updatePatrol();
    this.y = this.baseY + Math.sin(time / 280) * this.amplitude;
  }

  updateJumping(time) {
    this.updatePatrol();
    if ((this.body.blocked.down || this.body.touching.down) && time > this.nextHopAt) {
      this.setVelocityY(-430);
      this.nextHopAt = time + 1250;
    }
  }

  defeat() {
    if (this.defeated) {
      return;
    }

    this.defeated = true;
    this.disableBody(true, false);
    this.scene.audio?.play('enemy');
    this.scene.spawnBurst(this.x, this.y, 0xffd166, 10);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 24,
      alpha: 0,
      duration: 240,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => this.destroy(),
    });
  }
}
