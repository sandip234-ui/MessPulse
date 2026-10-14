# 🍽️ MessPulse — Campus Dining Experience & Analytics Platform

MessPulse is a production-grade, full-stack campus dining management and customer experience platform built for Centurion University of Technology & Management (CUTM). It features real-time schedule tracking, time-governed meal ratings, dish sentiment polling, student feedback moderation, and executive analytics dashboards powered by PostgreSQL.

---

## 🏛️ System Architecture

```
                    ┌──────────────────────────────────────┐
                    │       React 19 + Vite Frontend       │
                    │   Modern Glassmorphism UI / Tailwind │
                    └─────────────────┬────────────────────┘
                                      │
                                    Axios
                                      │ (HTTP-Only Secure Cookie)
                    ┌─────────────────▼───────────────────┐
                    │      Node.js / Express REST API     │
                    │  RBAC, Zod Validation, Rate Limiter │
                    └─────────────────┬───────────────────┘
                                      │
                                  pg Pool
                                      │ (Parameterized Queries)
                    ┌─────────────────▼────────────────┐
                    │       PostgreSQL Database        │
                    │ Master Menus, Votes, Ratings, FB │
                    └──────────────────────────────────┘
```

---

## 🚀 Key Production Features

1. **Live Dining Schedule Engine (`Asia/Kolkata`)**:
   - Computes active, upcoming, and completed meal slots (Breakfast, Lunch, Snacks, Dinner).
   - Real-time countdowns for service closing and next meal opening.

2. **Time-Governed Meal Rating System**:
   - Enforces 1–5 star ratings per student per meal slot per day.
   - Automatically unlocks at meal start time and persists cumulatively for the day.

3. **Community Dish Sentiment Polling**:
   - Single-vote per dish per day with instant vote-switching capability (`👍 Tasty` vs `👎 Not Good`).
   - Real-time approval percentage calculation and campus taste leaderboard.

4. **Structured Feedback & Ticket Moderation**:
   - Categorized feedback submissions with character counters and student registration linkage.
   - Soft-delete support for students; status triage (`pending`, `reviewed`, `resolved`) for mess administrators.

5. **Executive Analytics Dashboard**:
   - Real-time PostgreSQL aggregation for total ratings, feedback tickets, poll volume, and satisfaction index.
   - High-contrast Chart.js visualizations (7-Day Satisfaction Trend line chart, Meal Comparison bar chart, Dish Sentiment doughnut chart).

6. **Hardened Security & Authentication**:
   - HTTP-only signed JWT cookies (24-hour expiration) preventing XSS token theft.
   - Server-side Role-Based Access Control (RBAC) strictly separating students from administrators.
   - BCrypt password hashing (12 salt rounds), in-memory rate limiting against brute force, Helmet security headers, and strict CORS configuration.

---

## 📦 Project Structure

```
MessPulse/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment (Zod) and PostgreSQL pool configuration
│   │   ├── controllers/     # REST request handlers
│   │   ├── db/              # SQL migrations and admin seed script
│   │   ├── middleware/      # Auth, RBAC, Zod validation, error handler, rate limiter
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic, time engine, database queries
│   │   ├── utils/           # Standardized API response formatters & dish emojis
│   │   ├── validators/      # Zod input validation schemas
│   │   ├── app.js           # Express application configuration
│   │   └── server.js        # Server entrypoint with graceful shutdown
│   ├── tests/               # Automated node:test API integration test suites
│   ├── .env.example         # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/          # Static assets & icons
│   │   ├── components/      # Reusable Glassmorphism components (Navbar, AuthModal, etc.)
│   │   ├── context/         # AuthContext (session state) & ThemeContext (light/dark)
│   │   ├── pages/           # Application views (Home, Rating, Voting, Feedback, Dashboard, ManageMenu)
│   │   ├── services/        # Axios API clients
│   │   ├── utils/           # Time, date, and emoji helper utilities
│   │   ├── index.css        # Centralized Glassmorphism design tokens & styles
│   │   └── main.jsx         # Vite entrypoint
│   ├── .env.example         # Frontend environment template
│   ├── vite.config.js       # Vite proxy & Tailwind setup
│   └── package.json
│
└── README.md
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL (v14+) running locally or in Docker

### 2. Database Initialization
Create a PostgreSQL database named `messpulse`:
```bash
createdb messpulse
```

### 3. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env to set your DATABASE_URL and secure JWT_SECRET

# Run database schema migration
npm run migrate

# Seed initial master menu and default administrator
npm run seed

# Run automated test suite
npm test

# Start backend dev server (port 5000)
npm run dev
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install

# Run frontend dev server (port 5173 with automatic backend proxy)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://localhost:5432/messpulse` |
| `DB_POOL_MAX` | Maximum concurrent database pool connections | `20` |
| `JWT_SECRET` | Secret key for signing authentication JWTs (min 16 chars) | `(cryptographically secure secret)` |
| `JWT_EXPIRES_IN` | Token expiration duration | `24h` |
| `COOKIE_SECRET` | Secret key for cookie parser signing | `(cookie secret string)` |
| `COOKIE_SAME_SITE`| SameSite policy (`lax`, `strict`, `none`) | `lax` |
| `COOKIE_SECURE` | Enforce HTTPS-only cookie transmission | `false` (dev) / `true` (prod) |
| `FRONTEND_URL` | Allowed CORS origin(s) (comma-separated if multiple) | `http://localhost:5173` |
| `ADMIN_NAME` | Seed administrator name | `Mess Administrator` |
| `ADMIN_EMAIL` | Seed administrator email | `admin@cutm.ac.in` |
| `ADMIN_REG_NO` | Seed administrator identifier | `ADMIN001` |
| `ADMIN_PASSWORD` | Seed administrator password | `AdminPass123` |

