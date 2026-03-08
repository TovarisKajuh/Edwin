/**
 * Play notification sound and vibrate device.
 * Audio files should be placed in public/sounds/.
 * For now, uses Web Audio API to generate a simple tone
 * since actual sound files need to be sourced separately.
 */

export function playNotificationSound(type: 'notification' | 'call') {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'call') {
      // Ring pattern: two-tone alternating
      oscillator.frequency.value = 440;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.8);
    } else {
      // Short chime
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
