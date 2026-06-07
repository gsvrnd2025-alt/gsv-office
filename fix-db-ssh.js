const { Client } = require('./backend/node_modules/ssh2');

const query = `
DO $$
DECLARE
    r RECORD;
    folder_rec RECORD;
    cnt INT;
BEGIN
    cnt := 0;
    FOR r IN 
        SELECT DISTINCT m.folder_id, m.sender_id, cm.user_id as recipient_id
        FROM messages m
        JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id != m.sender_id
        WHERE m.type = 'folder' AND m.folder_id IS NOT NULL AND m.deleted_at IS NULL
    LOOP
        FOR folder_rec IN 
            WITH RECURSIVE tree AS (
               SELECT id FROM folders WHERE id = r.folder_id
               UNION ALL
               SELECT f.id FROM folders f
               INNER JOIN tree t ON t.id = f.parent_id
             )
             SELECT id FROM tree
        LOOP
            INSERT INTO folder_access_requests (folder_id, owner_id, requester_id, requester_name, status, permission)
            SELECT folder_rec.id, r.sender_id, r.recipient_id, 'Chat Auto-Share', 'approved', 'read'
            WHERE NOT EXISTS (
              SELECT 1 FROM folder_access_requests WHERE folder_id = folder_rec.id AND requester_id = r.recipient_id
            );
            cnt := cnt + 1;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Fixed % descendants', cnt;
END $$;
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH ready');
  conn.exec(`docker exec -i gsv_postgres psql -U gsv_admin -d gsv_office`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Done with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data);
    });
    
    // Write query to stdin
    stream.write(query);
    stream.end();
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