### Frontend (`frontend/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Direct backend API URL for production deployment | `(empty defaults to /api/v1 via proxy)` |

---

## 🚢 Production Deployment Architecture (Neon + Render + Vercel)

MessPulse is configured and tested for deployment on the following stack:
- **Database**: [Neon](https://neon.tech) Serverless PostgreSQL
- **Backend API**: [Render](https://render.com) Web Service
- **Frontend App**: [Vercel](https://vercel.com) Edge/SPA

```
┌─────────────────────────────────┐
│         VERCEL (Frontend)       │
│     React 19 + Vite (dist)      │
│  https://messpulse.vercel.app   │
└────────────────┬────────────────┘
                 │ HTTPS (withCredentials: true)
                 │ Cross-Origin Cookie (SameSite: None, Secure: true)
┌────────────────▼────────────────┐
│         RENDER (Backend)        │
│       Node.js / Express         │
│  https://messpulse.onrender.com │
└────────────────┬────────────────┘
                 │ TLS / SSL (sslmode=require)
┌────────────────▼────────────────┐
│         NEON (Database)         │
│      Serverless PostgreSQL      │
└─────────────────────────────────┘
```

---

### Step-by-Step Deployment Guide

#### 1. Database Provisioning on Neon
1. Create a project on [Neon](https://neon.tech) named `messpulse-prod`.
2. Copy the pooled PostgreSQL connection string (`postgresql://[user]:[password]@[endpoint]-pooler.[region].neon.tech/messpulse?sslmode=require`).
3. Run the schema migrations and seed the initial production catalog:
   ```bash
   cd backend
   DATABASE_URL="your-neon-connection-string" npm run migrate
   DATABASE_URL="your-neon-connection-string" npm run seed
   ```

#### 2. Backend Deployment on Render
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** ➔ **Web Service** (or use **Blueprint** pointing to `render.yaml`).
3. Configure the service:
   - **Name**: `messpulse-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5001`
   - `DATABASE_URL`: `postgresql://...neon.tech/messpulse?sslmode=require`
   - `DB_POOL_MAX`: `10`
   - `JWT_SECRET`: `(generate a strong 64-character random string)`
   - `JWT_EXPIRES_IN`: `24h`
   - `COOKIE_SECRET`: `(generate a strong random string)`
   - `COOKIE_SAME_SITE`: `none`
   - `COOKIE_SECURE`: `true`
   - `FRONTEND_URL`: `https://your-app-name.vercel.app`
   - `ADMIN_NAME`: `Mess Administrator`
   - `ADMIN_EMAIL`: `admin@cutm.ac.in`
   - `ADMIN_REG_NO`: `ADMIN001`
   - `ADMIN_PASSWORD`: `(your secure admin password)`
5. Click **Create Web Service**. Once deployed, copy your Render URL (`https://messpulse-api.onrender.com`).

#### 3. Frontend Deployment on Vercel
1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** ➔ **Project**.
2. Select your MessPulse repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://messpulse-api.onrender.com/api/v1`
5. Click **Deploy**. Vercel will build the SPA and enable single-page routing via `frontend/vercel.json`.
6. Return to Render and update `FRONTEND_URL` with your final Vercel domain (e.g., `https://messpulse.vercel.app`).

### Option B: Monolithic Single-Server / Docker Deployment

1. Build frontend:
   ```bash
   cd frontend && npm install && npm run build
   ```
2. Start backend server:
   ```bash
   cd ../backend && npm install && npm run migrate && npm start
   ```

---

## 🧪 Testing & Quality Assurance

```bash
# Run all backend integration tests (Auth, Menu, Ratings, Voting, Feedback, Analytics, Timezone)
cd backend && npm test

# Run frontend linting & static analysis
cd frontend && npm run lint

# Run frontend production build validation
cd frontend && npm run build
```

---

## 📄 License
Centurion University of Technology & Management (CUTM). All rights reserved.
