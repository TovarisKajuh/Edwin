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
      <div className="max-w-sm rounded-[16px] border border-white/[0.08] bg-[#151729]/80 px-4 py-3 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">&#9672;</span>
          <p className="text-sm text-[#f0f0f5]">{message}</p>
          <button
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="ml-2 text-xs text-[#7a7b90] hover:text-[#f0f0f5]"
          >
            &#10005;
          </button>
        </div>
      </div>
    </div>
  );
}
