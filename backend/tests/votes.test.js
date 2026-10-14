import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query } from '../src/config/database.js';
import { isMealVotingOpen, MEAL_SCHEDULE } from '../src/services/timeService.js';

describe('Voting & Leaderboard API Integration Tests', () => {
  let studentCookie;
  let testUserId;
  let testDishId;
  let testMealSlot;

  const testStudent = {
    fullName: 'Vote Tester',
    email: `votetester_${Date.now()}@cutm.ac.in`,
    regNo: `VOTE_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  before(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testStudent);
    studentCookie = regRes.headers['set-cookie'][0];
    testUserId = regRes.body.data.user.id;

    // Fetch a dish from today's menu
    const todayRes = await request(app).get('/api/v1/menu/today');
    const todayDetails = todayRes.body.data.details;

    // Pick first available meal and dish
    for (const [meal, dishes] of Object.entries(todayDetails)) {
      if (dishes.length > 0) {
        testMealSlot = meal;
        testDishId = dishes[0].id;
        break;
      }
    }
  });

  after(async () => {
    await query('DELETE FROM dish_votes WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('GET /api/v1/votes/today should require authentication', async () => {
    const res = await request(app).get('/api/v1/votes/today');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/votes/today should return all today dishes and leaderboard', async () => {
    const res = await request(app)
      .get('/api/v1/votes/today')
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.dishes));
    assert.ok(Array.isArray(res.body.data.leaderboard));
    assert.ok(res.body.data.dishes.length > 0);
  });

  it('POST /api/v1/votes should cast and update vote with correct aggregates', async () => {
    const isOpen = isMealVotingOpen(testMealSlot);

    if (isOpen) {
      // 1. Cast UP vote
      const voteRes1 = await request(app)
        .post('/api/v1/votes')
        .set('Cookie', studentCookie)
        .send({
          dishId: testDishId,
          mealSlot: testMealSlot,
          voteType: 'up',
        });

      assert.equal(voteRes1.status, 200);
      assert.equal(voteRes1.body.data.userVote, 'up');
      assert.ok(voteRes1.body.data.upVotes >= 1);

      // 2. Change vote to DOWN -> should update in place (UPSERT)
      const voteRes2 = await request(app)
        .post('/api/v1/votes')
        .set('Cookie', studentCookie)
        .send({
          dishId: testDishId,
          mealSlot: testMealSlot,
          voteType: 'down',
        });

      assert.equal(voteRes2.status, 200);
      assert.equal(voteRes2.body.data.userVote, 'down');

      // Verify DB contains only 1 vote row for this user and dish today
      const countRes = await query(
        'SELECT COUNT(*)::INT AS c FROM dish_votes WHERE user_id = $1 AND dish_id = $2 AND vote_date = CURRENT_DATE',
        [testUserId, testDishId]
      );
      assert.equal(countRes.rows[0].c, 1, 'UPSERT must update existing vote without creating duplicate records');
    }
  });

  it('POST /api/v1/votes should reject locked meal slots with 400', async () => {
    const closedMeal = MEAL_SCHEDULE.find((m) => !isMealVotingOpen(m.key));
    if (closedMeal) {
      const res = await request(app)
        .post('/api/v1/votes')
        .set('Cookie', studentCookie)
        .send({
          dishId: testDishId,
          mealSlot: closedMeal.key,
          voteType: 'up',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VOTING_LOCKED_FOR_MEAL');
    }
  });
});
