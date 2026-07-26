require('../backend/node_modules/dotenv').config();
const { Client } = require('../backend/node_modules/ssh2');

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

const conn = new Client();
conn.on('ready', () => {
  const originalDeploymentId = 'AKfycbxnNGMbCSVVpY4MC7oELU39EP8KY1wEBUSR3dtbVhBbK3MpGBeixEe2tcsd-PJUvfdW';
  const query = `UPDATE system_settings SET value = '${originalDeploymentId}' WHERE key = 'google_sheets_deployment_id';`;
  const cmd = `docker exec -i gsv_postgres psql -U gsv_admin -d gsv_office -c "${query}"`;
  
  console.log(`Executing remote command to restore deployment ID: ${cmd}`);
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code) => {
      console.log(`Command closed with code ${code}`);
      conn.end();
    }).resume().stderr.resume();
  });
}).connect(SSH_CONFIG);
