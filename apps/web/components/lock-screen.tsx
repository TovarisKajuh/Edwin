'use client';

import { useState } from 'react';
import { verifyAccessKey } from '@/lib/api';
import { setAccessKey } from '@/lib/auth';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(false);

    try {
      const valid = await verifyAccessKey(key.trim());
      if (valid) {
        setAccessKey(key.trim());
        onUnlock();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Edwin</h1>
          <p className="text-zinc-500 text-sm mt-1">At your service, sir.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(false); }}
            placeholder="Access key"
            autoFocus
            className={`w-full px-4 py-3 bg-zinc-900 border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              error ? 'border-red-500' : 'border-zinc-800'
            }`}
          />

          {error && (
            <p className="text-red-400 text-sm">Invalid access key.</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
