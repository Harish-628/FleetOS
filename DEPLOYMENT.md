# FleetOS Production Deployment Guide (Render & Vercel)

This guide walks you through deploying **FleetOS** to production using **Render** (FastAPI Backend + PostgreSQL) and **Vercel** (React Vite PWA Frontend).

---

## Architecture Overview
- **Backend**: FastAPI (Python 3.12+), SQLAlchemy 2.0, Uvicorn, SlowAPI Rate Limiting, HTTP Security Headers. Deployed on **Render Web Service**.
- **Frontend**: React 19, Tailwind CSS, Vite PWA (Service Worker + Offline Dexie.js), Bilingual English/Tamil (`ta-IN`), Voice-to-Text. Deployed on **Vercel**.
- **Database**: Managed PostgreSQL (Render PostgreSQL or Neon.tech Serverless Postgres).

---

## 1. Backend Deployment (Render)

### Option A: Using `render.yaml` (Blueprint Deploy - Recommended)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** ➔ **Blueprint**.
3. Connect your GitHub repository: `https://github.com/Harish-628/FleetOS`.
   - **Region**: `Singapore`
   - **Plan**: `Free`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install --upgrade pip && pip install .`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Supply the required environment variables in the Render Dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g. `postgresql+asyncpg://<user>:<password>@<host>/<dbname>?sslmode=require`).
   - `JWT_SECRET_KEY`: A secure random 64-character secret.
   - `DRIVER_QR_SECRET`: A secure random secret for driver QR signing.
   - `ADMIN_PASSWORD`: Strong password for the admin account (default username: `admin`).
   - `DEFAULT_DRIVER_PASSWORD`: Password for default owner-driver account (`senthilraja`).
   - `ALLOWED_ORIGINS`: Your Vercel frontend URL (e.g., `https://fleetos.vercel.app`).
   - (Optional) `GOOGLE_SERVICE_ACCOUNT_JSON` & `GOOGLE_CALENDAR_ID` for live Google Calendar sync.
   - (Optional) `STORAGE_BACKEND=s3` with `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` for cloud receipt storage.

### Option B: Manual Web Service Setup on Render
1. Click **New +** ➔ **Web Service**.
2. Select your repository `FleetOS`.
3. Set **Region** to `Singapore`.
4. Set **Root Directory** to `backend`.
5. Set **Runtime** to `Python 3`.
6. Set **Build Command**: `pip install --upgrade pip && pip install .`
7. Set **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
8. Add the environment variables listed above.

---

## 2. Frontend Deployment (Vercel)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository `https://github.com/Harish-628/FleetOS`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `frontend`)
   - **Build Command**: `cd frontend && npm install && npm run build` (or `npm run build` if Root Directory is `frontend`)
   - **Output Directory**: `frontend/dist` (or `dist` if Root Directory is `frontend`)
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: The public URL of your Render backend API + `/api/v1`  
     *Example:* `https://fleetos-backend.onrender.com/api/v1`
6. Click **Deploy**.

---

## 3. Post-Deployment Verification Checklist

1. **Admin Portal**:
   - Access `https://your-vercel-domain.vercel.app/#admin`.
   - Log in with `admin` and your configured `ADMIN_PASSWORD`.
   - Check vehicle status (`TN37aw6052`, 23-Seater Tourist Coach), calendar tour schedules, and P&L metrics.
2. **Driver Cockpit**:
   - Access `https://your-vercel-domain.vercel.app/#driver`.
   - Log in with driver credentials (e.g., `senthilraja` / `senthilraja123`).
   - Test offline caching, 3-step trip workflow, and Tamil voice dictation.
3. **Security**:
   - Verify security headers with `curl -I https://your-backend.onrender.com/api/v1/compliance/vehicle-status`:
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Strict-Transport-Security: max-age=31536000`
     - `Permissions-Policy: camera=(self), microphone=(self)`
