'use client';

import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function NotificationToast({ message, onDismiss, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade out
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed left-1/2 top-4 z-[90] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">&#9672;</span>
          <p className="text-sm text-zinc-200">{message}</p>
          <button
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="ml-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            &#10005;
          </button>
        </div>
      </div>
    </div>
  );
}
