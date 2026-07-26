const { Client } = require('../backend/node_modules/pg');

const client = new Client({
  user: 'gsv_admin',
  host: 'localhost',
  database: 'gsv_office',
  password: 'gsv_secure_password_2026',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT * FROM system_settings WHERE key LIKE '%google%' OR key LIKE '%appscript%' OR key LIKE '%sheet%'");
    console.log('Google Settings:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
