'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface IncomingCallProps {
  title: string;
  subtitle: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Generate a looping ring tone using Web Audio API.
 * Returns a cleanup function that stops the sound.
 */
function startRingSound(): (() => void) | null {
  try {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.15;
    gainNode.connect(ctx.destination);

    let stopped = false;

    // Play a ring pattern: two short tones, pause, repeat
    function playRingCycle() {
      if (stopped) return;

      const now = ctx.currentTime;

      // First tone (440Hz, 0.4s)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 440;
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Second tone (440Hz, 0.4s after a 0.1s gap)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 440;
      osc2.connect(gainNode);
      osc2.start(now + 0.5);
      osc2.stop(now + 0.9);

      // Schedule next cycle after 2s total
      setTimeout(() => playRingCycle(), 2000);
    }

    playRingCycle();

    return () => {
      stopped = true;
      ctx.close().catch(() => {});
    };
  } catch {
    return null;
  }
}

export function IncomingCall({ title, subtitle, onAccept, onDecline }: IncomingCallProps) {
  const [visible, setVisible] = useState(true);
  const ringCleanupRef = useRef<(() => void) | null>(null);

  const stopRing = useCallback(() => {
    ringCleanupRef.current?.();
    ringCleanupRef.current = null;
  }, []);

  // Start ringing sound
  useEffect(() => {
    ringCleanupRef.current = startRingSound();
    return () => stopRing();
  }, [stopRing]);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      stopRing();
      onDecline();
    }, 60_000);
    return () => clearTimeout(timer);
  }, [onDecline, stopRing]);

  // Vibration pattern on mobile
  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        {/* Avatar pulse */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 border-2 border-amber-400">
            <span className="text-3xl font-bold text-amber-400">E</span>
          </div>
        </div>

        {/* Info */}
        <div>
          <h2 className="text-2xl font-light text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => { setVisible(false); stopRing(); onDecline(); }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white transition-transform active:scale-95 hover:bg-red-500"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => { setVisible(false); stopRing(); onAccept(); }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white transition-transform active:scale-95 hover:bg-green-500"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>
        </div>

        <div className="flex gap-8 text-xs text-zinc-500">
          <span>Decline</span>
          <span>Accept</span>
        </div>
      </div>
    </div>
  );
}
