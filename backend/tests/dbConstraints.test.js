import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';

describe('PostgreSQL Database Constraints & Integrity Tests', () => {
  let testUserId;
  let testDishId;

  before(async () => {
    // Create test user and get a dish
    const userRes = await query(
      `INSERT INTO users (full_name, email, reg_no, password_hash, role)
       VALUES ('Constraint Tester', 'constraint@cutm.ac.in', 'CONST001', 'dummyhash', 'student')
       ON CONFLICT (email) DO UPDATE SET full_name = 'Constraint Tester'
       RETURNING id;`
    );
    testUserId = userRes.rows[0].id;

    const dishRes = await query('SELECT id FROM dishes LIMIT 1;');
    testDishId = dishRes.rows[0].id;

    // Clean up previous test ratings/votes for this user
    await query('DELETE FROM meal_ratings WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM dish_votes WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM feedback WHERE user_id = $1', [testUserId]);
  });

  after(async () => {
    await query('DELETE FROM meal_ratings WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM dish_votes WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM feedback WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  it('Rating must be between 1 and 5 (Check Constraint)', async () => {
    // Attempting rating of 6 should fail
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
           VALUES ($1, CURRENT_DATE, 'lunch', 6);`,
          [testUserId]
        );
      },
      (err) => {
        assert.equal(err.code, '23514'); // check_violation
        return true;
      }
    );

    // Attempting rating of 0 should fail
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
           VALUES ($1, CURRENT_DATE, 'lunch', 0);`,
          [testUserId]
        );
      },
      (err) => {
        assert.equal(err.code, '23514');
        return true;
      }
    );
  });

  it('Only one rating allowed per user per meal slot per day (Unique Constraint)', async () => {
    // First rating should succeed
    const first = await query(
      `INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
       VALUES ($1, CURRENT_DATE, 'lunch', 4)
       RETURNING id;`,
      [testUserId]
    );
    assert.ok(first.rows[0].id);

    // Duplicate insert for the same meal on the same day should fail
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO meal_ratings (user_id, rating_date, meal_slot, rating)
           VALUES ($1, CURRENT_DATE, 'lunch', 5);`,
          [testUserId]
        );
      },
      (err) => {
        assert.equal(err.code, '23505'); // unique_violation
        return true;
      }
    );
  });

  it('Only one vote allowed per user per dish per day (Unique Constraint)', async () => {
    // First vote
    const firstVote = await query(
      `INSERT INTO dish_votes (user_id, dish_id, vote_date, meal_slot, vote_type)
       VALUES ($1, $2, CURRENT_DATE, 'lunch', 1)
       RETURNING id;`,
      [testUserId, testDishId]
    );
    assert.ok(firstVote.rows[0].id);

    // Duplicate vote for same dish on same day should violate unique constraint
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO dish_votes (user_id, dish_id, vote_date, meal_slot, vote_type)
           VALUES ($1, $2, CURRENT_DATE, 'dinner', -1);`,
          [testUserId, testDishId]
        );
      },
      (err) => {
        assert.equal(err.code, '23505'); // unique_violation
        return true;
      }
    );
  });

  it('Feedback supports soft deletion and length checks', async () => {
    // Message too short (<10 chars) should fail check constraint
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO feedback (user_id, category, message)
           VALUES ($1, 'hygiene', 'short');`,
          [testUserId]
        );
      },
      (err) => {
        assert.equal(err.code, '23514');
        return true;
      }
    );

    // Valid feedback insert
    const insertRes = await query(
      `INSERT INTO feedback (user_id, category, message)
       VALUES ($1, 'food_quality', 'This is a valid test feedback message for testing soft deletion.')
       RETURNING id, is_deleted;`,
      [testUserId]
    );
    const feedbackId = insertRes.rows[0].id;
    assert.equal(insertRes.rows[0].is_deleted, false);

    // Soft delete
    await query('UPDATE feedback SET is_deleted = TRUE WHERE id = $1', [feedbackId]);

    // Query active feedback
    const activeRes = await query('SELECT id FROM feedback WHERE id = $1 AND is_deleted = FALSE', [feedbackId]);
    assert.equal(activeRes.rowCount, 0);

    // Query all feedback includes soft deleted
    const allRes = await query('SELECT id, is_deleted FROM feedback WHERE id = $1', [feedbackId]);
    assert.equal(allRes.rowCount, 1);
    assert.equal(allRes.rows[0].is_deleted, true);
  });
});
