const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_DAYS || '7', 10);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { role, fullName, email, phone, password, address, businessName, businessAddress, taxCode, licenseFile } = req.body;
  console.log('BODY:', req.body);
  console.log('licenseFile length:', licenseFile?.length);
  if (!role || !fullName || !email || !phone || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // check email exists
    const { rowCount } = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isActive = role === 'customer'; // customers active immediately; enterprises require approval

    const insertUserText = `INSERT INTO users (role, full_name, email, phone, password_hash, is_active)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING user_id`;
    const userResult = await client.query(insertUserText, [role, fullName, email, phone, passwordHash, isActive]);
    const userId = userResult.rows[0].user_id;

    if (role === 'customer') {
      await client.query('INSERT INTO customers (customer_id, address) VALUES ($1,$2)', [userId, address || null]);
    } else if (role === 'enterprise') {
      // require license file for enterprise registrations
      if (!licenseFile) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'License file is required for enterprise registration' });
      }

      // If licenseFile is a data URL (base64), decode and save to server/uploads
      let storedPath = licenseFile;
      try {
        if (typeof licenseFile === 'string' && licenseFile.startsWith('data:')) {
          // parse data URL: data:<mime>;base64,<data>
          const m = licenseFile.match(/^data:(.+);base64,(.+)$/);
          if (!m) throw new Error('Invalid data URL');
          const mime = m[1];
          const b64 = m[2];

          // server-side MIME and size validation
          const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
          if (allowedMimes.indexOf(mime) === -1) {
            throw { code: 'INVALID_MIME', message: 'Định dạng file không được hỗ trợ' };
          }

          // approximate size from base64 length
          const bytes = Math.round((b64.length * 3) / 4);
          const MAX_BYTES = 5 * 1024 * 1024; // 5MB
          if (bytes > MAX_BYTES) {
            throw { code: 'SIZE_EXCEEDED', message: 'Kích thước file vượt quá 5MB' };
          }

          const ext = (mime.split('/')[1] || 'png').split('+')[0];
          const uploadsDir = path.join(__dirname, '..', 'uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
          const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
          const outPath = path.join(uploadsDir, filename);
          fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
          storedPath = `/uploads/${filename}`;
        }
      } catch (saveErr) {
        await client.query('ROLLBACK');
        console.error('Failed to save license file', saveErr);
        if (saveErr && saveErr.code === 'INVALID_MIME') return res.status(400).json({ error: saveErr.message });
        if (saveErr && saveErr.code === 'SIZE_EXCEEDED') return res.status(413).json({ error: saveErr.message });
        return res.status(500).json({ error: 'Failed to process license file' });
      }

      // create enterprise and business profile (pending)
      await client.query('INSERT INTO enterprises (enterprise_id, business_name, business_address, tax_code, is_approved) VALUES ($1,$2,$3,$4,$5)', [userId, businessName || fullName, businessAddress || address || null, taxCode || ('TAX' + Date.now()), false]);
      await client.query('INSERT INTO business_profiles (enterprise_id, business_name, address, license_file, tax_code, status) VALUES ($1,$2,$3,$4,$5,$6)', [userId, businessName || fullName, businessAddress || address || null, storedPath, taxCode || ('TAX' + Date.now()), 'PENDING']);
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'User registered', userId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('register error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt', req.body);
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
  const userRes = await db.query('SELECT user_id, password_hash, role, is_active, is_locked, full_name, email, phone FROM users WHERE email = $1', [email]);
    if (userRes.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    if (user.is_locked) return res.status(403).json({ error: 'Account locked' });
    if (!user.is_active) return res.status(403).json({ error: 'Account not active' });

    let ok = false;

    // Determine stored hash type: bcrypt (starts with $2) or legacy SHA256 hex (64 hex chars)
    const stored = user.password_hash || '';
    if (stored.startsWith('$2')) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // legacy: compare SHA256 hex
      const sha = crypto.createHash('sha256').update(String(password)).digest('hex');
      if (sha === stored) {
        ok = true;
        // migrate to bcrypt for future logins
        try {
          const newHash = await bcrypt.hash(password, 10);
          await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, user.user_id]);
          console.log('Migrated user', user.user_id, 'to bcrypt password hash');
        } catch (merr) {
          console.error('Failed to migrate password to bcrypt for user', user.user_id, merr);
        }
      }
    }

    if (!ok) {
      // increment fail_login_count (best effort)
      await db.query('UPDATE users SET fail_login_count = fail_login_count + 1 WHERE user_id = $1', [user.user_id]);
      return res.status(401).json({ error: 'Invalid credentials. failed login attempts +1' });
    }

    // generate token
    const payload = { sub: user.user_id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_TTL_DAYS}d` });

    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.query('INSERT INTO sessions (user_id, token, created_at, expired_at) VALUES ($1,$2,$3,$4)', [user.user_id, token, new Date(), expiresAt]);

    // safe user info to return (do not include password_hash)
    const userInfo = {
      user_id: user.user_id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      is_active: user.is_active
    };

    return res.json({ token, expiresAt, user: userInfo });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
