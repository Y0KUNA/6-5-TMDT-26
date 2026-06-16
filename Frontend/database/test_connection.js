const pool = require('./db_connect');

async function test() {
  const res = await pool.query('SELECT NOW()');
  console.log(res.rows);
}

test();