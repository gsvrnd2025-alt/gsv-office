const { Client } = require('pg');

const client = new Client({
  host: '192.168.0.177',
  port: 5432,
  user: 'gsv_admin',
  password: 'gsv_secure_password_2026',
  database: 'gsv_office',
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, name, original_name, mime_type, size, created_at, folder_id, conversation_id
      FROM files
      ORDER BY created_at DESC
      LIMIT 30;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
