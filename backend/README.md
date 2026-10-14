# 🍽️ MessPulse Backend API

Production-grade RESTful backend for the **MessPulse** (CUTM Smart Mess Management & Feedback Analytics System). Built with Node.js, Express, PostgreSQL, and JWT authentication with HTTP-only cookies.

---

## 📋 1. Requirements

- **Node.js**: `v20.x` or higher (tested on Node 22+)
- **PostgreSQL**: `v14.x` or higher (tested on PostgreSQL 17)
- **npm**: `v10.x` or higher

---

## 🗄️ 2. PostgreSQL Setup & Database Creation

Ensure PostgreSQL service is running locally on your system:

```bash
# macOS (Homebrew)
brew services start postgresql@17

# Linux (systemd)
sudo systemctl start postgresql
```

Create the `messpulse` database:

```bash
createdb messpulse
```

---

## ⚙️ 3. Environment Variables Configuration

Copy the example environment file and update with your local credentials:

```bash
cp .env.example .env
```

### Environment Keys in `.env`:

| Key | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/messpulse` |
| `JWT_SECRET` | Secret key for signing authentication JWTs | *(Min 16 chars secure random string)* |
| `JWT_EXPIRES_IN` | JWT token validity duration | `24h` |
| `COOKIE_SECRET` | Secret key for cookie parsing & signing | *(Secure string)* |
| `FRONTEND_URL` | Frontend origin for CORS credentials | `http://localhost:5173` |
| `ADMIN_NAME` | Initial seeded Administrator name | `Mess Administrator` |
| `ADMIN_EMAIL` | Initial seeded Administrator email | `admin@cutm.ac.in` |
| `ADMIN_REG_NO` | Initial seeded Administrator registration number | `ADMIN001` |
| `ADMIN_PASSWORD` | Initial seeded Administrator password | `AdminPass123` |

---

## 🚀 4. Running Migrations & Seeding

### Step 1: Run Database Schema Migrations
Applies extensions (`uuid-ossp`, `citext`), enums, tables, check constraints, and unique indexes:

```bash
npm run migrate
```

### Step 2: Seed Initial Admin & Weekly Menu
Seeds the initial administrator and automatically imports all 60 unique dishes and 117 weekly menu slots from `weeklyMenu.json`:

```bash
npm run seed
```

*Note: The seed script is completely idempotent and safe to run multiple times.*

---

## 🏃 5. Starting the Backend Server

```bash
# Development mode (with file watcher)
npm run dev

# Production mode
npm start
```

When started, the server will output:
```
✅ Connected to PostgreSQL database: [messpulse]
🚀 MessPulse Backend running on http://localhost:5000
📡 Environment: [development] | Timezone: [Asia/Kolkata]
🔗 Health Check: http://localhost:5000/api/health
```

---

## 🏥 6. API Health Check Endpoint

Check system status and PostgreSQL connectivity:

```bash
curl http://localhost:5000/api/health
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "MessPulse Backend API is running smoothly.",
  "data": {
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-10-08T06:30:00.000Z",
    "database": "connected"
  }
}
```

---

## 🔐 7. Authentication & Login Behavior

### Registration
- **Endpoint:** `POST /api/v1/auth/register`
- **Body:** `{ "fullName": "Aman Kumar", "email": "aman@cutm.ac.in", "regNo": "210101120045", "password": "Password123" }`
- **Security Rule:** Public registration **ALWAYS** creates a student account (`role = 'student'`).
- Sets an `HttpOnly`, `SameSite=Lax`, `24h` cookie named `messpulse_token`.

### Login: Email OR Registration Number
Students and Admins can log in using either their registered email address **OR** their CUTM registration number with the same endpoint:

```bash
# Login via Email
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@cutm.ac.in", "password": "AdminPass123"}'

# Login via Registration Number
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "ADMIN001", "password": "AdminPass123"}'
```

### Profile & Session
- **`GET /api/v1/auth/me`**: Reads the HTTP-only cookie and returns the authenticated user profile.
- **`POST /api/v1/auth/logout`**: Clears the authentication cookie.

---

## 🧪 8. Running Automated Tests

Run the complete test suite (Auth, DB constraints, and Time calculations):

```bash
npm test
```

**Test Coverage Summary:**
- **Auth Suite (`tests/auth.test.js`):** Registration, duplicate email/reg_no rejection, password complexity, dual-identifier login, inactive account rejection, cookie issuance, student/admin RBAC verification, logout.
- **Database Suite (`tests/dbConstraints.test.js`):** 1–5 star check constraint, 1 rating per user/meal/day unique constraint, 1 vote per user/dish/day unique constraint, feedback length check & soft deletion.
- **Time Engine Suite (`tests/time.test.js`):** Asia/Kolkata timezone calculations, active meal detection, meal countdowns, and non-closing rating/voting availability rules.

---

## 🛡️ 9. Security Features

- **Helmet**: Secures HTTP response headers.
- **CORS**: Restricted to `FRONTEND_URL` with credentials allowed.
- **Bcrypt**: Work factor `12` salt rounds for password hashing.
- **Zod**: Input validation on all incoming request payloads.
- **Parameterized Queries**: 100% SQL injection immunity using `pg` query parameters.
- **HTTP-Only Cookies**: Protection against XSS token harvesting.
