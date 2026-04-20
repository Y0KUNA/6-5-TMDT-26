Authentication server (Postgres)
===============================

What I added
- Minimal Express-based auth server in `code/server/` with endpoints:
  - POST `/api/auth/register` — register customer or enterprise (creates users/customers/enterprises/business_profiles appropriately)
  - POST `/api/auth/login` — login; returns a JWT and inserts a session row in `sessions` table

Important files
- `server/index.js` — small Express app
- `server/db.js` — Postgres pool (reads `DATABASE_URL` or uses default from SQL generator)
- `server/routes/auth.js` — register/login logic
- `.env.example` — sample environment variables

Install & run (locally)
1. From project root, install server dependencies:

```powershell
cd code
npm install express pg bcrypt jsonwebtoken helmet cors body-parser
# (optional dev) npm install -D nodemon
```

2. Create DB and run SQL generator (`database/database_gen.sql`) using psql, then set env vars (or edit `DATABASE_URL`).

3. Start the server:

```powershell
npm run start-server
# or for development with auto-reload
npm run dev-server
```

Client wiring
- The migrated front-end pages (`features/register` and `features/login`) were updated to call the new endpoints. They fall back to existing in-browser localStorage logic if the server is unreachable.

Security notes
- Change `JWT_SECRET` in production.
- Don't store secrets in repo; use environment variables.
