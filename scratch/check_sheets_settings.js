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
  const query = `SELECT key, value FROM system_settings WHERE key LIKE '%google%' OR key LIKE '%sheet%';`;
  const cmd = `docker exec -i gsv_postgres psql -U gsv_admin -d gsv_office -c "${query}"`;
  
  console.log(`Executing remote command: ${cmd}`);
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }
    stream.on('data', (data) => {
      process.stdout.write(data);
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    stream.on('close', (code) => {
      console.log(`Command closed with code ${code}`);
      conn.end();
    }).resume();
  });
}).connect(SSH_CONFIG);
