'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Notification, NotificationType } from '@edwin/shared';
import { getNotifications, markNotificationRead } from '../../lib/api';

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  briefing: { icon: '☀', color: 'text-amber-400' },
  reminder: { icon: '⏰', color: 'text-red-400' },
  alert: { icon: '⚡', color: 'text-red-500' },
  nudge: { icon: '💡', color: 'text-green-400' },
  info: { icon: '📌', color: 'text-zinc-400' },
};

function inferType(n: Notification): NotificationType {
  if (n.type) return n.type;
  const msg = n.message.toLowerCase();
  if (msg.includes('briefing') || msg.includes('good morning')) return 'briefing';
  if (msg.includes('reminder:') || msg.includes('bill due')) return 'reminder';
  if (n.stakesLevel === 'high') return 'alert';
  return 'info';
}

export function NotificationPanel({
  isOpen,
  onClose,
  onCountChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      onCountChange(data.filter((n) => !n.read).length);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        onCountChange(updated.filter((n) => !n.read).length);
        return updated;
      });
    } catch {
      // Silently fail
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-zinc-800 bg-zinc-950 shadow-2xl md:right-auto md:left-64">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">Notifications</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
          >
            &#10005;
          </button>
        </div>

        <div className="h-full overflow-y-auto pb-20">
          {loading ? (
            <div className="px-6 py-8 text-center text-zinc-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500">
              No notifications yet. Edwin will reach out when there&apos;s something worth saying.
            </div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {notifications.map((n) => {
                const type = inferType(n);
                const config = TYPE_CONFIG[type];
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`w-full px-6 py-4 text-left transition-colors hover:bg-zinc-900 ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 text-base ${config.color}`}>{config.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">{n.message}</p>
                        <p className="mt-1 text-xs text-zinc-600">{timeAgo(n.timestamp)}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
