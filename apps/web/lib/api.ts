import type { ChatRequest, ChatResponse, DashboardData, BriefingResponse } from '@edwin/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function sendMessage(message: string, conversationId?: number): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId } satisfies ChatRequest),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  return res.json();
}

export async function sendVoice(
  transcript: string,
  conversationId?: number
): Promise<{ audio: ArrayBuffer; message: string; conversationId: number }> {
  const res = await fetch(`${API_URL}/api/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, conversationId }),
  });
  if (!res.ok) throw new Error(`Voice error: ${res.status}`);
  const audio = await res.arrayBuffer();
  const message = decodeURIComponent(res.headers.get('X-Edwin-Message') || '');
  const convId = parseInt(res.headers.get('X-Edwin-Conversation-Id') || '0');
  return { audio, message, conversationId: convId };
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard`);
  if (!res.ok) throw new Error(`Dashboard error: ${res.status}`);
  return res.json();
}

export async function getBriefing(): Promise<BriefingResponse> {
  const res = await fetch(`${API_URL}/api/briefing`);
  if (!res.ok) throw new Error(`Briefing error: ${res.status}`);
  return res.json();
}
