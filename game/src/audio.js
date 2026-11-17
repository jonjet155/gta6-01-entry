// Original synth sound, made with WebAudio only — no audio files, no network.
// Engine hum follows the car's speed, a two-tone siren follows the wanted level,
// and a three-station pirate radio plays tiny synth patterns under it all.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let started = false;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.7;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      sirenLfo.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  /** Call from a user gesture (or the first frame) to unlock sound. */
  function start() {
    if (started) return;
    started = true;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(frequency, duration, type = 'sine', volume = 0.12) {
    if (muted || !ensure() || ctx.state !== 'running') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  // The pirate radio: three stations, each a tiny step sequencer of MIDI notes
  // (69 is A4 = 440 Hz). The sequencer is driven from update(), so it plays
  // only while the game runs and the sound is on.
  const RADIO_PATTERNS = [
    // SOLMAR FM 88.5 — SUNSET SYNTH: a minor-key arpeggio that climbs and falls.
    { bpm: 96, wave: 'sawtooth', notes: [57, 60, 64, 69, 64, 60, 57, 52] },
    // PALM 101.2 — LO-FI NIGHTS: slow mellow chords, one note per step.
    { bpm: 72, wave: 'triangle', notes: [48, 55, 52, 59, 53, 57, 50, 55] },
    // TROPICANA 94.7 — SALSA CALIENTE: a quick montuno figure.
    { bpm: 120, wave: 'square', notes: [60, 64, 67, 72, 67, 64, 60, 67, 64, 60, 55, 60] },
  ];
  let radioStep = 0;
  let radioNext = 0;
  let radioStation = -1;

  function radioTick(station) {
    const pattern = RADIO_PATTERNS[station] ?? RADIO_PATTERNS[0];
    if (station !== radioStation) {
      // A new station restarts its figure from the first note.
      radioStation = station;
      radioStep = 0;
      radioNext = 0;
    }
    const stepSeconds = 60 / pattern.bpm / 2;
    if (radioNext === 0) radioNext = ctx.currentTime + 0.05;
    // After a pause the clock has run on: do not burst a backlog of notes.
    if (radioNext < ctx.currentTime - 0.5) radioNext = ctx.currentTime + 0.05;
    while (radioNext <= ctx.currentTime + 0.15) {
      const note = pattern.notes[radioStep % pattern.notes.length];
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      blip(freq, stepSeconds * 0.9, pattern.wave, 0.045);
      radioStep += 1;
      radioNext += stepSeconds;
    }
  }

  return {
    start,
    /** Mute or unmute everything; the engine and siren obey it on the next update. */
    setMuted(value) {
      muted = !!value;
      if (muted && ctx) {
        try {
          engineGain.gain.value = 0;
          sirenGain.gain.value = 0;
        } catch { /* Sound is garnish: never let it break the game. */ }
      }
    },
    isMuted() { return muted; },
    pickup() { blip(660, 0.18, 'sine', 0.14); setTimeout(() => blip(990, 0.22, 'sine', 0.14), 110); },
    thud() { blip(70, 0.16, 'square', 0.2); },
    crime() { blip(220, 0.3, 'square', 0.1); setTimeout(() => blip(180, 0.3, 'square', 0.1), 140); },
    /** A two-note car horn. */
    horn() { blip(370, 0.22, 'square', 0.12); setTimeout(() => blip(466, 0.22, 'square', 0.12), 90); },
    /** A little rising arpeggio when a mission pays out. */
    mission() {
      blip(523, 0.14, 'triangle', 0.14);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.14), 100);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.16), 200);
    },
    /** A low falling sting when the cops take Dario in. */
    busted() { blip(330, 0.3, 'sawtooth', 0.12); setTimeout(() => blip(165, 0.5, 'sawtooth', 0.12), 220); },
    /** A soft UI click for menu confirms. */
    click() { blip(880, 0.06, 'sine', 0.08); },
    /** Three wails of the vault alarm: high-low, high-low, high-low. */
    alarm() {
      for (let i = 0; i < 3; i += 1) {
        setTimeout(() => blip(880, 0.18, 'square', 0.1), i * 360);
        setTimeout(() => blip(622, 0.18, 'square', 0.1), i * 360 + 180);
      }
    },
    /** The drill's tick while the vault cracks. */
    tick() { blip(1200, 0.05, 'square', 0.06); },
    /** speed01: 0..1 while driving, 0 on foot. wanted: current wanted level. */
    update(speed01, wanted, station = 0) {
      if (!ctx || ctx.state !== 'running' || muted) return;
      try {
        engineGain.gain.value = speed01 > 0.02 ? 0.03 + speed01 * 0.05 : 0;
        engineOsc.frequency.value = 50 + speed01 * 130;
        sirenGain.gain.value = wanted > 0 ? 0.02 + wanted * 0.006 : 0;
        radioTick(station);
      } catch {
        // Ignore audio glitches.
      }
    },
  };
}
