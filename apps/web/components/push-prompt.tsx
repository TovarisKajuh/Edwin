'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthHeaders } from '../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const checkPermission = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;

    const stored = localStorage.getItem('edwin-push-prompted');
    if (stored === 'subscribed') {
      // Verify subscription is still active
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) return; // Actually subscribed, all good
      // Subscription lost — re-prompt
      localStorage.removeItem('edwin-push-prompted');
    }
    if (stored === 'dismissed') {
      // Allow re-prompting after auth fix — check if enough time passed
      // For now, always re-prompt (user can dismiss again)
      localStorage.removeItem('edwin-push-prompted');
    }

    if (Notification.permission === 'granted') {
      // Already granted — subscribe silently if not already
      await subscribeToPush();
      return;
    }

    if (Notification.permission === 'denied') {
      localStorage.setItem('edwin-push-prompted', 'dismissed');
      return;
    }

    // Show prompt after a short delay (not aggressive)
    setTimeout(() => setShowPrompt(true), 3000);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  async function subscribeToPush() {
    try {
      // Get VAPID public key from server
      const keyRes = await fetch(`${API_URL}/api/push/vapid-key`, {
        headers: { ...getAuthHeaders() },
      });
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      // Send subscription to server
      const subJson = subscription.toJSON();
      await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      localStorage.setItem('edwin-push-prompted', 'subscribed');
      setSubscribed(true);
      setShowPrompt(false);
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
    }
  }

  async function handleAllow() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush();
    } else {
      localStorage.setItem('edwin-push-prompted', 'dismissed');
      setShowPrompt(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('edwin-push-prompted', 'dismissed');
    setShowPrompt(false);
  }

  if (!showPrompt || subscribed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl md:bottom-6 md:left-auto md:right-6">
      <p className="text-sm text-zinc-200">
        Allow Edwin to send you notifications? He&apos;ll only reach out when it matters.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAllow}
          className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
        >
          Allow
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-700"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
