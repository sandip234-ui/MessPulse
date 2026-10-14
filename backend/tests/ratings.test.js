import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query } from '../src/config/database.js';
import { isMealRatingOpen, MEAL_SCHEDULE } from '../src/services/timeService.js';

describe('Ratings API Integration Tests', () => {
  let studentCookie;
  let testUserId;
  const testStudent = {
    fullName: 'Rating Tester',
    email: `ratingtester_${Date.now()}@cutm.ac.in`,
    regNo: `RATE_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  before(async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testStudent);
    studentCookie = regRes.headers['set-cookie'][0];
    testUserId = regRes.body.data.user.id;
  });

  after(async () => {
    await query('DELETE FROM meal_ratings WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('GET /api/v1/ratings/today should require authentication', async () => {
    const res = await request(app).get('/api/v1/ratings/today');
    assert.equal(res.status, 401);
  });

  it('GET /api/v1/ratings/today should return 0 for unrated meals', async () => {
    const res = await request(app)
      .get('/api/v1/ratings/today')
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.ratings, {
      breakfast: 0,
      lunch: 0,
      snacks: 0,
      dinner: 0,
    });
  });

  it('POST /api/v1/ratings should reject ratings outside 1-5 with 400', async () => {
    const res = await request(app)
      .post('/api/v1/ratings')
      .set('Cookie', studentCookie)
      .send({
        mealSlot: 'breakfast',
        rating: 6,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/ratings should enforce meal window and upsert rating', async () => {
    // Determine which meal slot is open right now
    const openMeal = MEAL_SCHEDULE.find((m) => isMealRatingOpen(m.key));
    const closedMeal = MEAL_SCHEDULE.find((m) => !isMealRatingOpen(m.key));

    // If there is an open meal slot, test rating submission & upsert
    if (openMeal) {
      // 1. Submit rating 4
      const rateRes1 = await request(app)
        .post('/api/v1/ratings')
        .set('Cookie', studentCookie)
        .send({
          mealSlot: openMeal.key,
          rating: 4,
        });

      assert.equal(rateRes1.status, 200);
      assert.equal(rateRes1.body.data.rating, 4);

      // Verify in GET /api/v1/ratings/today
      const getRes1 = await request(app)
        .get('/api/v1/ratings/today')
        .set('Cookie', studentCookie);
      assert.equal(getRes1.body.data.ratings[openMeal.key], 4);

      // 2. Submit rating 5 for the same meal on the same day -> should update existing (UPSERT)
      const rateRes2 = await request(app)
        .post('/api/v1/ratings')
        .set('Cookie', studentCookie)
        .send({
          mealSlot: openMeal.key,
          rating: 5,
        });

      assert.equal(rateRes2.status, 200);
      assert.equal(rateRes2.body.data.rating, 5);

      // Verify in DB that only 1 record exists for this user and meal today
      const dbCount = await query(
        'SELECT COUNT(*)::INT AS c FROM meal_ratings WHERE user_id = $1 AND rating_date = CURRENT_DATE AND meal_slot = $2',
        [testUserId, openMeal.key]
      );
      assert.equal(dbCount.rows[0].c, 1, 'UPSERT must update existing row without creating duplicate ratings');

      // 3. Delete rating
      const delRes = await request(app)
        .delete(`/api/v1/ratings/${openMeal.key}`)
        .set('Cookie', studentCookie);

      assert.equal(delRes.status, 200);
      assert.equal(delRes.body.data.cleared, true);

      // Verify it is back to 0
      const getRes2 = await request(app)
        .get('/api/v1/ratings/today')
        .set('Cookie', studentCookie);
      assert.equal(getRes2.body.data.ratings[openMeal.key], 0);
    }

    // If there is a closed meal slot, test that it is rejected with 400
    if (closedMeal) {
      const closedRes = await request(app)
        .post('/api/v1/ratings')
        .set('Cookie', studentCookie)
        .send({
          mealSlot: closedMeal.key,
          rating: 4,
        });

      assert.equal(closedRes.status, 400);
      assert.equal(closedRes.body.error.code, 'MEAL_RATING_LOCKED');
    }
  });
});
