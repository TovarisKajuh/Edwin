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

// Seed Jan's profile if identity table is empty
const existing = store.getAllIdentity();
if (existing.length === 0) {
  seedJanProfile(store);
  server.log.info('Seeded Jan\'s profile into memory');
}

// Register routes
await chatRoutes(server, pipeline);
await voiceRoutes(server, pipeline);
await briefingRoutes(server, pipeline);
await dashboardRoutes(server, store);

server.get('/health', async () => {
  return { status: 'ok', name: 'Edwin', alive: true };
});

startScheduler(pipeline, store);

const port = parseInt(process.env.PORT || '3001');
await server.listen({ port, host: '0.0.0.0' });
console.log(`Edwin's mind is awake on port ${port}`);
