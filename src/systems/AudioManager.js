const SONGS = {
  menu: {
    tempo: 190,
    lead: [392, 523, 659, 523, 392, 330, 349, 440],
    bass: [98, 98, 131, 131],
  },
  grass: {
    tempo: 165,
    lead: [523, 659, 784, 659, 587, 659, 523, 392],
    bass: [131, 131, 196, 196],
  },
  city: {
    tempo: 135,
    lead: [392, 494, 587, 494, 440, 523, 659, 523],
    bass: [98, 123, 147, 123],
  },
  rooftop: {
    tempo: 145,
    lead: [659, 740, 880, 740, 659, 587, 740, 659],
    bass: [165, 147, 131, 147],
  },
  river: {
    tempo: 175,
    lead: [440, 554, 659, 554, 494, 587, 740, 587],
    bass: [110, 147, 165, 147],
  },
  final: {
    tempo: 125,
    lead: [196, 247, 294, 370, 349, 294, 247, 196],
    bass: [49, 65, 73, 82],
  },
  boss: {
    tempo: 115,
    lead: [196, 233, 294, 233, 196, 175, 147, 175],
    bass: [49, 49, 65, 73],
  },
  cave: {
    tempo: 210,
    lead: [220, 247, 262, 196, 220, 294, 262, 196],
    bass: [55, 73, 65, 49],
  },
  sky: {
    tempo: 150,
    lead: [659, 784, 988, 880, 784, 659, 587, 659],
    bass: [165, 196, 220, 196],
  },
  forest: {
    tempo: 185,
    lead: [330, 392, 494, 392, 349, 440, 392, 294],
    bass: [82, 110, 98, 73],
  },
  castle: {
    tempo: 145,
    lead: [196, 247, 294, 349, 330, 294, 247, 196],
    bass: [49, 65, 73, 65],
  },
};

