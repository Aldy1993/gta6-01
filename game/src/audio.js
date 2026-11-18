// Synthesised WebAudio sound: engine hum, siren, crash, punch, chime.
// No audio files — every sound is built from oscillators and noise at run time.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let unlocked = false;

  // A looping oscillator held at silence until its gain is raised.
  function loopingOscillator(type, frequency) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    return { osc, gain };
  }

  // Build the context and the two looping voices on first use.
  function ensure() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      const engine = loopingOscillator('sawtooth', 60);
      engineOsc = engine.osc;
      engineGain = engine.gain;
      const siren = loopingOscillator('triangle', 700);
      sirenOsc = siren.osc;
      sirenGain = siren.gain;
      return true;
    } catch {
      return false;
    }
  }

  // Browsers require a user gesture before audio may start.
  function unlock() {
    if (unlocked) return;
    if (ensure() && ctx.state === 'suspended') void ctx.resume();
    unlocked = true;
  }

  // A short one-shot tone that fades out exponentially.
  function blip(freq, dur, type, vol) {
    if (!ensure() || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  // A burst of white noise with a linear decay envelope.
  function noiseBurst(dur, vol) {
    if (!ensure() || !ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  // A delayed follow-up blip, for two-note chimes.
  function blipLater(freq, dur, type, vol, delayMs) {
    setTimeout(() => blip(freq, dur, type, vol), delayMs);
  }

  return {
    unlock,
    // speed01: 0..1 of top speed; called every frame while driving.
    setEngine(speed01, driving) {
      if (!ctx || !engineOsc || !engineGain) return;
      const target = driving ? 0.05 + speed01 * 0.09 : 0.0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 140, ctx.currentTime, 0.08);
    },
    // Two-tone wail while any wanted stars are up.
    setSiren(on, dt) {
      if (!ctx || !sirenOsc || !sirenGain) return;
      sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, 0.1);
      if (!on) return;
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 650, ctx.currentTime, 0.05);
      }
    },
    crash() {
      noiseBurst(0.25, 0.3);
      blip(70, 0.2, 'sine', 0.25);
    },
    punch() {
      noiseBurst(0.08, 0.18);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.18);
      blipLater(880, 0.18, 'sine', 0.18, 110);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => blipLater(f, 0.22, 'triangle', 0.16, i * 120));
    },
    denied() {
      blip(180, 0.15, 'square', 0.08);
    },
  };
}
