import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

server.get('/health', async () => {
  return { status: 'ok', name: 'Edwin', alive: true };
});

const port = parseInt(process.env.PORT || '3001');
await server.listen({ port, host: '0.0.0.0' });
console.log(`Edwin's mind is awake on port ${port}`);
