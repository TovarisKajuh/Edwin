'use client';

import { useEffect, useState, useRef } from 'react';
import type { BriefingResponse } from '@edwin/shared';
import { getBriefing } from '@/lib/api';

export default function BriefingPage() {
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getBriefing()
      .then((res) => {
        setData(res);
        if (res.audio) {
          const audio = new Audio(`data:audio/mpeg;base64,${res.audio}`);
          audioRef.current = audio;
          audio.onplay = () => setPlaying(true);
          audio.onended = () => setPlaying(false);
          audio.onpause = () => setPlaying(false);
          audio.play().catch(() => {});
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => { audioRef.current?.pause(); };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-zinc-400">Edwin is preparing your briefing...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Could not load briefing. Try again later, sir.</p>
      </div>
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-2xl p-6 pt-10 md:p-10">
      <header className="mb-8 text-center">
        <p className="text-sm text-zinc-500">{dateStr}</p>
        <h1 className="mt-2 text-3xl font-light text-zinc-100">Good Morning, Sir</h1>
        {data.audio && (
          <button
            onClick={togglePlay}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-400"
          >
            {playing ? (
              <>
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />
                Listening...
              </>
            ) : (
              <>
                <span>&#9654;</span>
                Listen to Briefing
              </>
            )}
          </button>
        )}
      </header>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 md:p-8">
        {data.text.split('\n').map((paragraph, i) => (
          paragraph.trim() ? (
            <p key={i} className="mb-4 text-sm leading-relaxed text-zinc-300">
              {paragraph}
            </p>
          ) : null
        ))}
      </div>
    </div>
  );
}
