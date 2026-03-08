/**
 * Play notification sound and vibrate device.
 * Uses Web Audio API to generate tones (no external audio files needed).
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

export function playNotificationSound(type: 'notification' | 'call') {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'call') {
      oscillator.frequency.value = 440;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.8);
    } else {
      oscillator.frequency.value = 587; // D5
      oscillator.type = 'sine';
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio not supported or blocked
  }

  if ('vibrate' in navigator) {
    navigator.vibrate(
      type === 'call'
        ? [200, 100, 200, 100, 200]
        : [100, 50, 100],
    );
  }
}
