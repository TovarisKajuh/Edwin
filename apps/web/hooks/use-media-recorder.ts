'use client';

import { useState, useCallback, useRef } from 'react';

interface UseMediaRecorderReturn {
  recording: boolean;
  supported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick a supported mime type — iOS Safari uses mp4, Chrome uses webm
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      resolveRef.current?.(blob);
      resolveRef.current = null;
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current || recorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      recorderRef.current.stop();
      setRecording(false);
    });
  }, []);

  return { recording, supported, startRecording, stopRecording };
}
