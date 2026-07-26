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
  const commands = [
    {
      label: 'Internship sync log (last 30 lines)',
      cmd: `docker logs --tail 30 gsv_api 2>&1 | grep -i "internship\\|sync\\|error\\|warn" || echo "(no matching log lines)"`
    },
    {
      label: 'Postgres internship_tables row count',
      cmd: `docker exec gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT table_name, count(*) FROM internship_tables GROUP BY table_name ORDER BY table_name;"`
    },
    {
      label: 'Google Sheets last sync timestamp',
      cmd: `docker exec gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT value FROM system_settings WHERE key='google_sheets_last_sync';"`
    },
    {
      label: 'Download files in Nginx',
      cmd: `docker exec gsv_nginx ls -lh /usr/share/nginx/html/downloads/`
    },
  ];

  let i = 0;
  function runNext() {
    if (i >= commands.length) { conn.end(); return; }
    const { label, cmd } = commands[i++];
    console.log(`\n=== ${label} ===`);
    conn.exec(cmd, (err, stream) => {
      if (err) { console.error(err.message); runNext(); return; }
      let out = '';
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => { console.log(out.trim() || '(empty)'); runNext(); });
    });
  }
  runNext();
}).connect(SSH_CONFIG);
