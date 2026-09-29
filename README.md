# JobHopper Admin Portal

A modern, high-trust administrative back-office portal built for **JobHopper** — the two-sided marketplace connecting clients with verified local trades and service professionals.

Designed directly to reflect the official **JobHopper Brand Identity & Design System** (`Inter` typography, signature `#1e3a5f` navy, `#10b981` trust green, soft tinted surfaces, pill UI elements, and high-diffusion card shadows).

---

## 🚀 Features & Backend API Integrations

The admin UI integrates with the endpoints implemented in `job-hopper-backend`:

| Module | Endpoints Covered | Functionality |
|---|---|---|
| **Admin Auth** | `POST /admin/login` | Secure administrator authentication with token persistence, role verification, and quick-fill demo credentials. |
| **Worker Verification Queue** | `GET /admin/workers/verification-queue`<br>`PATCH /admin/workers/:id/verification` | Review submitted Government ID (Front/Back) and live selfie photos. Approve to grant the **Verified Badge** (+20 Trust Score) or reject with custom feedback. |
| **User Management** | `GET /admin/users`<br>`PATCH /admin/users/:id/deactivate` | Browse and filter registered Workers and Clients. Filter by active/deactivated status. Deactivate or reactivate accounts with one click. |
| **Jobs & Escrow Orders** | `GET /admin/jobs` | Track marketplace transactions across all lifecycle states (`open`, `en_route`, `arrived`, `started`, `completed`, `paid`, `disputed`). Inspect photos, addresses, budgets, and priority fees. |
| **Reports & Disputes** | `GET /reports`<br>`PATCH /reports/:id` | Arbitrate client-worker complaints, workmanship disputes, and billing claims with official resolution notes. |
| **Trade Taxonomy** | `GET /categories`<br>`POST /categories`<br>`PATCH /categories/:id`<br>`DELETE /categories/:id` | Manage active service categories (Plumbing, Electrical, Painting, etc.) and slugs for marketplace search. |
| **Platform Economics** | `GET /settings/fees`<br>`PATCH /admin/settings` | Configure platform commission %, flat priority dispatch fees, taxes, and response timeouts with a live interactive fee simulator. |
| **Server Health** | `GET /health` | Real-time status indicator connecting to `VITE_API_URL` (see `.env.example`) with an automatic interactive demo fallback when the backend is offline. |

---

## 🎨 Design System Tokens

- **Navy (Primary Brand)**: `#1e3a5f`
- **Navy Light / Gradient Stop**: `#3e78c5`
- **Accent Green (Trust / Action)**: `#10b981`
- **Soft Blue Surface**: `#e7f1ff`
- **Soft Green Surface**: `#e2fff5`
- **Navy Band Gradient**: `linear-gradient(90deg, #3e78c5 0%, #1e3a5f 30.768%, #1e3a5f 69.76%, #3e78c5 100%)`
- **Typography**: Inter (Google Fonts)

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure URLs
```bash
cp .env.example .env
```
Set `VITE_API_URL` (backend) and `VITE_MARKETPLACE_URL` (public marketplace) in `.env`. Restart the dev server after changing it — Vite reads `.env` only on startup.

### 3. Run the Development Server
```bash
npm run dev
```
The admin portal will start at **`http://localhost:5174`** (or next available port).

### 4. Login
- **Demo Fill**: Click **"Use Quick Demo Credentials"** on the login screen to sign in instantly with sample data.
- **Live Backend**: Ensure `job-hopper-backend` is running on `http://localhost:3050` and log in with your seeded administrator credentials.
