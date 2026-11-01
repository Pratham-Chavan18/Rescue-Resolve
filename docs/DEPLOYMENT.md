# Deployment Guide — Swiggy Unified Recovery (Rescue + Resolve)

Complete production deployment guide for deploying **Swiggy Unified Recovery** across:
- **Frontend:** Vercel (Next.js 14 Monorepo App)
- **Backend:** Render Web Service (NestJS API)
- **PostgreSQL Database:** Supabase (Session Pooler)
- **Evidence Storage:** Supabase Storage (Private Bucket: `recovery-evidence`)
- **Redis Cache:** Upstash Redis (REST API)

---

## Architecture Overview

```mermaid
graph TD
    Client[Web Browser / Mobile Viewport] -->|HTTPS Requests| Vercel[Vercel: Next.js 14 Frontend]
    Client -->|HTTPS API & WSS| Render[Render Web Service: NestJS API]
    Render -->|Session Pooler Port 5432| SupabaseDB[(Supabase PostgreSQL)]
    Render -->|Service Role REST API| SupabaseStorage[(Supabase Storage: recovery-evidence)]
    Render -->|REST HTTPS / Optional| Upstash[(Upstash Redis REST)]
```

---

## 1. Supabase PostgreSQL Database Setup

### Step 1.1: Obtain Connection String (Session Pooler)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to **Project Settings** → **Database**.
3. Scroll down to **Connection Pooling Configuration** / **Connection Strings**.
4. Select the **Session** mode (Session Pooler runs on port `5432`).
5. Copy the connection URI:
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password.

> **Why Session Pooler on Port 5432?**
> The Supabase Session Pooler on port 5432 provides full transaction and prepared statement support, perfectly compatible with Prisma Client `5.22.0` without requiring specialized connection parameter overrides or separate `DIRECT_URL` migration connections.

---

## 2. Supabase Storage for Evidence Uploads

Evidence photos submitted by customers during the **Swiggy Resolve** dispute process are durably stored in a private Supabase Storage bucket.

### Step 2.1: Create Bucket Manually in Supabase Dashboard
1. Go to **Storage** in the Supabase Dashboard sidebar.
2. Click **New bucket**.
3. Set **Bucket Name**: `recovery-evidence`.
4. Ensure **Public bucket** is **DISABLED (OFF)**. Customer proof photos must remain private.
5. Under **Additional settings**, set maximum file size to `2 MB` (2,097,152 bytes) and allowed MIME types to:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
6. Click **Save**.

### Step 2.2: Obtain Supabase API Credentials
1. Go to **Project Settings** → **API**.
2. Copy **Project URL** (`SUPABASE_URL`), e.g.:
   ```
   https://[YOUR-PROJECT-REF].supabase.co
   ```
3. Under **Project API keys**, copy the **`service_role` secret** (`SUPABASE_SERVICE_ROLE_KEY`).
   > ⚠️ **CRITICAL SECURITY REQUIREMENT:** The `service_role` key bypasses Row-Level Security and must **ONLY** be configured on the Render backend. Never prefix with `NEXT_PUBLIC_` or share with the frontend client.

---

## 3. Upstash Redis Setup (Optional / Resilient)

The application includes native integration with `@upstash/redis` via HTTP REST.

