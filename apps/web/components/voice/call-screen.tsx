'use client';

import { useState, useCallback, useRef } from 'react';
import { sendVoiceAudio } from '@/lib/api';
import { useMediaRecorder } from '@/hooks/use-media-recorder';

type CallState = 'idle' | 'listening' | 'processing' | 'speaking';

export function CallScreen() {
  const [inCall, setInCall] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const conversationIdRef = useRef<number | undefined>(undefined);
  // Persistent audio element — created on user gesture to unlock iOS audio playback
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const processAudio = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) {
      setCallState('idle');
      return;
    }

    setCallState('processing');

    try {
      const result = await sendVoiceAudio(blob, conversationIdRef.current);
      conversationIdRef.current = result.conversationId;
      setLastTranscript(result.transcript);
      setLastResponse(result.message);

      if (result.audio.byteLength > 1000 && audioElRef.current) {
        // Clean up previous blob URL
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

        const audioBlob = new Blob([result.audio], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        blobUrlRef.current = url;

        const audioEl = audioElRef.current;
        audioEl.onended = () => {
          setCallState('idle');
        };
        audioEl.onerror = () => {
          setCallState('idle');
        };

        // Reuse the unlocked audio element — just change src
        audioEl.src = url;
        setCallState('speaking');
        await audioEl.play();
      } else {
        setCallState('idle');
      }
    } catch (e) {
      console.error('[Voice] Error:', e);
      setCallState('idle');
    }
  }, []);

  const { recording, supported, startRecording, stopRecording } = useMediaRecorder({
    silenceThreshold: 15,
    silenceTimeout: 1500,
    onRecordingComplete: processAudio,
  });

  const handleMicPress = useCallback(async () => {
    if (recording) {
      stopRecording(); // manual stop → onRecordingComplete fires → processAudio
    } else {
      try {
        await startRecording();
        setCallState('listening');
      } catch (e) {
        console.error('[Voice] Mic error:', e);
        setCallState('idle');
      }
    }
  }, [recording, startRecording, stopRecording]);

  const handleStartCall = useCallback(() => {
    // Create and unlock audio element during this user gesture (required for iOS)
    if (!audioElRef.current) {
      const el = new Audio();
      (el as unknown as Record<string, boolean>).playsInline = true;
      audioElRef.current = el;
    }
    // Play silent audio to unlock — iOS requires .play() from a user gesture
    audioElRef.current.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAD/+1DEAAAHAAL0AAAAIgAAXoAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQbAAADSAAAAAAAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    audioElRef.current.play().catch(() => {}); // Ignore errors on silent play

    setInCall(true);
    setCallState('idle');
    setLastTranscript('');
    setLastResponse('');
    conversationIdRef.current = undefined;
  }, []);

  const handleEndCall = useCallback(() => {
    if (recording) stopRecording();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setInCall(false);
    setCallState('idle');
    setLastTranscript('');
    setLastResponse('');
    conversationIdRef.current = undefined;
  }, [recording, stopRecording]);

  const micDisabled = callState === 'processing' || callState === 'speaking';

  const avatarClasses = (() => {
    if (!inCall) return 'w-32 h-32 rounded-full bg-[#151729] border-2 border-amber-400/30 flex items-center justify-center';
    switch (callState) {
      case 'speaking': return 'w-32 h-32 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-pulse';
      case 'listening': return 'w-32 h-32 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center';
      case 'processing': return 'w-32 h-32 rounded-full bg-blue-400/20 border-2 border-blue-400 flex items-center justify-center animate-pulse';
      default: return 'w-32 h-32 rounded-full bg-[#151729] border-2 border-white/[0.08] flex items-center justify-center';
    }
  })();

  const statusText = (() => {
    switch (callState) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap the mic to speak';
    }
  })();

  if (!inCall) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8">
        <div className={avatarClasses}>
          <span className="text-4xl text-amber-400">E</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#f0f0f5]">Edwin</h2>
          <p className="mt-1 text-sm text-[#7a7b90]">Ready to speak, sir.</p>
          {!supported && (
            <p className="mt-2 text-xs text-red-400">Audio recording is not supported in this browser.</p>
          )}
        </div>
        <button
          onClick={handleStartCall}
          disabled={!supported}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Start call"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className={avatarClasses}>
        <span className="text-4xl text-amber-400">E</span>
      </div>

      <p className="text-sm text-[#7a7b90]">{statusText}</p>

      {(lastTranscript || lastResponse) && (
        <div className="max-w-sm space-y-2 text-center">
          {lastTranscript && (
            <p className="text-sm text-[#7a7b90]">
              <span className="font-medium text-[#f0f0f5]/70">You:</span> {lastTranscript}
            </p>
          )}
          {lastResponse && (
            <p className="text-sm text-[#f0f0f5]/80">
              <span className="font-medium text-amber-400">Edwin:</span> {lastResponse}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-6">
        <button
          onClick={handleMicPress}
          disabled={micDisabled}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
            recording
              ? 'bg-green-600 text-white animate-pulse'
              : 'bg-white/[0.06] text-[#f0f0f5]/80 hover:bg-white/[0.1]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        </button>

        <button
          onClick={handleEndCall}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
          aria-label="End call"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
