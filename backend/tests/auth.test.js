import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/database.js';
import { env } from '../src/config/env.js';

describe('Authentication & RBAC Tests', () => {
  const testStudent = {
    fullName: 'Test Student',
    email: `student_${Date.now()}@cutm.ac.in`,
    regNo: `REG_${Date.now().toString().slice(-6)}`,
    password: 'Password123',
  };

  let studentCookie = null;
  let adminCookie = null;

  after(async () => {
    // Cleanup test user
    await query('DELETE FROM users WHERE email = $1 OR reg_no = $2', [testStudent.email, testStudent.regNo]);
  });

  it('GET /api/health should return status ok with database connected', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.database, 'connected');
  });

  it('POST /api/v1/auth/register should register a new student and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testStudent);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.user.email, testStudent.email.toLowerCase());
    assert.equal(res.body.data.user.regNo, testStudent.regNo);
    assert.ok(!res.body.data.user.password_hash);
    assert.ok(res.body.data.token);

    // Verify cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies.length > 0);
    assert.ok(cookies[0].includes('messpulse_token='));
    assert.ok(cookies[0].includes('HttpOnly'));
    studentCookie = cookies[0];
  });

  it('POST /api/v1/auth/register should reject duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Another Student',
        email: testStudent.email,
        regNo: `DIFF_${Date.now().toString().slice(-6)}`,
        password: 'Password123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'EMAIL_EXISTS');
  });

  it('POST /api/v1/auth/register should reject duplicate registration number with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Another Student',
        email: `unique_${Date.now()}@cutm.ac.in`,
        regNo: testStudent.regNo,
        password: 'Password123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'REG_NO_EXISTS');
  });

  it('POST /api/v1/auth/register should reject invalid password (< 8 chars or no numbers)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Invalid User',
        email: `invalid_${Date.now()}@cutm.ac.in`,
        regNo: `INV_${Date.now().toString().slice(-6)}`,
        password: 'short',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login should authenticate via EMAIL', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testStudent.email,
        password: testStudent.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testStudent.email.toLowerCase());
    assert.equal(res.body.data.user.role, 'student');
  });

  it('POST /api/v1/auth/login should authenticate via REGISTRATION NUMBER', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testStudent.regNo,
        password: testStudent.password,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.regNo, testStudent.regNo);
  });

  it('POST /api/v1/auth/login should reject incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testStudent.email,
        password: 'WrongPassword999',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login should reject deactivated user with 403', async () => {
    // Temporarily deactivate student
    await query('UPDATE users SET is_active = FALSE WHERE email = $1', [testStudent.email]);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testStudent.email,
        password: testStudent.password,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ACCOUNT_DEACTIVATED');

    // Reactivate student
    await query('UPDATE users SET is_active = TRUE WHERE email = $1', [testStudent.email]);
  });

  it('GET /api/v1/auth/me should return current user profile when authenticated with cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testStudent.email.toLowerCase());
  });

  it('GET /api/v1/admin/test should FORBID students with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/test')
      .set('Cookie', studentCookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN_ADMIN_ONLY');
  });

  it('POST /api/v1/auth/login should log in the seeded ADMIN', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'admin');
    const cookies = res.headers['set-cookie'];
    adminCookie = cookies[0];
  });

  it('GET /api/v1/admin/test should ALLOW admin with 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/test')
      .set('Cookie', adminCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'admin');
  });

  it('POST /api/v1/auth/logout should clear the cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    assert.equal(res.status, 200);
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies[0].includes('messpulse_token=;'));
  });
});
