'use client';

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 4 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // ~4 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-white/[0.05] bg-[#0f1020] pb-[env(safe-area-inset-bottom)] md:bottom-0 md:left-64">
      <div className="mx-auto flex max-w-4xl items-end gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Edwin..."
          disabled={disabled}
          className="flex-1 resize-none rounded-[14px] bg-[#151729]/60 border border-white/[0.05] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#45465a] focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-50"
          style={{ maxHeight: `${4 * 24}px` }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="min-h-[44px] min-w-[44px] rounded-[14px] bg-amber-500 px-4 py-2.5 text-sm font-medium text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
