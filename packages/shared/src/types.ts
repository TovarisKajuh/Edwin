export interface Message {
  id: number;
  conversationId: number;
  role: 'edwin' | 'jan';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number;
  channel: 'chat' | 'voice' | 'notification';
  startedAt: string;
  endedAt?: string;
  summary?: string;
  mood?: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: number;
}

export interface ChatResponse {
  message: string;
  conversationId: number;
  audioUrl?: string;
}

export interface VoiceRequest {
  transcript: string;
  conversationId?: number;
}

export interface VoiceResponse {
  message: string;
  conversationId: number;
  audio: ArrayBuffer;
}

export interface BriefingResponse {
  text: string;
  audio: ArrayBuffer;
}

export interface DashboardData {
  greeting: string;
  date: string;
  weather?: WeatherData;
  schedule: ScheduleItem[];
  pendingActions: PendingAction[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  high: number;
  low: number;
  location: string;
}

export interface ScheduleItem {
  id: number;
  title: string;
  time: string;
  type: string;
}

export interface PendingAction {
  id: number;
  description: string;
  stakesLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'proposed' | 'accepted' | 'declined' | 'done';
}

export type Source = 'told' | 'observed' | 'inferred' | 'superseded' | 'compressed';
export type StakesLevel = 'low' | 'medium' | 'high';
export type Channel = 'chat' | 'voice' | 'notification';
export type TimeOfDay = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
export type DayType = 'weekday' | 'saturday' | 'sunday';
