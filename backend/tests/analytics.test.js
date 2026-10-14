import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Admin Analytics API Integration Tests', () => {
  let studentCookie;
  let adminCookie;
  let testUserId;
  let testDishId;

  const testStudent = {
    fullName: 'Analytics Tester',
    email: `analyticstester_${Date.now()}@cutm.ac.in`,
    regNo: `ANL_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  before(async () => {
    // Register student
    const regRes = await request(app).post('/api/v1/auth/register').send(testStudent);
    studentCookie = regRes.headers['set-cookie'][0];
    testUserId = regRes.body.data.user.id;

    // Login admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    adminCookie = adminRes.headers['set-cookie'][0];

    // Get a dish
    const dishRes = await query('SELECT id FROM dishes LIMIT 1');
    testDishId = dishRes.rows[0].id;

    // Seed test activity:
    // 1. Rating
    await query(
      `INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
       VALUES ($1, CURRENT_DATE, 'dinner', 5)
       ON CONFLICT (user_id, rating_date, meal_slot) DO UPDATE SET rating = 5;`,
      [testUserId]
    );

    // 2. Vote
    await query(
      `INSERT INTO dish_votes (user_id, dish_id, vote_date, meal_slot, vote_type)
       VALUES ($1, $2, CURRENT_DATE, 'dinner', 1)
       ON CONFLICT (user_id, dish_id, vote_date) DO UPDATE SET vote_type = 1;`,
      [testUserId, testDishId]
    );

    // 3. Active feedback
    await query(
      `INSERT INTO feedback (user_id, category, message, is_deleted)
       VALUES ($1, 'service', 'Staff was very helpful during dinner.', FALSE);`,
      [testUserId]
    );

    // 4. Soft-deleted feedback (MUST be excluded from analytics)
    await query(
      `INSERT INTO feedback (user_id, category, message, is_deleted)
       VALUES ($1, 'other', 'This feedback was deleted and should not be counted.', TRUE);`,
      [testUserId]
    );
  });

  after(async () => {
    await query('DELETE FROM meal_ratings WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM dish_votes WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM feedback WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('GET /api/v1/analytics/overview should FORBID students with 403', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Cookie', studentCookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ADMIN_ONLY');
  });

  it('GET /api/v1/analytics/overview should ALLOW admin and return complete computed metrics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Cookie', adminCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Check KPIs
    assert.ok(data.kpis);
    assert.ok(data.kpis.totalRatings >= 1);
    assert.ok(data.kpis.totalVotes >= 1);
    assert.ok(data.kpis.totalFeedback >= 1);

    // Check Meal Averages
    assert.ok(data.averageRatings);
    assert.ok(data.averageRatings.dinner >= 1);

    // Check Weekly Satisfaction
    assert.ok(data.weeklySatisfaction);
    assert.equal(data.weeklySatisfaction.labels.length, 7);

    // Check Feedback Breakdown
    assert.ok(data.feedbackBreakdown);
    assert.ok(Array.isArray(data.feedbackBreakdown.categories));

    // Verify soft-deleted feedback is excluded
    const deletedFound = data.feedbackBreakdown.categories.find(
      (c) => c.category === 'other' && c.count > 0
    );
    assert.equal(deletedFound, undefined, 'Soft-deleted feedback must be excluded from analytics breakdown');

    // Check Leaderboard & Insights
    assert.ok(Array.isArray(data.leaderboard));
    assert.ok(Array.isArray(data.insights));
  });
});
