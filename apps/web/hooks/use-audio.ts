'use client';

import { useCallback, useRef } from 'react';

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioDataUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioDataUrl);
    audioRef.current = audio;
    audio.play().catch(console.error);
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const british = voices.find(v => v.lang === 'en-GB' && v.name.includes('Male'));
      const english = voices.find(v => v.lang === 'en-GB');
      if (british) utterance.voice = british;
      else if (english) utterance.voice = english;
      // Queue — don't cancel previous utterances
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { play, speak, stop };
}
