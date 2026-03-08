'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Web Speech API types — not yet in all TS DOM libs
interface SpeechRecognitionResult {
  readonly [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface UseSpeechRecognitionOptions {
  language?: string;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  listening: boolean;
  transcript: string;
  supported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | undefined;
}

export function useSpeechRecognition(
  options?: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const start = useCallback(async () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError('Speech recognition not supported');
      return;
    }

    // Request microphone permission explicitly on mobile
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately — we just needed the permission
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied';
      setError(msg);
      optionsRef.current?.onError?.(msg);
      return;
    }

    setError(null);

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = optionsRef.current?.language || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(result);
      optionsRef.current?.onResult?.(result);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMsg = event.error || 'Unknown speech recognition error';
      console.error('[SpeechRecognition] Error:', errorMsg, event.message);
      setError(errorMsg);
      setListening(false);
      optionsRef.current?.onError?.(errorMsg);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start recognition';
      console.error('[SpeechRecognition] Start failed:', msg);
      setError(msg);
      setListening(false);
      optionsRef.current?.onError?.(msg);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, transcript, supported, error, start, stop };
}
