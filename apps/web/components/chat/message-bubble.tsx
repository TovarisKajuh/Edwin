interface MessageBubbleProps {
  role: 'edwin' | 'jan';
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isEdwin = role === 'edwin';

  return (
    <div className={`flex ${isEdwin ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 ${
          isEdwin
            ? 'rounded-2xl rounded-bl-md bg-[#151729]/80 border border-white/[0.05] text-[#f0f0f5]'
            : 'rounded-2xl rounded-br-md bg-amber-600 text-white'
        }`}
      >
        {isEdwin && (
          <span className="mb-1 block text-xs font-medium text-amber-400">
            Edwin
          </span>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <span
            className={`mt-1 block text-xs ${
              isEdwin ? 'text-[#7a7b90]' : 'text-amber-200/70'
            }`}
          >
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
