import Phaser from 'phaser';

export const POWER_UPS = {
  speed: {
    texture: 'power-speed',
    color: 0xff4f4f,
    label: 'SPEED',
    description: 'Red food: speed boost!',
    sound: 'speed',
    duration: 10000,
  },
  shield: {
    texture: 'power-shield',
    color: 0x6ecbff,
    label: 'SHIELD',
    description: 'Blue food: shield ready!',
    sound: 'shield',
  },
  bonus: {
    texture: 'power-bonus',
    color: 0xffd166,
    label: 'BONUS',
    description: 'Gold food: big points!',
    sound: 'bonus',
  },
  life: {
    texture: 'power-life',
    color: 0x62d26f,
    label: '1UP',
    description: 'Green food: extra life!',
    sound: 'life',
  },
  double: {
    texture: 'power-double',
    color: 0xb67aff,
    label: 'DOUBLE',
    description: 'Purple food: double jump!',
    sound: 'double',
    duration: 12000,
  },
  projectile: {
    texture: 'power-projectile',
    color: 0xd8dde8,
    label: 'BONE+',
    description: 'Silver food: stronger fishbones!',
    sound: 'projectilePower',
    duration: 13000,
  },
};

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config) {
    const data = POWER_UPS[config.type] || POWER_UPS.bonus;
    super(scene, config.x, config.y, data.texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(20, 20);
    this.body.setOffset(6, 6);
    this.type = config.type;
    this.powerData = data;
    this.setData('objectiveId', config.objectiveId || null);
    this.setDepth(35);

    scene.tweens.add({
      targets: this,
      y: config.y - 6,
      alpha: 0.78,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }
}
