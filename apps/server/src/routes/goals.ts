import type { FastifyInstance } from 'fastify';
import { MemoryStore } from '../memory/store.js';
import {
  getGoals,
  addGoal,
  updateGoalValue,
  removeGoal,
  getGoalSnapshot,
  type GoalCategory,
} from '../tracking/goals.js';

const VALID_CATEGORIES = ['financial', 'fitness', 'social', 'lifestyle', 'personal'];

export async function goalRoutes(server: FastifyInstance, store: MemoryStore) {
  // GET /api/goals — all goals with progress
  server.get('/api/goals', async () => {
    const snapshot = getGoalSnapshot(store);
    return {
      goals: snapshot.goals.map((p) => ({
        ...p.goal,
        percentage: p.percentage,
        onTrack: p.onTrack,
        projectedCompletion: p.projectedCompletion,
        accelerationNeeded: p.accelerationNeeded,
      })),
      overallScore: snapshot.overallScore,
      topWin: snapshot.topWin,
      topConcern: snapshot.topConcern,
    };
  });

  // POST /api/goals — add a new goal
  server.post<{
    Body: { id: string; name: string; category: string; target: number; unit: string; deadline: string };
  }>('/api/goals', async (request, reply) => {
    const { id, name, category, target, unit, deadline } = request.body;
    if (!id || !name || !category || !target || !unit || !deadline) {
      reply.code(400);
      return { error: 'Missing required fields: id, name, category, target, unit, deadline' };
    }
    if (!VALID_CATEGORIES.includes(category)) {
      reply.code(400);
      return { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
    }
    addGoal(store, id, name, category as GoalCategory, target, unit, deadline);
    return { ok: true, id };
  });

  // PUT /api/goals/:id/value — update a goal's current value
  server.put<{
    Params: { id: string };
    Body: { value: number };
  }>('/api/goals/:id/value', async (request, reply) => {
    const { id } = request.params;
    const { value } = request.body;
    if (value == null) {
      reply.code(400);
      return { error: 'value is required' };
    }
    updateGoalValue(store, id, value);
    return { ok: true, id, value };
  });

  // DELETE /api/goals/:id — remove a goal
  server.delete<{ Params: { id: string } }>('/api/goals/:id', async (request, reply) => {
    const { id } = request.params;
    const removed = removeGoal(store, id);
    if (!removed) {
      reply.code(404);
      return { error: 'Goal not found' };
    }
    return { ok: true, id };
  });
}
