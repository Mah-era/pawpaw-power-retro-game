import Phaser from 'phaser';

export default class Collectible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config) {
    super(scene, config.x, config.y, `food-${config.color || 'pink'}-0`);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(18, 18);
    this.body.setOffset(7, 7);
    this.colorName = config.color || 'pink';
    this.setData('objectiveId', config.objectiveId || null);
    this.setData('hiddenCollectible', Boolean(config.hiddenCollectible));
    this.setDepth(34);
    this.play(`food-${this.colorName}`, true);

    scene.tweens.add({
      targets: this,
      y: config.y - 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });
  }
}
