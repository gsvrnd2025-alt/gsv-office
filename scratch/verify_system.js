require('../backend/node_modules/dotenv').config();
const { Client } = require('../backend/node_modules/ssh2');

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const conn = new Client();
conn.on('ready', () => {
  // Check deployment ID in DB
  const q1 = `docker exec gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT key, value FROM system_settings WHERE key LIKE 'google%';"`;
  // Check download files accessible in container
  const q2 = `docker exec gsv_nginx ls -lh /usr/share/nginx/html/downloads/ 2>/dev/null || echo 'downloads folder missing or empty'`;
  // Verify the Apps Script ping
  const q3 = `curl -s -o /dev/null -w "%{http_code}" "https://script.google.com/macros/s/AKfycbxnNGMbCSVVpY4MC7oELU39EP8KY1wEBUSR3dtbVhBbK3MpGBeixEe2tcsd-PJUvfdW/exec?action=ping"`;
  // Check index.html in nginx
  const q4 = `docker exec gsv_nginx ls -lh /usr/share/nginx/html/index.html`;

  const commands = [
    { label: 'DB deployment keys', cmd: q1 },
    { label: 'Downloads folder', cmd: q2 },
    { label: 'Apps Script ping (HTTP status)', cmd: q3 },
    { label: 'Frontend index.html', cmd: q4 },
  ];

  let i = 0;
  function runNext() {
    if (i >= commands.length) { conn.end(); return; }
    const { label, cmd } = commands[i++];
    console.log(`\n=== ${label} ===`);
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error(err); runNext(); return; }
      let out = '';
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => { console.log(out.trim()); runNext(); });
    });
  }
  runNext();
}).connect(SSH_CONFIG);
