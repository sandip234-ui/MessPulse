import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Feedback Subsystem API Integration Tests', () => {
  let student1Cookie, student1Id;
  let student2Cookie, student2Id;
  let adminCookie;

  let createdFeedback1Id;
  let createdFeedback2Id;

  const student1 = {
    fullName: 'Student One',
    email: `student1_${Date.now()}@cutm.ac.in`,
    regNo: `S1_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  const student2 = {
    fullName: 'Student Two',
    email: `student2_${Date.now()}@cutm.ac.in`,
    regNo: `S2_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  before(async () => {
    // Register student 1
    const reg1 = await request(app).post('/api/v1/auth/register').send(student1);
    student1Cookie = reg1.headers['set-cookie'][0];
    student1Id = reg1.body.data.user.id;

    // Register student 2
    const reg2 = await request(app).post('/api/v1/auth/register').send(student2);
    student2Cookie = reg2.headers['set-cookie'][0];
    student2Id = reg2.body.data.user.id;

    // Login admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      identifier: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    adminCookie = adminRes.headers['set-cookie'][0];
  });

  after(async () => {
    await query('DELETE FROM feedback WHERE user_id IN ($1, $2)', [student1Id, student2Id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [student1Id, student2Id]);
  });

  it('POST /api/v1/feedback should automatically assign authenticated user ID (no spoofing)', async () => {
    // Attempting to send a spoofed user_id in the body
    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Cookie', student1Cookie)
      .send({
        category: 'hygiene',
        message: 'The dining area tables were cleaned promptly today.',
        userId: '00000000-0000-0000-0000-000000000000', // Spoofed ID
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    createdFeedback1Id = res.body.data.id;

    // Check in database that the actual user_id stored is student1Id
    const dbRes = await query('SELECT user_id, is_deleted FROM feedback WHERE id = $1', [createdFeedback1Id]);
    assert.equal(dbRes.rows[0].user_id, student1Id, 'Backend must use req.user.id exclusively');
    assert.equal(dbRes.rows[0].is_deleted, false);
  });

  it('Student 2 submits feedback', async () => {
    const res = await request(app)
      .post('/api/v1/feedback')
      .set('Cookie', student2Cookie)
      .send({
        category: 'food_quality',
        message: 'The dal quality during lunch needs improvement.',
      });

    assert.equal(res.status, 201);
    createdFeedback2Id = res.body.data.id;
  });

  it('GET /api/v1/feedback should return ONLY student 1 feedback for student 1', async () => {
    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Cookie', student1Cookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // Student 1 should see only feedback 1, NOT feedback 2
    const found1 = res.body.data.items.find((f) => f.id === createdFeedback1Id);
    const found2 = res.body.data.items.find((f) => f.id === createdFeedback2Id);
    assert.ok(found1, 'Student 1 must see their own feedback');
    assert.equal(found2, undefined, 'Student 1 must NOT see Student 2 feedback');
  });

  it('GET /api/v1/feedback should return ALL feedback for admin', async () => {
    const res = await request(app)
      .get('/api/v1/feedback')
      .set('Cookie', adminCookie);

    assert.equal(res.status, 200);
    const found1 = res.body.data.items.find((f) => f.id === createdFeedback1Id);
    const found2 = res.body.data.items.find((f) => f.id === createdFeedback2Id);
    assert.ok(found1 && found2, 'Admin must see feedback from all students');
  });

  it('DELETE /api/v1/feedback/:id: Student 1 CANNOT delete Student 2 feedback (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/feedback/${createdFeedback2Id}`)
      .set('Cookie', student1Cookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_OWNER_ONLY');
  });

  it('DELETE /api/v1/feedback/:id: Student 1 CAN delete their own feedback (Soft Deletion)', async () => {
    const res = await request(app)
      .delete(`/api/v1/feedback/${createdFeedback1Id}`)
      .set('Cookie', student1Cookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted, true);

    // Verify soft-deleted in DB (row still exists, is_deleted = TRUE)
    const dbRes = await query('SELECT is_deleted FROM feedback WHERE id = $1', [createdFeedback1Id]);
    assert.equal(dbRes.rows[0].is_deleted, true);

    // Verify it no longer appears in GET /api/v1/feedback
    const listRes = await request(app)
      .get('/api/v1/feedback')
      .set('Cookie', student1Cookie);
    const found = listRes.body.data.items.find((f) => f.id === createdFeedback1Id);
    assert.equal(found, undefined, 'Soft deleted feedback must be excluded from active feeds');
  });

  it('PATCH /api/v1/feedback/:id/status: Admin CAN update feedback status', async () => {
    const res = await request(app)
      .patch(`/api/v1/feedback/${createdFeedback2Id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'resolved' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'resolved');
  });

  it('PATCH /api/v1/feedback/:id/status: Student CANNOT update feedback status (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/feedback/${createdFeedback2Id}/status`)
      .set('Cookie', student2Cookie)
      .send({ status: 'resolved' });

    assert.equal(res.status, 403);
  });
});
