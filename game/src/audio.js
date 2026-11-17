// Original synth sound, made with WebAudio only — no audio files, no network.
// Engine hum follows the car's speed, a two-tone siren follows the wanted level.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let started = false;

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
    if (!ensure() || ctx.state !== 'running') return;
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

  return {
    start,
    pickup() { blip(660, 0.18, 'sine', 0.14); setTimeout(() => blip(990, 0.22, 'sine', 0.14), 110); },
    thud() { blip(70, 0.16, 'square', 0.2); },
    crime() { blip(220, 0.3, 'square', 0.1); setTimeout(() => blip(180, 0.3, 'square', 0.1), 140); },
    /** speed01: 0..1 while driving, 0 on foot. wanted: current wanted level. */
    update(speed01, wanted) {
      if (!ctx || ctx.state !== 'running') return;
      try {
        engineGain.gain.value = speed01 > 0.02 ? 0.03 + speed01 * 0.05 : 0;
        engineOsc.frequency.value = 50 + speed01 * 130;
        sirenGain.gain.value = wanted > 0 ? 0.02 + wanted * 0.006 : 0;
      } catch {
        // Ignore audio glitches.
      }
    },
  };
}
