const { Pool } = require('pg');
const pool = new Pool({
  host: '192.168.0.177',
  port: 5432,
  database: 'gsv_office',
  user: 'gsv_admin',
  password: 'gsv_secure_password_2026'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT m.folder_id, m.sender_id, cm.user_id as recipient_id
      FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id != m.sender_id
      WHERE m.type = 'folder' AND m.folder_id IS NOT NULL AND m.deleted_at IS NULL
    `);
    
    console.log(`Found ${res.rows.length} folder shares in messages.`);

    for (const row of res.rows) {
      // Get all descendants
      const descRes = await pool.query(`
        WITH RECURSIVE descendants AS (
           SELECT id FROM folders WHERE id = $1
           UNION ALL
           SELECT f.id FROM folders f
           INNER JOIN descendants d ON d.id = f.parent_id
         )
         SELECT id FROM descendants
      `, [row.folder_id]);

      let count = 0;
      for (const desc of descRes.rows) {
        // Insert if not exists
        await pool.query(`
          INSERT INTO folder_access_requests (folder_id, owner_id, requester_id, requester_name, status, permission)
          SELECT $1, $2, $3, 'Chat Auto-Share', 'approved', 'read'
          WHERE NOT EXISTS (
            SELECT 1 FROM folder_access_requests WHERE folder_id = $1 AND requester_id = $3
          )
        `, [desc.id, row.sender_id, row.recipient_id]);
        count++;
      }
      console.log(`Fixed ${count} descendants for folder ${row.folder_id}`);
    }

    console.log("Done.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
