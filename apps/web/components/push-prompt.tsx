'use client';

import { useEffect, useState } from 'react';
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

async function subscribeToPush(): Promise<boolean> {
  try {
    const keyRes = await fetch(`${API_URL}/api/push/vapid-key`, {
      headers: { ...getAuthHeaders() },
    });
    if (!keyRes.ok) {
      console.error('[Push] VAPID key fetch failed:', keyRes.status);
      return false;
    }
    const { publicKey } = await keyRes.json();

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });

    const subJson = subscription.toJSON();
    const subRes = await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    });

    if (!subRes.ok) {
      console.error('[Push] Subscribe failed:', subRes.status);
      return false;
    }

    console.log('[Push] Successfully subscribed');
    return true;
  } catch (err) {
    console.error('[Push] Subscription error:', err);
    return false;
  }
}

export function PushPrompt() {
  const [state, setState] = useState<'checking' | 'prompt' | 'hidden'>('checking');

  useEffect(() => {
    checkPushState();
  }, []);

  async function checkPushState() {
    // Not supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('hidden');
      return;
    }

    // Already denied at browser level — nothing we can do
    if (Notification.permission === 'denied') {
      setState('hidden');
      return;
    }

    // Already granted — check if actually subscribed
    if (Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Already subscribed, all good
        setState('hidden');
        return;
      }
      // Permission granted but not subscribed — try silently
      await subscribeToPush();
      setState('hidden');
      return;
    }

    // Permission is 'default' — show prompt
    setState('prompt');
  }

  async function handleAllow() {
    setState('hidden');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch {
      // Silently fail — prompt is already hidden
    }
  }

  if (state !== 'prompt') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-[20px] border border-white/[0.05] bg-[#151729]/80 p-4 shadow-2xl backdrop-blur-xl md:bottom-6 md:left-auto md:right-6">
      <p className="text-sm text-[#f0f0f5]">
        Allow Edwin to send you notifications? He&apos;ll only reach out when it matters.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAllow}
          className="flex-1 rounded-[12px] bg-amber-500 px-4 py-2 text-sm font-medium text-[#0b0d19] transition-colors hover:bg-amber-400"
        >
          Allow
        </button>
        <button
          onClick={() => setState('hidden')}
          className="flex-1 rounded-[12px] bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#7a7b90] transition-colors hover:bg-white/[0.1]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