### Step 3.1: Obtain REST Credentials
1. Log in to [Upstash Console](https://console.upstash.com/).
2. Create or select a Redis database.
3. In the database **Details** tab, locate **REST API**.
4. Copy:
   - `UPSTASH_REDIS_REST_URL` (starts with `https://...`)
   - `UPSTASH_REDIS_REST_TOKEN`

> **Note on Resiliency:** Upstash credentials are fully optional. If omitted from Render environment variables, the NestJS API logs a notification and continues operating in graceful fallback mode without crashing.

---

## 4. Render Backend Service Setup

Deploy `services/api` as a **Render Web Service**.

### Step 4.1: Create Web Service
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Web Service**.
2. Connect your GitHub repository: `Pratham-Chavan18/Rescue-Resolve`.
3. Set **Branch**: `main`.
4. Set **Root Directory**: `.` (leave at repository root for pnpm monorepo workspace resolution).
5. Set **Environment**: `Node`.
6. Set **Node Version**: `20` or `22`.

### Step 4.2: Render Build & Start Commands
Configure the exact deployment commands:

- **Build Command:**
  ```bash
  pnpm install --frozen-lockfile && pnpm --filter @swiggy/api exec prisma generate && pnpm exec turbo run build --filter=...@swiggy/api --force
  ```
- **Start Command (Option A — Free Tier / Chained Migration & Startup - Recommended):**
  ```bash
  pnpm --filter @swiggy/api run prisma:migrate:deploy && pnpm --filter @swiggy/api start
  ```
  *(If your Render tier does not support Pre-Deploy Commands, chaining with `&&` in the Start Command ensures pending migrations run in the container before the API listens on port 10000.)*

- **Start Command (Option B — Standard Startup if migrated externally or via Paid Pre-Deploy):**
  ```bash
  pnpm --filter @swiggy/api start
  ```

- **Pre-Deploy Command (Only available on Render Paid Plans — leave blank on Free tier):**
  ```bash
  pnpm --filter @swiggy/api run prisma:migrate:deploy
  ```

- **Health Check Path:**
  ```
  /health
  ```

### Step 4.3: Render Environment Variables
Add the following environment variables in Render's **Environment** tab:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[ENCODED-PASSWORD]@[HOST].pooler.supabase.com:5432/postgres
FRONTEND_URL=https://rescue-resolve.vercel.app
NODE_ENV=production
JWT_SECRET=<STRONG_RANDOM_SECRET>
JWT_EXPIRES_IN=7d
DEMO_OTP=1234
UPLOAD_MAX_SIZE_BYTES=2097152
UPLOAD_ALLOWED_MIMES=image/jpeg,image/png,image/webp
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
SUPABASE_STORAGE_BUCKET=recovery-evidence
```

> ⚠️ **URL-Encoding Special Characters in Passwords:**
> If your database password contains characters like `@`, `#`, `:`, `%`, or `/`, you **must URL-encode** them in `DATABASE_URL`.
> Specifically, `@` must be encoded as `%40` (e.g. `ReSolve@3016` → `ReSolve%403016`).
> An unencoded `@` causes Prisma to throw:
> `Error validating datasource db: the URL must start with the protocol postgresql:// or postgres://`

---

## 5. Vercel Frontend Deployment

Deploy `apps/web` as a **Vercel Project**.

### Step 5.1: Create Project in Vercel
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** → **Project**.
2. Select your repository: `Pratham-Chavan18/Rescue-Resolve`.
3. In the configuration screen:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `apps/web` *(Click "Edit" and choose `apps/web`)*
   - Vercel automatically detects Turbo monorepo dependencies and builds `@swiggy/types` and `@swiggy/engines`.

### Step 5.2: Vercel Environment Variables
Add the following frontend variables in Vercel:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://rescue-resolve.onrender.com` | Base URL of deployed Render API |
| `NEXT_PUBLIC_WS_URL` | `https://rescue-resolve.onrender.com` | Base URL for Socket.IO WebSocket gateway |

*(When `NEXT_PUBLIC_WS_URL` is omitted, `apps/web/src/lib/socket.ts` automatically falls back to `NEXT_PUBLIC_API_URL`.)*

---

## 6. One-Time Database Seeding (Demo Personas & Seed Orders)

Once migrations are applied via Render Pre-Deploy command, execute the protected, idempotent seed script **once** to populate synthetic demo personas and sample orders.

### Option A: Using Render Shell (Recommended)
Open **Shell** in your Render Web Service dashboard (which automatically inherits the production `DATABASE_URL` pointing to Supabase) and run:

```bash
SEED_TARGET=production CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA pnpm --filter @swiggy/api run prisma:seed
```

> 🔒 **Production Seeding Guard:** The seed script requires explicit confirmation (`SEED_TARGET=production` and `CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA`). It validates that `DATABASE_URL` is configured, verifies the target host is not localhost, masks the host in logs (`aw***.pooler.supabase.com`), and guarantees that repeat runs never duplicate users, restaurants, menu items, riders, orders, or events.

### Option B: Local Windows PowerShell (Alternative)
If Render Shell is unavailable, you can seed Supabase from your local workstation using a temporary environment variable override. Ensure your database password with `@` is URL-encoded as `%40`:

```powershell
# 1. Verify target migration status against Supabase
$env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[ENCODED-PASSWORD]@[HOST].pooler.supabase.com:5432/postgres"
pnpm --filter @swiggy/api exec prisma migrate status

# 2. Run protected production seed
$env:SEED_TARGET="production"
$env:CONFIRM_PRODUCTION_SEED="YES_SEED_DEMO_DATA"
pnpm --filter @swiggy/api run prisma:seed

# 3. Clean up shell session variables
Remove-Item Env:\DATABASE_URL
Remove-Item Env:\SEED_TARGET
Remove-Item Env:\CONFIRM_PRODUCTION_SEED
```

### Pre-configured Demo Personas:
- **Customer:** Phone `9000000001` (OTP: `1234`)
- **Restaurant Partner:** Phone `9000000002` (OTP: `1234`)
- **Delivery Partner:** Phone `9000000003` (OTP: `1234`)
- **Support Agent:** Phone `9000000004` (OTP: `1234`)

---

## 7. Post-Deployment Smoke-Test Checklist

Verify end-to-end functionality across production environments:

- [ ] **Liveness Probe:** Request `GET https://your-render-service.onrender.com/health` → returns HTTP `200` with `{"status":"ok"}`.
- [ ] **Readiness Probe:** Request `GET https://your-render-service.onrender.com/health/ready` → returns HTTP `200` with `{"status":"ok","database":"connected"}`.
- [ ] **Vercel Landing Page:** Visit `https://your-app.vercel.app` → page loads with Swiggy theme, quick-role switcher, and system status indicator.
- [ ] **Customer Authentication:** Log in as Customer (`9000000001`, OTP `1234`) → redirected to Customer Dashboard.
- [ ] **Live Telemetry & Rescue:** Open `/track`, open Simulator Drawer, inject Rider Stationary fault → health degrades to critical, proactive rescue credit option appears, accepting writes to immutable ledger.
- [ ] **Dispute & Photo Evidence Upload:** Navigate to `/resolve`, file a `wrong_item` dispute, attach an image file → image uploads to Supabase Storage `recovery-evidence` bucket, instant compensation preview displays, customer accepts.
- [ ] **Signed URL Security:** Check evidence image URL on Agent Console (`/agent`) → image resolves via temporary signed URL; raw storage bucket remains private.
- [ ] **WebSocket Connectivity:** Socket.IO handshake succeeds without CORS errors between Vercel domain and Render Web Service.

---

## 8. Troubleshooting Common Failures

### 1. Prisma Migration Fails with P1001 (Connection Timeout)
- **Cause:** Using direct connection on restricted network or incorrect port.
- **Fix:** Ensure connection URI uses Supabase Session Pooler host (`aws-1-...pooler.supabase.com`) on port `5432` with user `postgres.[project-ref]`.

### 2. CORS Block on Socket.IO or HTTP Requests
- **Cause:** `FRONTEND_URL` on Render does not match the actual Vercel domain.
- **Fix:** Update `FRONTEND_URL` on Render to include your exact Vercel production and preview URLs separated by commas (e.g. `https://your-app.vercel.app,https://your-app-git-main.vercel.app`). Do not include trailing slashes.

### 3. Evidence Upload Fails with 403 Forbidden / Invalid Signature
- **Cause:** Missing or incorrect `SUPABASE_SERVICE_ROLE_KEY` or `recovery-evidence` bucket not created.
- **Fix:** Verify `SUPABASE_SERVICE_ROLE_KEY` is the secret service role key (not anon key) and ensure bucket `recovery-evidence` exists in Supabase Storage.

### 4. Port Binding Error on Render
- **Cause:** Hardcoding port 4000.
- **Fix:** The API in `services/api/src/main.ts` automatically uses `process.env.PORT` assigned dynamically by Render and listens on `0.0.0.0`. Do not override `PORT` in Render dashboard.
