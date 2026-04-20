const { Pool } = require('pg');

// Read connection from env or fallback to sensible local defaults.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION || 'postgresql://postgres:12345678@localhost:5432/ECommerce'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
