import Phaser from 'phaser';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, config, arena) {
    super(scene, config.x, config.y, 'boss-0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.bossName = config.name || 'Yarnlord';
    this.maxHp = config.hp || 5;
    this.hp = this.maxHp;
    this.speed = config.speed || 112;
    this.speedBoostOnHit = config.speedBoostOnHit ?? 30;
    this.jumpVelocity = config.jumpVelocity || -500;
    this.jumpMinDelay = config.jumpMinDelay || 2200;
    this.jumpMaxDelay = config.jumpMaxDelay || 3400;
    this.projectileSpeed = config.projectileSpeed || 220;
    this.projectileSpeedRamp = config.projectileSpeedRamp || 28;
    this.projectileInterval = config.projectileInterval || 1900;
    this.projectileRamp = config.projectileRamp || 180;
    this.minProjectileInterval = config.minProjectileInterval || 900;
    this.projectileDamageRequired = config.projectileDamageRequired ?? true;
    this.projectileDamage = config.projectileDamage ?? 1;
    this.stompDamage = config.stompDamage ?? 1;
    this.weakSpotDuration = config.weakSpotDuration || 1300;
    this.weakSpotUntil = 0;
    this.stunnedUntil = 0;
    this.summonAtHp = config.summonAtHp || [];
    this.usedSummons = new Set();
    this.flying = Boolean(config.flying);
    this.baseY = config.y;
    this.flyAmplitude = config.flyAmplitude || 42;
    this.direction = -1;
    this.arena = arena;
    this.invulnerableUntil = 0;
    this.nextAttackAt = 0;
    this.nextJumpAt = 0;
    this.defeated = false;
    this.projectiles = scene.physics.add.group({ allowGravity: false });

    this.setDepth(45);
    this.body.setSize(50, 54);
    this.body.setOffset(7, 9);
    if (config.tint) {
      this.setTint(config.tint);
      this.baseTint = config.tint;
    }
    if (this.flying) {
      this.body.allowGravity = false;
    }
    this.play('boss-idle', true);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.defeated) {
      return;
    }

    if (time < this.stunnedUntil) {
      this.setVelocityX(0);
      this.setTint(0xfff16a);
      return;
    }

    this.setVelocityX(this.speed * this.direction);
    if (this.x <= this.arena.minX) {
      this.direction = 1;
      this.setFlipX(false);
    } else if (this.x >= this.arena.maxX) {
      this.direction = -1;
      this.setFlipX(true);
    }

    if (this.flying) {
      this.y = this.baseY + Math.sin(time / 260) * this.flyAmplitude;
    } else if ((this.body.blocked.down || this.body.touching.down) && time > this.nextJumpAt) {
      this.setVelocityY(this.jumpVelocity);
      this.nextJumpAt = time + Phaser.Math.Between(this.jumpMinDelay, this.jumpMaxDelay);
    }

    if (time > this.nextAttackAt) {
      this.launchProjectile();
      const missingHp = this.maxHp - this.hp;
      this.nextAttackAt = time + Math.max(
        this.minProjectileInterval,
        this.projectileInterval - missingHp * this.projectileRamp,
      );
    }

    if (time < this.invulnerableUntil) {
      this.setTint(0xfff16a);
    } else if (this.baseTint) {
      this.setTint(this.baseTint);
    } else {
      this.clearTint();
    }
  }

  launchProjectile() {
    const projectile = this.projectiles.create(
      this.x + this.direction * 36,
      this.y - 8,
      'boss-projectile',
    );
    projectile.body.allowGravity = false;
    projectile.setDepth(42);
    projectile.setVelocity(
      this.direction * (this.projectileSpeed + (this.maxHp - this.hp) * this.projectileSpeedRamp),
      -30,
    );
    projectile.setAngularVelocity(360 * this.direction);
    projectile.setData('bornAt', this.scene.time.now);
    projectile.setData('danger', true);
    this.scene.time.delayedCall(4200, () => projectile?.destroy());
  }

  canTakeHit(time = this.scene.time.now) {
    return !this.defeated && time >= this.invulnerableUntil;
  }

  canTakeStompHit(time = this.scene.time.now) {
    return this.canTakeHit(time) && (!this.projectileDamageRequired || time <= this.weakSpotUntil);
  }

  takeProjectileHit(damage = this.projectileDamage) {
    if (!this.canTakeHit()) {
      return false;
    }
    this.weakSpotUntil = this.scene.time.now + this.weakSpotDuration;
    this.stunnedUntil = this.scene.time.now + 280;
    return this.takeHit(damage, 'projectile');
  }

  takeStompHit() {
    if (!this.canTakeStompHit()) {
      return false;
    }
    return this.takeHit(this.stompDamage, 'stomp');
  }

  takeHit(damage = 1, source = 'hit') {
    if (!this.canTakeHit()) {
      return false;
    }

    this.hp -= damage;
    this.speed += this.speedBoostOnHit;
    this.invulnerableUntil = this.scene.time.now + 850;
    this.scene.audio?.play('bossHit');
    this.scene.spawnBurst(this.x, this.y - 28, 0xff6b8a, 16);
    this.scene.cameras.main.shake(120, 0.007);
    this.checkSummon();

    if (this.hp <= 0) {
      this.defeat();
    }
    return true;
  }

  checkSummon() {
    this.summonAtHp.forEach((threshold) => {
      if (this.hp <= threshold && !this.usedSummons.has(threshold)) {
        this.usedSummons.add(threshold);
        this.scene.spawnBossMinions?.(this.x, this.y);
      }
    });
  }

  defeat() {
    if (this.defeated) {
      return;
    }
    this.defeated = true;
    this.setVelocity(0, 0);
    this.projectiles.clear(true, true);
    this.scene.audio?.play('bossDefeat');
    this.scene.spawnBurst(this.x, this.y, 0xffd166, 34);
    this.scene.cameras.main.shake(500, 0.014);
    this.scene.tweens.add({
      targets: this,
      angle: 12,
      alpha: 0,
      y: this.y - 50,
      duration: 900,
      ease: Phaser.Math.Easing.Back.In,
      onComplete: () => {
        this.disableBody(true, true);
        this.scene.events.emit('boss-defeated');
      },
    });
  }
}
