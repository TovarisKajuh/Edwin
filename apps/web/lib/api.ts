import type { ChatRequest, ChatResponse, DashboardData, BriefingResponse, StreamDoneEvent, Notification, NotificationCountResponse, BriefingStatus } from '@edwin/shared';
import { getAuthHeaders } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function verifyAccessKey(key: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}

export async function sendMessage(message: string, conversationId?: number): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ message, conversationId } satisfies ChatRequest),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  return res.json();
}

/**
 * Stream Edwin's response token-by-token via SSE.
 * Calls onDelta for each text chunk, returns conversationId when done.
 */
export async function streamMessage(
  message: string,
  onDelta: (delta: string) => void,
  conversationId?: number,
): Promise<StreamDoneEvent> {
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ message, conversationId } satisfies ChatRequest),
  });

  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Stream error: ${res.status}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneEvent: StreamDoneEvent | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6);
      try {
        const event = JSON.parse(json);
        if (event.done) {
          doneEvent = event as StreamDoneEvent;
        } else if (event.delta) {
          onDelta(event.delta);
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  if (!doneEvent) throw new Error('Stream ended without done event');
  return doneEvent;
}

export async function sendVoice(
  transcript: string,
  conversationId?: number
): Promise<{ audio: ArrayBuffer; message: string; conversationId: number }> {
  const res = await fetch(`${API_URL}/api/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ transcript, conversationId }),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Voice error: ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('audio/')) {
    // Server returned audio (ElevenLabs/OpenAI TTS)
    const audio = await res.arrayBuffer();
    const message = decodeURIComponent(res.headers.get('X-Edwin-Message') || '');
    const convId = parseInt(res.headers.get('X-Edwin-Conversation-Id') || '0');
    return { audio, message, conversationId: convId };
  }

  // Server returned JSON (browser TTS mode)
  const data = await res.json();
  return { audio: new ArrayBuffer(0), message: data.message, conversationId: data.conversationId };
}

export async function sendVoiceAudio(
  audioBlob: Blob,
  conversationId?: number
): Promise<{ audio: ArrayBuffer; message: string; transcript: string; conversationId: number }> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  if (conversationId) {
    formData.append('conversationId', conversationId.toString());
  }

  const res = await fetch(`${API_URL}/api/voice/audio`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Voice audio error: ${res.status}`);
  }

  const transcript = decodeURIComponent(res.headers.get('X-Edwin-Transcript') || '');
  const message = decodeURIComponent(res.headers.get('X-Edwin-Message') || '');
  const convId = parseInt(res.headers.get('X-Edwin-Conversation-Id') || '0');

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('audio/')) {
    const audio = await res.arrayBuffer();
    return { audio, message, transcript, conversationId: convId };
  }

  const data = await res.json();
  return { audio: new ArrayBuffer(0), message: data.message, transcript: data.transcript, conversationId: data.conversationId };
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Dashboard error: ${res.status}`);
  return res.json();
}

export async function getBriefing(): Promise<BriefingResponse> {
  const res = await fetch(`${API_URL}/api/briefing`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Briefing error: ${res.status}`);
  return res.json();
}

export async function getNotifications(): Promise<Notification[]> {
  const res = await fetch(`${API_URL}/api/notifications`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Notifications error: ${res.status}`);
  const data = await res.json();
  return data.notifications;
}

export async function getNotificationCount(): Promise<number> {
  const res = await fetch(`${API_URL}/api/notifications/count`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Notification count error: ${res.status}`);
  const data: NotificationCountResponse = await res.json();
  return data.count;
}

export async function testPush(): Promise<{ success: boolean; sent: number }> {
  const res = await fetch(`${API_URL}/api/push/test`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Push test error: ${res.status}`);
  return res.json();
}

export async function getBriefingStatus(): Promise<BriefingStatus> {
  const res = await fetch(`${API_URL}/api/briefing/status`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Briefing status error: ${res.status}`);
  return res.json();
}

export async function markNotificationRead(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Mark read error: ${res.status}`);
}

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthError';
  }
}