export default class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.volume = 0.55;
    this.muted = false;
    this.musicTimer = null;
    this.musicTheme = 'menu';
    this.musicStep = 0;
    this.unlocked = false;
  }

  ensureContext(userGesture = false) {
    if (typeof window === 'undefined') {
      return null;
    }

    if (userGesture) {
      this.unlocked = true;
    }

    if (!this.context && !this.unlocked) {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!this.context) {
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.updateMasterGain();
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {
        // Browser may still be waiting for a trusted user gesture.
      });
    }

    return this.context;
  }

  unlock() {
    this.unlocked = true;
    const context = this.ensureContext(true);
    if (context) {
      this.startMusic(this.musicTheme);
    }
    return context;
  }

  updateMasterGain() {
    if (!this.masterGain) {
      return;
    }
    this.masterGain.gain.value = this.muted ? 0 : this.volume;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    this.updateMasterGain();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.updateMasterGain();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name) {
    if (this.muted) {
      return;
    }

    switch (name) {
      case 'jump':
        this.beep(330, 0.05, 'square', 0, 0.2);
        this.beep(660, 0.08, 'square', 0.04, 0.18);
        break;
      case 'throw':
        this.beep(620, 0.035, 'square', 0, 0.18);
        this.beep(420, 0.05, 'triangle', 0.035, 0.11);
        break;
      case 'projectileHit':
      case 'enemyProjectile':
        this.beep(760, 0.04, 'square', 0, 0.2);
        this.noise(0.04, 0.03, 0.06);
        break;
      case 'projectilePower':
        [740, 880, 1175].forEach((freq, index) => {
          this.beep(freq, 0.07, 'triangle', index * 0.055, 0.18);
        });
        break;
      case 'blockHit':
        this.beep(220, 0.04, 'square', 0, 0.18);
        this.beep(330, 0.04, 'square', 0.04, 0.12);
        break;
      case 'blockBreak':
        this.noise(0.16, 0, 0.12);
        this.beep(130, 0.08, 'sawtooth', 0, 0.18);
        break;
      case 'secret':
        [523, 659, 784, 1046].forEach((freq, index) => {
          this.beep(freq, 0.06, 'triangle', index * 0.05, 0.16);
        });
        break;
      case 'bossAppear':
        this.beep(98, 0.15, 'sawtooth', 0, 0.22);
        this.beep(147, 0.2, 'sawtooth', 0.12, 0.2);
        break;
      case 'collect':
        this.beep(740, 0.04, 'triangle', 0, 0.2);
        this.beep(988, 0.07, 'triangle', 0.045, 0.18);
        break;
      case 'speed':
        this.beep(440, 0.05, 'square', 0, 0.22);
        this.beep(660, 0.05, 'square', 0.05, 0.22);
        this.beep(880, 0.09, 'square', 0.1, 0.2);
        break;
      case 'shield':
        this.beep(392, 0.08, 'sine', 0, 0.22);
        this.beep(523, 0.14, 'sine', 0.08, 0.18);
        break;
      case 'bonus':
        this.beep(784, 0.05, 'triangle', 0, 0.24);
        this.beep(988, 0.05, 'triangle', 0.05, 0.22);
        this.beep(1175, 0.12, 'triangle', 0.1, 0.2);
        break;
      case 'life':
        [523, 659, 784, 1046].forEach((freq, index) => {
          this.beep(freq, 0.08, 'square', index * 0.07, 0.2);
        });
        break;
      case 'double':
        this.beep(587, 0.08, 'sawtooth', 0, 0.16);
        this.beep(880, 0.1, 'sawtooth', 0.075, 0.14);
        break;
      case 'enemy':
        this.beep(220, 0.08, 'square', 0, 0.24);
        this.beep(110, 0.08, 'square', 0.06, 0.2);
        break;
      case 'hurt':
        this.beep(170, 0.15, 'sawtooth', 0, 0.28);
        this.noise(0.12, 0.06, 0.08);
        break;
      case 'gameOver':
        [330, 262, 196, 98].forEach((freq, index) => {
          this.beep(freq, 0.16, 'square', index * 0.13, 0.22);
        });
        break;
      case 'levelComplete':
        [523, 659, 784, 1046, 1318].forEach((freq, index) => {
          this.beep(freq, 0.12, 'triangle', index * 0.08, 0.21);
        });
        break;
      case 'bossHit':
        this.beep(120, 0.08, 'sawtooth', 0, 0.28);
        this.beep(240, 0.08, 'sawtooth', 0.08, 0.22);
        break;
      case 'bossDefeat':
        this.noise(0.22, 0.08, 0.12);
        [262, 330, 392, 523, 784].forEach((freq, index) => {
          this.beep(freq, 0.13, 'square', 0.16 + index * 0.08, 0.22);
        });
        break;
      case 'buttonHover':
        this.beep(520, 0.03, 'square', 0, 0.08);
        break;
      case 'buttonClick':
        this.beep(660, 0.035, 'square', 0, 0.14);
        this.beep(880, 0.04, 'square', 0.04, 0.1);
        break;
      case 'pause':
        this.beep(294, 0.06, 'triangle', 0, 0.14);
        this.beep(220, 0.08, 'triangle', 0.06, 0.12);
        break;
      default:
        this.beep(440, 0.05, 'square', 0, 0.15);
    }
  }

  beep(frequency, duration, type = 'square', delay = 0, gainValue = 0.2) {
    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    const end = start + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  noise(duration, delay = 0, gainValue = 0.1) {
    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    source.buffer = buffer;
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(start);
  }

  startMusic(theme = 'menu') {
    this.musicTheme = SONGS[theme] ? theme : 'menu';
    const context = this.ensureContext(false);
    if (!context) {
      return;
    }

    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.musicStep = 0;
    this.tickMusic();
    const song = SONGS[this.musicTheme];
    this.musicTimer = window.setInterval(() => this.tickMusic(), song.tempo);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  tickMusic() {
    if (this.muted) {
      return;
    }

    const song = SONGS[this.musicTheme] || SONGS.menu;
    const lead = song.lead[this.musicStep % song.lead.length];
    const bass = song.bass[Math.floor(this.musicStep / 2) % song.bass.length];
    const isAccent = this.musicStep % 4 === 0;

    this.beep(lead, isAccent ? 0.11 : 0.075, 'square', 0, isAccent ? 0.08 : 0.055);
    if (this.musicStep % 2 === 0) {
      this.beep(bass, 0.1, 'triangle', 0.01, 0.045);
    }

    this.musicStep = (this.musicStep + 1) % 64;
  }
}
