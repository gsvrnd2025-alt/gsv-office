const { Client } = require('./backend/node_modules/ssh2');
const SSH_CONFIG = { host: '192.168.0.177', port: 22, username: 'root', password: 'Gsv@2018' };

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

console.log('Connecting to TrueNAS...');
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established. Building images remotely...');
  
  const cmd = `
    cd /tmp &&
    rm -rf gsv-office-temp &&
    git clone https://github.com/gsvrnd2025-alt/gsv-office.git gsv-office-temp &&
    cd gsv-office-temp &&
    echo "Building backend API image..." &&
    docker build -t ghcr.io/gsvrnd2025-alt/gsv-office-api:latest ./backend &&
    echo "Building frontend NGINX image..." &&
    docker build -t ghcr.io/gsvrnd2025-alt/gsv-office-nginx:latest ./frontend &&
    echo "Restarting TrueNAS app..." &&
    midclt call app.stop "gsv-office" || true &&
    midclt call app.start "gsv-office" &&
    sleep 5 &&
    midclt call app.query
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Deployment completed with code ' + code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect(SSH_CONFIG);
