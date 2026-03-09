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
  audio?: string; // base64-encoded audio from server
}

export interface DashboardData {
  greeting: string;
  date: string;
  weather?: WeatherData;
  schedule: ScheduleItem[];
  pendingActions: PendingAction[];
  goals: DashboardGoal[];
  habits: DashboardHabit[];
  recentNews: DashboardNewsItem[];
  financeSummary: {
    pendingBills: { name: string; amount: number | null; dueIn: number }[];
  };
  quickStats: {
    conversationsToday: number;
    activeGoals: number;
    upcomingEvents: number;
    currentStreak: number;
  };
}

export interface DashboardGoal {
  id: string;
  name: string;
  category: string;
  progress: number;
  onTrack: boolean;
}

export interface DashboardHabit {
  name: string;
  streak: number;
  status: 'done' | 'pending' | 'missed';
  goal: number | null;
  completedThisWeek: number;
}

export interface DashboardNewsItem {
  title: string;
  source: string;
  relevance: number;
  link: string;
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

// Notifications
export type NotificationType = 'briefing' | 'reminder' | 'alert' | 'nudge' | 'info';

export interface Notification {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
  stakesLevel: StakesLevel;
  type?: NotificationType;
}

export interface NotificationCountResponse {
  count: number;
}

// Streaming chat events (SSE)
export interface StreamDeltaEvent {
  delta: string;
}

export interface StreamDoneEvent {
  done: true;
  conversationId: number;
}

export type StreamEvent = StreamDeltaEvent | StreamDoneEvent;

export interface BriefingStatus {
  pending: boolean;
  id?: number;
}

export type Source = 'told' | 'observed' | 'inferred' | 'superseded' | 'compressed';
export type StakesLevel = 'low' | 'medium' | 'high';
export type Channel = 'chat' | 'voice' | 'notification';
export type TimeOfDay = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
export type DayType = 'weekday' | 'saturday' | 'sunday';
