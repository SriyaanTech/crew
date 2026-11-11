# CrewDesk – Crew Management System

```
crewdesk/
  frontend/   React + Vite (the website)
  backend/    Node.js + Express API
  backend/database/crewdesk_demo.sql    ← import this in phpMyAdmin (tables + sample data)
  backend/database/crewdesk_empty.sql   ← or this one for a clean start (tables + 1 admin)
```

## 1. Database (phpMyAdmin)

1. Start **MySQL** (XAMPP / WAMP / Laragon control panel) and open **phpMyAdmin** (usually http://localhost/phpmyadmin).
2. Click **New** → database name `crewdesk` → collation `utf8mb4_unicode_ci` → **Create**.
3. Select the `crewdesk` database → **Import** tab → choose `backend/database/crewdesk_demo.sql` → **Import**.
   You should see 25 tables (crew, vessels, contracts, payroll …).

> Re-importing the file **replaces** all CrewDesk tables and their data.

## 2. Backend (Node.js 20+)

```bash
cd backend
npm install
# edit .env: DB_USER / DB_PASSWORD must match your MySQL (XAMPP default is root with an empty password)
npm run dev
```

Check it: open http://localhost:8000/api/health → `{"ok":true,"db":"connected"}`

*(Alternative to phpMyAdmin: `npm run db:setup` creates the database and loads demo data from the command line.)*

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The `.env` file already points to `http://localhost:8000/api`.

## Logins (demo data)

**Staff** – "Staff Login" on the login page. Password for all: `Staff@12345`

| Role | Email |
|---|---|
| Super Admin | admin@crewdesk.com |
| HR Manager | hr@crewdesk.com |
| Crewing Manager | crewing@crewdesk.com |
| Recruitment Manager | recruitment@crewdesk.com |
| Recruitment Executive | recruiter@crewdesk.com |
| Documentation Executive | docs@crewdesk.com |
| Operations Manager | ops@crewdesk.com |
| Accounts Manager | accounts@crewdesk.com |
| Vessel Master | master@crewdesk.com |
| Client Representative | client@crewdesk.com |

**Crew (seafarers)** – click "Crew Portal" on the login page. Log in with a **Crew ID** such as `CRW-0001`, `CRW-0002`… (or the seafarer's email). Password: `Crew@12345`

With `crewdesk_empty.sql` only `admin@crewdesk.com` / `Staff@12345` exists.

**Change these passwords before real use.** Staff passwords are set in Users & Roles. Seafarer portal passwords are set on the crew profile (Edit profile → Crew portal access).

### Two-factor login (MFA)
Turn it on per user in **Users & Roles** (tick "Require MFA") or for everyone in **Settings**. On the next login the user is shown a setup key to add to Google/Microsoft Authenticator, then enters the 6-digit code. To re-enrol a user who lost their phone, click the key icon on their row.

## Going live

| Part | Where | Notes |
|---|---|---|
| Frontend | Vercel | Set **Environment Variable** `VITE_API_URL=https://your-api-domain/api`, then redeploy. `vercel.json` is included so page refreshes work. |
| Backend | Any Node host: VPS, Render, Railway, or cPanel "Setup Node.js App" | Vercel does not run this backend with MySQL. Set the `.env` values on the host. |
| MySQL | Your hosting's MySQL + phpMyAdmin | Import `crewdesk_empty.sql` (or the demo file). On cPanel the DB name/user usually have a prefix; put those in backend `.env`. |

Backend `.env` for production:
- `CORS_ORIGIN=https://crewdesk-sriyaan.vercel.app` (your Vercel URL, comma-separate several)
- `PUBLIC_URL=https://your-api-domain` (used for uploaded file links)
- `JWT_SECRET=` a long random string – run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `NODE_ENV=production`

Uploaded files are saved in `backend/uploads/`; back this folder up together with the database.
