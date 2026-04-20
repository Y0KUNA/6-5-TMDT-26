const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/vendors/pending
router.get('/pending', async (req, res) => {
  try {
    const q = `SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.phone,
    u.created_at                AS registered_at,
    e.business_name,
    e.business_address,
    e.tax_code,
    bp.license_file,
    bp.status                   AS profile_status,
    bp.submitted_at
FROM users u
JOIN enterprises e       ON e.enterprise_id  = u.user_id
JOIN business_profiles bp ON bp.enterprise_id = e.enterprise_id
WHERE bp.status = 'PENDING'
ORDER BY bp.submitted_at`;
    const result = await db.query(q);
    return res.json({ vendors: result.rows });
  } catch (err) {
    console.error('GET /api/vendors/pending error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vendors/:enterpriseId/approve
router.post('/:enterpriseId/approve', async (req, res) => {
  const enterpriseId = parseInt(req.params.enterpriseId, 10);
  if (!enterpriseId) return res.status(400).json({ error: 'Invalid enterprise id' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE enterprises SET is_approved = true WHERE enterprise_id = $1', [enterpriseId]);
    await client.query("UPDATE business_profiles SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP WHERE enterprise_id = $1", [enterpriseId]);
    // activate the user who created the enterprise
    await client.query('UPDATE users SET is_active = true WHERE user_id = (SELECT user_id FROM enterprises WHERE enterprise_id = $1)', [enterpriseId]);
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/vendors/:id/approve error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/vendors/:enterpriseId/reject
router.post('/:enterpriseId/reject', async (req, res) => {
  const enterpriseId = parseInt(req.params.enterpriseId, 10);
  const { reason } = req.body || {};
  if (!enterpriseId) return res.status(400).json({ error: 'Invalid enterprise id' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE business_profiles SET status = 'REJECTED', rejected_reason = $1, reviewed_at = CURRENT_TIMESTAMP WHERE enterprise_id = $2", [reason || null, enterpriseId]);
    // ensure enterprise is not approved and user remains inactive
    await client.query('UPDATE enterprises SET is_approved = false WHERE enterprise_id = $1', [enterpriseId]);
    await client.query('UPDATE users SET is_active = false WHERE user_id = (SELECT user_id FROM enterprises WHERE enterprise_id = $1)', [enterpriseId]);
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/vendors/:id/reject error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PATCH /api/vendors/:enterpriseId
// Accepts { profile_status: 'APPROVED'|'REJECTED', reason?: string }
// This route updates business_profiles.status, enterprises.is_approved and users.is_active atomically.
router.patch('/:enterpriseId', async (req, res) => {
  const enterpriseId = parseInt(req.params.enterpriseId, 10);
  const { profile_status, reason } = req.body || {};
  if (!enterpriseId) return res.status(400).json({ error: 'Invalid enterprise id' });
  if (!profile_status) return res.status(400).json({ error: 'Missing profile_status in body' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (profile_status === 'APPROVED') {
      await client.query("UPDATE business_profiles SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP WHERE enterprise_id = $1", [enterpriseId]);
      await client.query('UPDATE enterprises SET is_approved = true WHERE enterprise_id = $1', [enterpriseId]);
      await client.query('UPDATE users SET is_active = true WHERE user_id = (SELECT user_id FROM enterprises WHERE enterprise_id = $1)', [enterpriseId]);
    } else if (profile_status === 'REJECTED') {
      await client.query("UPDATE business_profiles SET status = 'REJECTED', rejected_reason = $1, reviewed_at = CURRENT_TIMESTAMP WHERE enterprise_id = $2", [reason || null, enterpriseId]);
      await client.query('UPDATE enterprises SET is_approved = false WHERE enterprise_id = $1', [enterpriseId]);
      await client.query('UPDATE users SET is_active = false WHERE user_id = (SELECT user_id FROM enterprises WHERE enterprise_id = $1)', [enterpriseId]);
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid profile_status. Allowed: APPROVED, REJECTED' });
    }

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PATCH /api/vendors/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
