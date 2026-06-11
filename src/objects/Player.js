import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'cat-idle-0');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(50);
    this.setDragX(0);
    this.setMaxVelocity(520, 900);
    this.body.setSize(22, 27);
    this.body.setOffset(5, 5);
    this.setCollideWorldBounds(true);

    this.controls = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.baseSpeed = 245;
    this.acceleration = 1550;
    this.deceleration = 1850;
    this.jumpVelocity = -610;
    this.coyoteMs = 115;
    this.jumpBufferMs = 130;
    this.lastGroundedAt = 0;
    this.jumpBufferedUntil = 0;
    this.disableInput = false;

    this.hasShield = false;
    this.invincibleUntil = 0;
    this.speedUntil = 0;
    this.doubleJumpUntil = 0;
    this.projectileBoostUntil = 0;
    this.doubleJumpAvailable = false;
    this.blinkTween = null;
    this.wasOnGround = false;
    this.lastGroundY = y;
    this.stateName = 'idle';
    this.hurtUntil = 0;
    this.defeated = false;

    this.shieldAura = scene.add.sprite(x, y, 'shield-bubble')
      .setDepth(49)
      .setAlpha(0.7)
      .setVisible(false);
    scene.tweens.add({
      targets: this.shieldAura,
      angle: 360,
      duration: 1200,
      repeat: -1,
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateMovement(time);
    this.updateEffects(time);
  }

  updateMovement(time) {
    if (this.disableInput) {
      this.setAccelerationX(0);
      return;
    }

    const onGround = this.body.blocked.down || this.body.touching.down;
    if (onGround) {
      this.lastGroundedAt = time;
      this.doubleJumpAvailable = this.hasDoubleJump(time);
    }

    if (Phaser.Input.Keyboard.JustDown(this.controls.up)) {
      this.jumpBufferedUntil = time + this.jumpBufferMs;
    }

    const speedMultiplier = this.hasSpeedBoost(time) ? 1.45 : 1;
    const speed = this.baseSpeed * speedMultiplier;
    const left = this.controls.left.isDown;
    const right = this.controls.right.isDown;

    if (left && !right) {
      this.setAccelerationX(-this.acceleration);
      this.setFlipX(true);
    } else if (right && !left) {
      this.setAccelerationX(this.acceleration);
      this.setFlipX(false);
    } else {
      this.setAccelerationX(0);
      const drag = (this.deceleration * this.scene.game.loop.delta) / 1000;
      if (Math.abs(this.body.velocity.x) <= drag) {
        this.setVelocityX(0);
      } else {
        this.setVelocityX(this.body.velocity.x - Math.sign(this.body.velocity.x) * drag);
      }
    }

    this.setMaxVelocity(speed, 900);

    const wantsJump = time <= this.jumpBufferedUntil;
    const canUseCoyote = time - this.lastGroundedAt <= this.coyoteMs;
    if (wantsJump && (onGround || canUseCoyote)) {
      this.jumpBufferedUntil = 0;
      this.jump(false);
    } else if (wantsJump && this.hasDoubleJump(time) && this.doubleJumpAvailable && !onGround) {
      this.doubleJumpAvailable = false;
      this.jump(true);
    }

    if (
      Phaser.Input.Keyboard.JustUp(this.controls.up)
      && this.body.velocity.y < -230
    ) {
      this.setVelocityY(-230);
    }

    if (onGround && !this.wasOnGround && this.body.velocity.y >= 0) {
      this.scene.completeTutorialObjective?.('move_land');
      const fallDistance = Math.max(0, this.y - this.lastGroundY);
      if (fallDistance > 70) {
        this.scene.spawnBurst(this.x, this.y + 14, 0xffffff, 8);
      }
    }
    if (!onGround && this.wasOnGround) {
      this.lastGroundY = this.y;
    }
    this.wasOnGround = onGround;

    this.updateAnimation(onGround);
  }

  updateAnimation(onGround) {
    if (this.defeated) {
      this.stateName = 'defeated';
      return;
    }
    if (this.scene.time.now < this.hurtUntil) {
      this.stateName = 'hurt';
      return;
    }
    if (!onGround && this.body.velocity.y < -30) {
      this.stateName = 'jumping';
      this.play('cat-jump', true);
    } else if (!onGround && this.body.velocity.y >= -30) {
      this.stateName = 'falling';
      this.play('cat-fall', true);
    } else if (Math.abs(this.body.velocity.x) > this.baseSpeed * 0.78) {
      this.stateName = 'running';
      this.play('cat-run', true);
    } else if (Math.abs(this.body.velocity.x) > 20) {
      this.stateName = 'walking';
      this.play('cat-run', true);
    } else if (this.hasAnyPower()) {
      this.stateName = 'powered-up';
      this.play('cat-idle', true);
    } else {
      this.stateName = 'idle';
      this.play('cat-idle', true);
    }
  }

  hasAnyPower(time = this.scene.time.now) {
    return this.hasShield || this.hasSpeedBoost(time)
      || this.hasDoubleJump(time) || this.hasProjectileBoost(time);
  }

  setHurt(durationMs = 600) {
    this.hurtUntil = this.scene.time.now + durationMs;
    this.stateName = 'hurt';
  }

  setDefeated() {
    this.defeated = true;
    this.stateName = 'defeated';
    this.disableInput = true;
    this.setAccelerationX(0);
    this.setVelocity(0, -260);
    this.setTint(0xff6b8a);
    this.scene.tweens.add({
      targets: this,
      angle: this.flipX ? 90 : -90,
      alpha: 0.2,
      duration: 700,
      ease: Phaser.Math.Easing.Quadratic.In,
    });
  }

  updateEffects(time) {
    this.shieldAura.setPosition(this.x, this.y + 1);
    this.shieldAura.setVisible(this.hasShield && this.active);

    if (this.isInvincible(time)) {
      return;
    }

    if (this.hasSpeedBoost(time)) {
      this.setTint(0xfff16a);
    } else if (this.hasProjectileBoost(time)) {
      this.setTint(0xd8dde8);
    } else if (this.hasDoubleJump(time)) {
      this.setTint(0xd89cff);
    } else {
      this.clearTint();
    }
  }

  jump(isDoubleJump) {
    this.setVelocityY(isDoubleJump ? this.jumpVelocity * 0.92 : this.jumpVelocity);
    this.scene.audio?.play(isDoubleJump ? 'double' : 'jump');
    this.scene.onPlayerJump?.(isDoubleJump);
    if (isDoubleJump) {
      this.scene.spawnBurst(this.x, this.y + 8, 0xd89cff, 8);
    }
  }

  bounce(strength = 470) {
    this.setVelocityY(-strength);
  }

  activateSpeed(durationMs) {
    this.speedUntil = this.scene.time.now + durationMs;
  }

  activateDoubleJump(durationMs) {
    this.doubleJumpUntil = this.scene.time.now + durationMs;
    this.doubleJumpAvailable = true;
  }

  activateProjectileBoost(durationMs) {
    this.projectileBoostUntil = this.scene.time.now + durationMs;
  }

  activateShield() {
    this.hasShield = true;
  }

  consumeShield() {
    if (!this.hasShield) {
      return false;
    }
    this.hasShield = false;
    this.scene.spawnBurst(this.x, this.y, 0x79c7ff, 14);
    return true;
  }

  setInvincible(durationMs = 1500) {
    this.invincibleUntil = this.scene.time.now + durationMs;
    this.stateName = 'invincible';
    if (this.blinkTween) {
      this.blinkTween.stop();
    }
    this.blinkTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.35,
      duration: 85,
      yoyo: true,
      repeat: Math.ceil(durationMs / 170),
      onComplete: () => {
        this.setAlpha(1);
        this.clearTint();
      },
    });
  }

  isInvincible(time = this.scene.time.now) {
    return time < this.invincibleUntil;
  }

  hasSpeedBoost(time = this.scene.time.now) {
    return time < this.speedUntil;
  }

  hasDoubleJump(time = this.scene.time.now) {
    return time < this.doubleJumpUntil;
  }

  hasProjectileBoost(time = this.scene.time.now) {
    return time < this.projectileBoostUntil;
  }

  getActivePowerLabel(time = this.scene.time.now) {
    const labels = [];
    if (this.hasSpeedBoost(time)) {
      labels.push('SPEED');
    }
    if (this.hasDoubleJump(time)) {
      labels.push('DOUBLE');
    }
    if (this.hasProjectileBoost(time)) {
      labels.push('BONE+');
    }
    return labels.length ? labels.join('+') : 'NONE';
  }

  destroy(fromScene) {
    this.shieldAura?.destroy();
    super.destroy(fromScene);
  }
}
