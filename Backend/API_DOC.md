# API Documentation — server

This document describes the minimal public API for the backend in `code/server` used by the frontend feature pages.

It covers the currently implemented endpoints, payload shapes, example responses, common errors, and quick local test commands (PowerShell-compatible).

---

## Overview

Base URL (development): http://localhost:3000

All API paths are mounted under `/api` (for example: `GET /api/products`). The server also serves uploaded files under `/uploads/<filename>` as static assets.

Authentication: the server issues a session token on login. Many admin actions expect the client to be authenticated. The simple frontend in this workspace stores a `user` object in localStorage; adapt requests to include Authorization headers if you wire JWT/session into the front-end.

Legacy password compatibility: seeded users in `database/database_gen.sql` use a SHA256 hex digest. The server accepts legacy SHA256 password hashes at login and, on successful legacy authentication, re-hashes the password with bcrypt and updates the DB (migration-on-login).

File uploads: the register flow accepts a `licenseFile` encoded as a data URL (base64) inside JSON. The server decodes and writes the file to `code/server/uploads` and stores the path in the `business_profiles.license_file` column. Because payloads can be large, the server JSON body size limit is increased (10MB); requests above that may return 413 Payload Too Large.

---

## Environment variables

- `DATABASE_URL` (required) — Postgres connection string used by `pg`.
- `JWT_SECRET` (recommended) — secret for signing JWTs if used.
- `PORT` (optional) — server port (default 3000).

Set these before running the server.

---

## Helpful status & error codes

- 200 OK — success
- 201 Created — resource created
- 400 Bad Request — missing or invalid payload
- 401 Unauthorized — authentication required or invalid credentials
- 403 Forbidden — insufficient permissions
- 404 Not Found — resource not found
- 413 Payload Too Large — JSON body too large (e.g., base64 image over limit)
- 500 Internal Server Error — unexpected server error

---

## Endpoints

### POST /api/auth/register
Register a user (customer or enterprise/vendor). Enterprise registration requires `licenseFile`.

Request JSON (example - vendor enterprise registration):
{
  "email": "vendor@example.com",
  "password": "SecretPass123",
  "role": "enterprise",    // or "customer" or "admin"
  "fullName": "Họ Tên",
  "phone": "0901234567",
  "enterprise": {
    "business_name": "Tên doanh nghiệp",
    "address": "Địa chỉ",
    "phone": "0901234567"
  },
  "licenseFile": "data:image/png;base64,iVBORw0KGgoAAAANS..." // required for enterprise
}

Responses:
- 201 Created: { "message": "Registered", "userId": ..., "enterpriseId": ... }
- 400 Bad Request: { "error": "..." }
- 409 Conflict: { "error": "Email already exists" }
- 413 Payload Too Large: { "error": "Payload too large" }

Notes:
- `licenseFile` should be a standard data URL (data:[mime];base64,....). The server decodes and stores it under `/uploads` and stores the relative path in DB (e.g. `/uploads/<filename>`).


### POST /api/auth/login
Authenticate with email and password.

Request JSON:
{ "email": "admin@example.com", "password": "Admin@123" }

Response (success):
{
  "token": "...",       // session token (if implemented)
  "expiresAt": "...",
  "user": {
    "id": 123,
    "email": "...",
    "role": "admin",
    "is_active": true,
    // other user fields
  }
}

Errors:
- 400 / 401 with { error: 'Invalid credentials' }

Notes:
- If the user record contains a legacy SHA256 hash, the server will validate using SHA256 and then migrate the password to bcrypt on success.


### GET /api/products
Return a list of products used by the frontend home page.

Query params: none currently (may support filters later).

Response:
{
  "products": [
    {
      "product_id": 1,
      "name": "Sản phẩm A",
      "price": 12000,
      "stock_quantity": 10,
      "primary_image": "/uploads/abc.jpg",
      "description": "..."
    },
    ...
  ]
}


### POST /api/products
(Create product) — implementation may exist for admin/product-management pages. Payload and auth depend on the route implementation. If you need this, check `server/routes/products.js` for required fields and auth checks.


