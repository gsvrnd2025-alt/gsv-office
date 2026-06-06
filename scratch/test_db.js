const { Client } = require('pg');

const client = new Client({
  user: 'gsv_admin',
  host: '192.168.0.177',
  database: 'gsv_office',
  password: 'gsv_secure_password_2026',
  port: 5432,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM messages');
    console.log('Messages count:', res.rows[0].count);
    
    const messages = await client.query('SELECT id, conversation_id, content, created_at FROM messages ORDER BY created_at DESC LIMIT 5');
    console.log('Recent messages:', messages.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
