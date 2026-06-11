import Phaser from 'phaser';

const FOOD_COLORS = {
  pink: '#ff7ab8',
  cyan: '#71e8ff',
  orange: '#ff9f43',
  mint: '#81e979',
};

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#141021');
    this.add.text(480, 260, 'Loading PawPaw Power...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#fff7d6',
      stroke: '#05040a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.createGeneratedTextures();
    this.createAnimations();
    this.scene.start('MainMenuScene');
  }

  createGeneratedTextures() {
    this.createCatTextures();
    this.createEnemyTextures();
    this.createBossTextures();
    this.createFoodTextures();
    this.createPowerTextures();
    this.createTileTextures();
    this.createWorldTextures();
  }

  makeTexture(key, width, height, draw) {
    if (this.textures.exists(key)) {
      return;
    }
    const texture = this.textures.createCanvas(key, width, height);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    draw(context);
    texture.refresh();
  }

  rect(context, x, y, width, height, color) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  createCatTextures() {
    const variants = [
      ['cat-idle-0', 'idle0'],
      ['cat-idle-1', 'idle1'],
      ['cat-run-0', 'run0'],
      ['cat-run-1', 'run1'],
      ['cat-run-2', 'run2'],
      ['cat-run-3', 'run3'],
      ['cat-jump', 'jump'],
      ['cat-fall', 'fall'],
    ];

    variants.forEach(([key, pose]) => {
      this.makeTexture(key, 32, 32, (context) => this.drawCat(context, pose));
    });

    this.makeTexture('shield-bubble', 42, 42, (context) => {
      this.rect(context, 12, 4, 18, 4, '#9de8ff');
      this.rect(context, 6, 10, 4, 22, '#9de8ff');
      this.rect(context, 32, 10, 4, 22, '#9de8ff');
      this.rect(context, 12, 34, 18, 4, '#9de8ff');
      this.rect(context, 10, 8, 4, 4, '#d9fbff');
      this.rect(context, 30, 8, 4, 4, '#d9fbff');
      this.rect(context, 10, 32, 4, 4, '#d9fbff');
      this.rect(context, 30, 32, 4, 4, '#d9fbff');
    });
  }

  drawCat(context, pose) {
    const blink = pose === 'idle1';
    const runStep = pose === 'run1' || pose === 'run3' ? 2 : 0;
    const oppositeStep = pose === 'run0' || pose === 'run2' ? 2 : 0;
    const airborneOffset = pose === 'jump' ? -1 : pose === 'fall' ? 1 : 0;

    this.rect(context, 4, 18 + airborneOffset, 7, 5, '#f28a2e');
    this.rect(context, 2, 20 + airborneOffset, 4, 4, '#f28a2e');
    this.rect(context, 8, 15 + airborneOffset, 17, 10, '#fff7e8');
    this.rect(context, 9, 16 + airborneOffset, 6, 5, '#f28a2e');
    this.rect(context, 19, 16 + airborneOffset, 5, 7, '#20202d');
    this.rect(context, 11, 24 + runStep, 5, 4, '#fff7e8');
    this.rect(context, 20, 24 + oppositeStep, 5, 4, '#fff7e8');
    this.rect(context, 10, 27 + runStep, 6, 2, '#2b2035');
    this.rect(context, 20, 27 + oppositeStep, 6, 2, '#2b2035');

    this.rect(context, 11, 8 + airborneOffset, 14, 11, '#fff7e8');
    this.rect(context, 9, 5 + airborneOffset, 5, 5, '#fff7e8');
    this.rect(context, 22, 5 + airborneOffset, 5, 5, '#20202d');
    this.rect(context, 13, 9 + airborneOffset, 6, 5, '#f28a2e');
    this.rect(context, 22, 10 + airborneOffset, 3, 4, '#20202d');
    this.rect(context, 17, 14 + airborneOffset, 3, 2, '#f06f88');

    if (blink) {
      this.rect(context, 14, 12 + airborneOffset, 3, 1, '#2b2035');
      this.rect(context, 22, 12 + airborneOffset, 3, 1, '#2b2035');
    } else {
      this.rect(context, 14, 11 + airborneOffset, 2, 3, '#2b2035');
      this.rect(context, 22, 11 + airborneOffset, 2, 3, '#2b2035');
      this.rect(context, 15, 11 + airborneOffset, 1, 1, '#fff7e8');
      this.rect(context, 23, 11 + airborneOffset, 1, 1, '#fff7e8');
    }
    this.rect(context, 18, 15 + airborneOffset, 2, 1, '#2b2035');
    this.rect(context, 26, 15 + airborneOffset, 4, 1, '#fff7e8');
    this.rect(context, 6, 15 + airborneOffset, 4, 1, '#fff7e8');
  }

  createEnemyTextures() {
    ['0', '1'].forEach((frame) => {
      this.makeTexture(`enemy-walker-${frame}`, 32, 32, (context) => {
        const foot = frame === '0' ? 0 : 2;
        this.rect(context, 6, 13, 20, 12, '#795548');
        this.rect(context, 8, 10, 16, 5, '#9b6a42');
        this.rect(context, 9, 15, 4, 4, '#fff7d6');
        this.rect(context, 20, 15, 4, 4, '#fff7d6');
        this.rect(context, 10, 16, 2, 2, '#1d1528');
        this.rect(context, 21, 16, 2, 2, '#1d1528');
        this.rect(context, 8, 25 + foot, 7, 3, '#5a382b');
        this.rect(context, 19, 27 - foot, 7, 3, '#5a382b');
      });
    });

    ['0', '1'].forEach((frame) => {
      this.makeTexture(`enemy-flyer-${frame}`, 32, 32, (context) => {
        const wing = frame === '0' ? 8 : 11;
        this.rect(context, 10, 12, 12, 10, '#7057c8');
        this.rect(context, 7, wing, 8, 5, '#9c8cff');
        this.rect(context, 18, wing, 8, 5, '#9c8cff');
        this.rect(context, 13, 15, 2, 3, '#fff7d6');
        this.rect(context, 18, 15, 2, 3, '#fff7d6');
        this.rect(context, 14, 16, 1, 1, '#151124');
        this.rect(context, 19, 16, 1, 1, '#151124');
      });
    });

    ['0', '1'].forEach((frame) => {
      this.makeTexture(`enemy-jumper-${frame}`, 32, 32, (context) => {
        const squash = frame === '0' ? 0 : 2;
        this.rect(context, 8, 13 + squash, 17, 12 - squash, '#3aa56d');
        this.rect(context, 11, 9 + squash, 11, 6, '#63cf8f');
        this.rect(context, 12, 14 + squash, 3, 3, '#fff7d6');
        this.rect(context, 19, 14 + squash, 3, 3, '#fff7d6');
        this.rect(context, 13, 15 + squash, 1, 1, '#151124');
        this.rect(context, 20, 15 + squash, 1, 1, '#151124');
        this.rect(context, 7, 25, 8, 4, '#28764e');
        this.rect(context, 20, 25, 8, 4, '#28764e');
      });
    });

    this.makeTexture('enemy-spiky', 32, 32, (context) => {
      this.rect(context, 8, 16, 18, 10, '#4c4c5e');
      this.rect(context, 10, 10, 4, 6, '#d9d9e8');
      this.rect(context, 17, 8, 4, 8, '#d9d9e8');
      this.rect(context, 24, 11, 4, 6, '#d9d9e8');
      this.rect(context, 12, 18, 3, 3, '#ff6b8a');
      this.rect(context, 21, 18, 3, 3, '#ff6b8a');
      this.rect(context, 13, 19, 1, 1, '#121021');
      this.rect(context, 22, 19, 1, 1, '#121021');
      this.rect(context, 9, 26, 6, 3, '#303040');
      this.rect(context, 20, 26, 6, 3, '#303040');
    });

    this.makeTexture('enemy-traffic', 32, 32, (context) => {
      this.rect(context, 5, 15, 22, 8, '#d85945');
      this.rect(context, 9, 10, 11, 6, '#ffd166');
      this.rect(context, 8, 23, 5, 5, '#151124');
      this.rect(context, 22, 23, 5, 5, '#151124');
    });

    ['0', '1'].forEach((frame) => {
      this.makeTexture(`enemy-river-${frame}`, 32, 32, (context) => {
        const fin = frame === '0' ? 10 : 13;
        this.rect(context, 8, 14, 18, 10, '#2aa6b8');
        this.rect(context, 4, fin, 7, 7, '#74e0e8');
        this.rect(context, 22, 11, 5, 5, '#74e0e8');
        this.rect(context, 20, 16, 3, 3, '#fff7d6');
        this.rect(context, 21, 17, 1, 1, '#151124');
      });
    });

    ['0', '1'].forEach((frame) => {
      this.makeTexture(`enemy-rooftop-${frame}`, 32, 32, (context) => {
        const foot = frame === '0' ? 0 : 2;
        this.rect(context, 7, 12, 18, 13, '#5f6070');
        this.rect(context, 9, 8, 14, 6, '#8e93a6');
        this.rect(context, 11, 15, 3, 3, '#fff7d6');
        this.rect(context, 20, 15, 3, 3, '#fff7d6');
        this.rect(context, 12, 16, 1, 1, '#151124');
        this.rect(context, 21, 16, 1, 1, '#151124');
        this.rect(context, 8, 25 + foot, 7, 3, '#444652');
        this.rect(context, 20, 27 - foot, 7, 3, '#444652');
      });
    });
  }

  createBossTextures() {
    ['0', '1'].forEach((frame) => {
      this.makeTexture(`boss-${frame}`, 64, 64, (context) => {
        const bob = frame === '0' ? 0 : 2;
        this.rect(context, 14, 22 + bob, 36, 28, '#49334f');
        this.rect(context, 18, 14 + bob, 28, 20, '#69456f');
        this.rect(context, 15, 8 + bob, 8, 8, '#49334f');
        this.rect(context, 41, 8 + bob, 8, 8, '#49334f');
        this.rect(context, 20, 22 + bob, 7, 7, '#fff7d6');
        this.rect(context, 38, 22 + bob, 7, 7, '#fff7d6');
        this.rect(context, 22, 24 + bob, 3, 3, '#11101d');
        this.rect(context, 40, 24 + bob, 3, 3, '#11101d');
        this.rect(context, 29, 31 + bob, 8, 3, '#ff6b8a');
        this.rect(context, 10, 37 + bob, 10, 8, '#d53b68');
        this.rect(context, 44, 37 + bob, 10, 8, '#d53b68');
        this.rect(context, 22, 50 + bob, 9, 5, '#2a1a32');
        this.rect(context, 36, 50 + bob, 9, 5, '#2a1a32');
        this.rect(context, 28, 10 + bob, 8, 6, '#ffcf52');
        this.rect(context, 30, 7 + bob, 4, 4, '#ffcf52');
      });
    });

    this.makeTexture('boss-projectile', 18, 18, (context) => {
      this.rect(context, 4, 2, 10, 4, '#ffcf52');
      this.rect(context, 2, 6, 14, 8, '#ff795b');
      this.rect(context, 5, 14, 8, 3, '#d53b68');
      this.rect(context, 7, 7, 4, 4, '#fff7d6');
    });
  }

  createFoodTextures() {
    Object.entries(FOOD_COLORS).forEach(([name, color]) => {
      [0, 1, 2, 3].forEach((frame) => {
        this.makeTexture(`food-${name}-${frame}`, 32, 32, (context) => {
          const offset = frame === 1 || frame === 2 ? 1 : 0;
          this.rect(context, 12 + offset, 9, 8 - offset * 2, 4, color);
          this.rect(context, 9, 13, 14, 8, color);
          this.rect(context, 11 + offset, 21, 10 - offset * 2, 4, color);
          this.rect(context, 12, 15, 3, 2, '#fff7d6');
          this.rect(context, 18, 16, 2, 2, '#fff7d6');
          this.rect(context, 10, 22, 12, 2, '#6b3050');
        });
      });
    });
  }

  createPowerTextures() {
    const powers = [
      ['power-speed', '#ff4f4f', '#ffd166'],
      ['power-shield', '#6ecbff', '#d9fbff'],
      ['power-bonus', '#ffd166', '#fff7d6'],
      ['power-life', '#62d26f', '#d7ffd8'],
      ['power-double', '#b67aff', '#fff7ff'],
      ['power-projectile', '#d8dde8', '#ffffff'],
    ];

    powers.forEach(([key, main, shine]) => {
      this.makeTexture(key, 32, 32, (context) => {
        this.rect(context, 9, 9, 14, 4, shine);
        this.rect(context, 7, 13, 18, 12, main);
        this.rect(context, 10, 25, 12, 3, '#3a2549');
        this.rect(context, 11, 16, 4, 3, shine);
        this.rect(context, 19, 18, 3, 3, shine);
      });
    });
  }

  createTileTextures() {
    const tileData = {
      grass: ['#5fcf66', '#33984d', '#6e4b35'],
      cave: ['#665a8f', '#42345e', '#241d35'],
      sky: ['#ffffff', '#bceeff', '#78bce3'],
      forest: ['#3d9a56', '#1f5c3b', '#252b36'],
      castle: ['#746178', '#46364f', '#231927'],
      city: ['#d7dce8', '#83899c', '#4e5367'],
      rooftop: ['#d6dbe5', '#8a93a4', '#4f5868'],
      river: ['#69cc85', '#439967', '#316a82'],
    };

    Object.entries(tileData).forEach(([name, colors]) => {
      this.makeTexture(`tile-${name}`, 16, 16, (context) => {
        this.rect(context, 0, 0, 16, 16, colors[1]);
        this.rect(context, 0, 0, 16, 5, colors[0]);
        this.rect(context, 1, 6, 5, 3, colors[2]);
        this.rect(context, 8, 10, 6, 3, colors[2]);
        this.rect(context, 12, 2, 3, 3, colors[0]);
      });
    });

    const platformData = {
      'platform-grass': ['#7edb70', '#327c42'],
      'platform-city': ['#f5d95a', '#625c72'],
      'platform-rooftop': ['#d6dbe5', '#4f5868'],
      'platform-river': ['#b48242', '#5b3827'],
      'platform-castle': ['#9b789e', '#3b2944'],
      'safe-island': ['#f5d95a', '#55515f'],
      'log-platform': ['#a96f3a', '#5b3827'],
      'boat-platform': ['#d9b46c', '#6f4932'],
    };

    Object.entries(platformData).forEach(([key, colors]) => {
      this.makeTexture(key, 16, 16, (context) => {
        this.rect(context, 0, 0, 16, 16, colors[1]);
        this.rect(context, 0, 0, 16, 6, colors[0]);
        this.rect(context, 2, 9, 5, 2, colors[0]);
        this.rect(context, 10, 12, 4, 2, colors[0]);
      });
    });
  }

  createWorldTextures() {
    this.makeTexture('checkpoint', 34, 54, (context) => {
      this.rect(context, 8, 8, 4, 38, '#fff7d6');
      this.rect(context, 12, 10, 18, 12, '#ff7ab8');
      this.rect(context, 14, 14, 4, 4, '#fff7d6');
      this.rect(context, 20, 14, 4, 4, '#fff7d6');
      this.rect(context, 6, 46, 10, 4, '#6b5d7a');
    });

    this.makeTexture('goal', 48, 64, (context) => {
      this.rect(context, 21, 8, 6, 46, '#fff7d6');
      this.rect(context, 13, 9, 22, 10, '#ffd166');
      this.rect(context, 10, 20, 28, 22, '#ff7ab8');
      this.rect(context, 14, 24, 20, 14, '#fff7d6');
      this.rect(context, 18, 28, 4, 4, '#2b2035');
      this.rect(context, 27, 28, 4, 4, '#2b2035');
      this.rect(context, 22, 34, 6, 2, '#f06f88');
      this.rect(context, 15, 54, 20, 5, '#6b5d7a');
    });

    this.makeTexture('particle', 4, 4, (context) => {
      this.rect(context, 0, 0, 4, 4, '#ffffff');
    });

    this.makeTexture('fishbone', 24, 10, (context) => {
      this.rect(context, 5, 4, 14, 2, '#fff7d6');
      this.rect(context, 2, 2, 4, 2, '#fff7d6');
      this.rect(context, 2, 6, 4, 2, '#fff7d6');
      this.rect(context, 18, 2, 4, 2, '#fff7d6');
      this.rect(context, 18, 6, 4, 2, '#fff7d6');
    });

    this.makeTexture('fishbone-strong', 28, 12, (context) => {
      this.rect(context, 5, 5, 18, 2, '#ffffff');
      this.rect(context, 2, 2, 5, 3, '#d8dde8');
      this.rect(context, 2, 7, 5, 3, '#d8dde8');
      this.rect(context, 22, 2, 5, 3, '#d8dde8');
      this.rect(context, 22, 7, 5, 3, '#d8dde8');
      this.rect(context, 8, 2, 3, 2, '#9de8ff');
    });

    this.makeTexture('vehicle-car', 78, 28, (context) => {
      this.rect(context, 4, 11, 68, 11, '#ef4f4f');
      this.rect(context, 18, 4, 28, 9, '#ffd166');
      this.rect(context, 12, 21, 10, 7, '#151124');
      this.rect(context, 56, 21, 10, 7, '#151124');
    });

    this.makeTexture('vehicle-bus', 116, 34, (context) => {
      this.rect(context, 4, 8, 108, 18, '#f5d95a');
      this.rect(context, 12, 12, 16, 8, '#76d8ff');
      this.rect(context, 36, 12, 16, 8, '#76d8ff');
      this.rect(context, 60, 12, 16, 8, '#76d8ff');
      this.rect(context, 16, 26, 12, 8, '#151124');
      this.rect(context, 86, 26, 12, 8, '#151124');
    });

    this.makeTexture('vehicle-bike', 54, 24, (context) => {
      this.rect(context, 18, 8, 20, 5, '#71e8ff');
      this.rect(context, 12, 5, 8, 8, '#ff9f43');
      this.rect(context, 9, 15, 10, 8, '#151124');
      this.rect(context, 34, 15, 10, 8, '#151124');
    });

    this.makeTexture('hazard-sign', 58, 28, (context) => {
      this.rect(context, 3, 4, 52, 16, '#ff6b8a');
      this.rect(context, 8, 8, 42, 4, '#fff7d6');
      this.rect(context, 24, 20, 10, 8, '#625c72');
    });

    this.makeTexture('hazard-rock', 34, 34, (context) => {
      this.rect(context, 8, 4, 18, 5, '#8a7d8f');
      this.rect(context, 4, 9, 26, 15, '#5b5367');
      this.rect(context, 8, 24, 18, 6, '#393448');
    });

    this.makeTexture('chase-orb', 46, 46, (context) => {
      this.rect(context, 10, 4, 26, 6, '#ff4f78');
      this.rect(context, 5, 10, 36, 26, '#7b4cff');
      this.rect(context, 10, 36, 26, 6, '#36235a');
      this.rect(context, 14, 18, 5, 5, '#fff7d6');
      this.rect(context, 28, 18, 5, 5, '#fff7d6');
    });

    ['road', 'water', 'lava', 'fire', 'spikes', 'pit'].forEach((type) => {
      this.makeTexture(`hazard-${type}`, 16, 16, (context) => {
        const colors = {
          road: ['#252a34', '#f5d95a'],
          water: ['#228bd6', '#72d8ff'],
          lava: ['#9e1f3f', '#ffb84d'],
          fire: ['#d62839', '#ffd166'],
          spikes: ['#4c4c5e', '#d9d9e8'],
          pit: ['#070611', '#151124'],
        }[type];
        this.rect(context, 0, 0, 16, 16, colors[0]);
        if (type === 'spikes') {
          for (let x = 0; x < 16; x += 4) {
            this.rect(context, x + 1, 4, 2, 9, colors[1]);
          }
        } else {
          this.rect(context, 2, 6, 12, 3, colors[1]);
          this.rect(context, 0, 12, 8, 2, colors[1]);
        }
      });
    });

    ['mystery', 'breakable', 'used', 'hidden'].forEach((type) => {
      this.makeTexture(`block-${type}`, 32, 32, (context) => {
        const fill = {
          mystery: '#ffd166',
          breakable: '#b0703c',
          used: '#71657c',
          hidden: '#ffd166',
        }[type];
        this.rect(context, 2, 2, 28, 28, fill);
        this.rect(context, 2, 2, 28, 4, '#fff7d6');
        this.rect(context, 2, 26, 28, 4, '#3a2549');
        this.rect(context, 6, 10, 5, 5, '#3a2549');
        this.rect(context, 20, 10, 5, 5, '#3a2549');
        if (type === 'mystery' || type === 'hidden') {
          this.rect(context, 14, 8, 4, 10, '#3a2549');
          this.rect(context, 14, 22, 4, 4, '#3a2549');
        }
      });
    });

    this.makeTexture('secret-tree', 48, 48, (context) => {
      this.rect(context, 16, 13, 16, 31, '#7b4a2e');
      this.rect(context, 6, 4, 36, 18, '#3d9a56');
      this.rect(context, 18, 28, 12, 16, '#151124');
    });
    this.makeTexture('secret-drain', 48, 42, (context) => {
      this.rect(context, 6, 15, 36, 20, '#5b6170');
      for (let x = 12; x < 38; x += 8) {
        this.rect(context, x, 18, 3, 14, '#151124');
      }
    });
    this.makeTexture('secret-vent', 42, 42, (context) => {
      this.rect(context, 4, 10, 34, 24, '#8a93a4');
      for (let y = 14; y < 31; y += 6) {
        this.rect(context, 8, y, 26, 2, '#151124');
      }
    });
    this.makeTexture('secret-box', 48, 42, (context) => {
      this.rect(context, 5, 12, 38, 25, '#b0703c');
      this.rect(context, 8, 15, 32, 4, '#d59b52');
      this.rect(context, 22, 12, 4, 25, '#7a4a2c');
    });
    this.makeTexture('secret-catdoor', 46, 42, (context) => {
      this.rect(context, 6, 6, 34, 32, '#4f385c');
      this.rect(context, 14, 15, 18, 23, '#151124');
      this.rect(context, 11, 10, 6, 6, '#ff7ab8');
      this.rect(context, 29, 10, 6, 6, '#ff7ab8');
    });
  }

  createAnimations() {
    if (this.anims.exists('cat-idle')) {
      return;
    }

    this.anims.create({
      key: 'cat-idle',
      frames: [{ key: 'cat-idle-0' }, { key: 'cat-idle-0' }, { key: 'cat-idle-1' }],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: 'cat-run',
      frames: ['cat-run-0', 'cat-run-1', 'cat-run-2', 'cat-run-3'].map((key) => ({ key })),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({ key: 'cat-jump', frames: [{ key: 'cat-jump' }], frameRate: 1 });
    this.anims.create({ key: 'cat-fall', frames: [{ key: 'cat-fall' }], frameRate: 1 });

    this.anims.create({
      key: 'enemy-walker',
      frames: [{ key: 'enemy-walker-0' }, { key: 'enemy-walker-1' }],
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-flyer',
      frames: [{ key: 'enemy-flyer-0' }, { key: 'enemy-flyer-1' }],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-jumper',
      frames: [{ key: 'enemy-jumper-0' }, { key: 'enemy-jumper-1' }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-river',
      frames: [{ key: 'enemy-river-0' }, { key: 'enemy-river-1' }],
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-rooftop',
      frames: [{ key: 'enemy-rooftop-0' }, { key: 'enemy-rooftop-1' }],
      frameRate: 5,
      repeat: -1,
    });
    this.anims.create({
      key: 'boss-idle',
      frames: [{ key: 'boss-0' }, { key: 'boss-1' }],
      frameRate: 3,
      repeat: -1,
    });

    Object.keys(FOOD_COLORS).forEach((color) => {
      this.anims.create({
        key: `food-${color}`,
        frames: [0, 1, 2, 3].map((frame) => ({ key: `food-${color}-${frame}` })),
        frameRate: 7,
        repeat: -1,
      });
    });
  }
}
