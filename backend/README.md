# CrewDesk API (Node.js + Express + MySQL)

See the main README one folder up for setup. Quick reference:

| Command | What it does |
|---|---|
| `npm run dev` | start with auto-reload (http://localhost:8000/api) |
| `npm start` | start for production |
| `npm run db:setup` | create DB + tables + demo data (**drops existing CrewDesk tables**) |
| `npm run db:setup -- --empty` | same, but only one admin account |
| `npm run db:export-sql` | regenerate the phpMyAdmin files in `database/` |

## How it is organised

| File | Purpose |
|---|---|
| `src/resources.js` | every table: API name ↔ MySQL table, columns, id prefix, permission module. **Add a column here** and re-export the SQL. |
| `src/crud.js` | generic REST endpoints + role checks + crew-portal restrictions + audit log |
| `src/hooks.js` | business rules across tables (sign-on/off, assignment overlap check, crew status sync, recruitment onboarding) – each runs in one DB transaction |
| `src/auth.js` | login (staff by email, crew by Crew ID/email), JWT, TOTP two-factor, change password |
| `src/config.js` | stored role permissions + settings (`app_config` table) |
| `src/seed/` | demo data generator (same data as the frontend demo mode) |

## API

All under `/api`, JSON, `Authorization: Bearer <token>` (except login/health).

- `POST /auth/login` `{ email, password, portal: "staff" | "crew" }` (crew may send Crew ID as `email`) → `{ token, user }` or `{ mfaRequired, mfaToken, setupKey? }`
- `POST /auth/mfa` `{ mfaToken, code }` → `{ token, user }`
- `POST /auth/change-password` `{ currentPassword, newPassword }`
- `GET /auth/me`, `POST /auth/logout`
- `GET|POST /{resource}`, `GET|PATCH|DELETE /{resource}/{id}` for: crew, seaService, comments, clients, vessels, documents, vacancies, applications, assignments, contracts, medicals, travel, signOns, signOffs, appraisals, payroll, salaryStructures, courses, trainingRecords, notifications, requests, users, audit (read-only)
  - list endpoints accept simple equality filters, e.g. `GET /documents?crewId=CRW-0001`
  - send `password` on `users` / `crew` to set a (hashed) password; hashes are never returned
- `POST /applications/{id}/onboard` → planned assignment + draft contract + crew status "Planned"
- `GET|PUT /config/permissions`, `GET|PUT /config/settings`
- `POST /uploads` (multipart `file`) → `{ fileName, url }` (PDF, images, Word, Excel; max 10 MB)

## Security notes
- Passwords: bcrypt. Login rate-limited (30 tries / 15 min / IP).
- Roles: checked on every request against the permission matrix (editable in the app). Super Admin can't be locked out.
- Seafarers only ever see/modify their own records; profile edits are limited to contact details.
- Uploaded files get random, unguessable names but are publicly reachable by URL. For stricter document privacy, put `uploads/` behind authenticated download links or S3 signed URLs.
- Not yet enforced on the server: the per-user "Record access scope" (e.g. client users seeing only their vessels).
- Email / SMS / WhatsApp sending and scheduled expiry alerts are not implemented. Messages are recorded in the `notifications` table; connect a mail/SMS provider and a scheduler (e.g. node-cron) next.
