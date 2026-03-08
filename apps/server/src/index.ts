import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { Database } from './db/database.js';
import { MemoryStore } from './memory/store.js';
import { seedJanProfile } from './memory/seed/jan-profile.js';
import { BrainPipeline } from './brain/pipeline.js';
import { chatRoutes } from './routes/chat.js';
import { voiceRoutes } from './routes/voice.js';
import { briefingRoutes } from './routes/briefing.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { notificationRoutes } from './routes/notifications.js';
import { pushRoutes } from './routes/push.js';
import { reviewRoutes } from './routes/review.js';
import { profileRoutes } from './routes/profile.js';
import { goalRoutes } from './routes/goals.js';
import { startScheduler } from './jobs/scheduler.js';

dotenv.config({ path: '../../.env' });

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  exposedHeaders: ['X-Edwin-Message', 'X-Edwin-Conversation-Id'],
});

// Initialize core systems
const db = new Database();
const store = new MemoryStore(db);
const pipeline = new BrainPipeline(store);

// Seed Jan's profile — identity uses ON CONFLICT so always safe to re-run.
// Observations are guarded inside seedJanProfile to avoid duplicates.
seedJanProfile(store);
server.log.info('Jan\'s profile synced');

// Register routes
await chatRoutes(server, pipeline);
await voiceRoutes(server, pipeline);
await briefingRoutes(server, store);
await dashboardRoutes(server, store);
await notificationRoutes(server, store);
await pushRoutes(server, store);
await reviewRoutes(server, store);
await profileRoutes(server, store);
await goalRoutes(server, store);

server.get('/health', async () => {
  return { status: 'ok', name: 'Edwin', alive: true };
});

startScheduler(store);

const port = parseInt(process.env.PORT || '3001');
await server.listen({ port, host: '0.0.0.0' });
console.log(`Edwin's mind is awake on port ${port}`);
