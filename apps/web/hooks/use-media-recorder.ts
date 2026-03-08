'use client';

import { useState, useCallback, useRef } from 'react';

interface UseMediaRecorderOptions {
  /** Silence threshold (0-255 RMS). Below this = silence. Default: 15 */
  silenceThreshold?: number;
  /** How long silence must last before auto-stop (ms). Default: 1500 */
  silenceTimeout?: number;
  /** Called with the recorded blob when recording stops (manual or auto-silence) */
  onRecordingComplete?: (blob: Blob) => void;
}

interface UseMediaRecorderReturn {
  recording: boolean;
  supported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadFrameRef = useRef<number>(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stopVAD = useCallback(() => {
    if (vadFrameRef.current) {
      cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = 0;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Silence detection via Web Audio API
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speechDetected = false;
    const threshold = optionsRef.current?.silenceThreshold ?? 15;
    const timeout = optionsRef.current?.silenceTimeout ?? 1500;

    const checkSilence = () => {
      if (!analyserRef.current) return;
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i] - 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms > threshold) {
        speechDetected = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speechDetected && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          // Auto-stop on silence
          if (recorderRef.current?.state === 'recording') {
            recorderRef.current.stop();
            setRecording(false);
          }
        }, timeout);
      }

      vadFrameRef.current = requestAnimationFrame(checkSilence);
    };
    vadFrameRef.current = requestAnimationFrame(checkSilence);

    // Pick supported mime type
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
      audioCtx.close();
      stopVAD();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      optionsRef.current?.onRecordingComplete?.(blob);
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, [stopVAD]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  return { recording, supported, startRecording, stopRecording };
}
