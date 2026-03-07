'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { sendMessage } from '@/lib/api';
import { useAudio } from '@/hooks/use-audio';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';

interface ChatMessage {
  id: number;
  role: 'edwin' | 'jan';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { play, speak } = useAudio();
  const nextId = useRef(1);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    async (text: string) => {
      const janMessage: ChatMessage = {
        id: nextId.current++,
        role: 'jan',
        content: text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, janMessage]);
      setLoading(true);

      try {
        const response = await sendMessage(text, conversationId);

        const edwinMessage: ChatMessage = {
          id: nextId.current++,
          role: 'edwin',
          content: response.message,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        setMessages((prev) => [...prev, edwinMessage]);
        setConversationId(response.conversationId);

        if (response.audioUrl) {
          play(response.audioUrl);
        } else {
          speak(response.message);
        }
      } catch {
        const errorMessage: ChatMessage = {
          id: nextId.current++,
          role: 'edwin',
          content:
            'I seem to be having trouble thinking clearly, sir. Please try again in a moment.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, play, speak]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-zinc-100">Edwin</h1>
        <p className="text-xs text-zinc-500">
          {loading ? 'Edwin is thinking...' : 'Online'}
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 md:pb-24">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg text-zinc-400">
              Start a conversation with Edwin.
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              He&apos;s ready when you are, sir.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