### GET /api/vendors/pending
Return a list of vendor registrations with status `pending` and their license file paths.

Response JSON:
{
  "vendors": [
    {
      "profile_id": 42,
      "enterprise_id": 17,
      "owner_user_id": 7,
      "user_id": 7,
      "full_name": "Nguyen Van A",
      "email": "vendor@example.com",
      "phone": "090...",
      "business_name": "Công ty ABC",
      "address": "...",
      "license_file": "/uploads/license-uuid.png",
      "status": "PENDING",
      "submitted_at": "2026-04-19T12:34:56.000Z"
    },
    ...
  ]
}

Notes:
- `license_file` is a URL path served by the server's static `/uploads` route.
- The frontend admin page expects `license_file` and will display it as `<img src="/uploads/...">`.


### POST /api/vendors/:enterpriseId/approve
Approve a vendor registration and activate the enterprise and owner account.

Request:
- URL param: `enterpriseId` (integer)
- Body: none required

Response:
- 200 OK: { "success": true, "message": "Approved" }
- 404 Not Found: { "error": "Enterprise not found" }
- 400 Bad Request: { "error": "..." }

Permissions:
- Intended for admin users. If your server enforces auth sessions/JWT, make sure the request includes auth headers.


### POST /api/vendors/:enterpriseId/reject
Reject a vendor registration and optional write the rejection reason into `business_profiles`.

Request:
- URL param: `enterpriseId` (integer)
- JSON body: { "reason": "Lý do từ chối" }

Response:
- 200 OK: { "success": true, "message": "Rejected" }
- 400 / 404 with { "error": "..." }

Behavior:
- Sets `business_profiles.status = 'REJECTED'`, stores `rejected_reason`, and ensures related `enterprises`/`users` are not approved/active.

---

## Example PowerShell curl (Invoke-RestMethod) tests

Note: use these in Windows PowerShell. Replace `localhost:3000` with your server host/port if different.

Get pending vendors:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/vendors/pending"
```

Approve vendor (enterpriseId = 17):

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/vendors/17/approve"
```

Reject vendor with reason:

```powershell
$body = @{ reason = 'Thông tin không hợp lệ' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/vendors/17/reject" -Body $body -ContentType 'application/json'
```

Register example (enterprise with base64 license):

```powershell
$payload = @{
  email = 'vendor@example.com'
  password = 'Secret123!'
  role = 'enterprise'
  fullName = 'Nguyen Van'
  phone = '0901234567'
  enterprise = @{ business_name = 'Cửa hàng X'; address = 'Địa chỉ' ; phone = '0901234567' }
  licenseFile = 'data:image/png;base64,iVBORw0KGgoAAAANS...'
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/register" -Body $payload -ContentType 'application/json'
```

Login example:

```powershell
$payload = @{ email = 'admin@nongsanecommerce.vn'; password = 'Admin@123456' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -Body $payload -ContentType 'application/json'
```

---

## Notes & troubleshooting

- If you get `413 Payload Too Large` when sending `licenseFile`, reduce the image size before sending or change server's body parser limit carefully.
- If `GET /api/vendors/pending` returns empty list but you know pending rows exist, check the DB connection (DATABASE_URL), and ensure `business_profiles.status` values match the server's expected enum/strings (e.g., `pending` / `PENDING`).
- If admin seeded with legacy SHA256 cannot login, ensure you used the exact seeded password. The server will migrate the password to bcrypt on a successful legacy login; after migration, only bcrypt will be stored.

---

## Where to find code

- Server entry: `code/server/index.js`
- DB helper: `code/server/db.js`
- Auth routes: `code/server/routes/auth.js`
- Products: `code/server/routes/products.js`
- Vendors: `code/server/routes/vendors.js`
- Static uploads directory: `code/server/uploads/`

If you want, I can also generate an OpenAPI/Swagger spec based on these routes. Would you like a YAML/JSON OpenAPI output next?