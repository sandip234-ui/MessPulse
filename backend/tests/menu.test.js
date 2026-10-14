import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Menu & Meals API Integration Tests', () => {
  let studentCookie;
  let adminCookie;
  const testStudent = {
    fullName: 'Menu Tester',
    email: `menutester_${Date.now()}@cutm.ac.in`,
    regNo: `MENU_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  before(async () => {
    // Register student
    const regRes = await request(app).post('/api/v1/auth/register').send(testStudent);
    studentCookie = regRes.headers['set-cookie'][0];

    // Login admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    adminCookie = adminRes.headers['set-cookie'][0];
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = $1', [testStudent.email]);
  });

  it('GET /api/v1/menu/weekly should return full 7-day schedule with all 4 meal slots', async () => {
    const res = await request(app).get('/api/v1/menu/weekly');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.menu);
    assert.ok(res.body.data.menu.Monday);
    assert.ok(res.body.data.menu.Monday.breakfast.length > 0);
    assert.ok(res.body.data.menu.Sunday.dinner.length > 0);
  });

  it('GET /api/v1/menu/today should return today\'s menu and active meal status', async () => {
    const res = await request(app).get('/api/v1/menu/today');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.day);
    assert.ok(res.body.data.menu);
    assert.ok(Array.isArray(res.body.data.menu.breakfast));
    assert.ok(Array.isArray(res.body.data.menu.lunch));
  });

  it('GET /api/v1/meals/status should return live status, completed meals, and availability windows', async () => {
    const res = await request(app).get('/api/v1/meals/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.todayName);
    assert.ok(res.body.data.todayDate);
    assert.ok(res.body.data.mealWindows);
    assert.ok(res.body.data.mealWindows.breakfast);
    assert.ok(typeof res.body.data.mealWindows.breakfast.ratingOpen === 'boolean');
    assert.ok(typeof res.body.data.mealWindows.breakfast.votingOpen === 'boolean');
  });

  it('PUT /api/v1/menu/manage should REJECT non-admin users with 403', async () => {
    const res = await request(app)
      .put('/api/v1/menu/manage')
      .set('Cookie', studentCookie)
      .send({
        day: 'Monday',
        meal: 'breakfast',
        dishes: ['Puri', 'Aloo Sabzi'],
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ADMIN_ONLY');
  });

  it('PUT /api/v1/admin/menu should ALLOW admin to update meal slot and preserve master dish IDs', async () => {
    // 1. Check existing dish ID for "Idli"
    const dishBefore = await query("SELECT id FROM dishes WHERE name = 'Idli'");
    const idliId = dishBefore.rows[0]?.id;

    // 2. Admin updates Monday breakfast to ["Special Dosa", "Coconut Chutney", "Filter Coffee"]
    const updateRes = await request(app)
      .put('/api/v1/admin/menu')
      .set('Cookie', adminCookie)
      .send({
        day: 'Monday',
        meal: 'breakfast',
        dishes: ['Special Dosa', 'Coconut Chutney', 'Filter Coffee'],
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.deepEqual(updateRes.body.data.dishes, ['Special Dosa', 'Coconut Chutney', 'Filter Coffee']);

    // 3. Verify that the master "Idli" dish was NOT deleted (stable dish ID integrity preserved)
    if (idliId) {
      const dishAfter = await query('SELECT id FROM dishes WHERE id = $1', [idliId]);
      assert.equal(dishAfter.rowCount, 1, 'Master dish record must not be deleted when removed from weekly menu');
    }

    // 4. Verify new dishes are assigned to Monday breakfast
    const verifyRes = await request(app).get('/api/v1/menu/weekly');
    assert.deepEqual(
      verifyRes.body.data.menu.Monday.breakfast,
      ['Special Dosa', 'Coconut Chutney', 'Filter Coffee']
    );

    // 5. Restore Monday breakfast back to original
    await request(app)
      .put('/api/v1/menu/manage')
      .set('Cookie', adminCookie)
      .send({
        day: 'Monday',
        meal: 'breakfast',
        dishes: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea/Coffee'],
      });
  });
});
