const { Client } = require('./backend/node_modules/ssh2');
const { execSync } = require('child_process');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

console.log('📦 Compressing frontend dist package...');
try {
  execSync('tar -czf frontend.tar.gz -C frontend/dist .', { stdio: 'inherit' });
  console.log('  ✓ frontend.tar.gz created.');
} catch (e) {
  console.error('Error creating tar package:', e);
  process.exit(1);
}

console.log(`\nConnecting to TrueNAS SCALE at ${SSH_CONFIG.host}...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('🔒 SSH connection established!');
  console.log('📤 Transferring frontend.tar.gz via SFTP...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }
    
    sftp.fastPut('./frontend.tar.gz', `${REMOTE_APP_DIR}/frontend.tar.gz`, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        conn.end();
        return;
      }
      console.log('  ✓ frontend.tar.gz uploaded successfully.');
      
      const updateCmd = [
        `mkdir -p ${REMOTE_APP_DIR}/frontend/dist`,
        `tar -xzf ${REMOTE_APP_DIR}/frontend.tar.gz -C ${REMOTE_APP_DIR}/frontend/dist`,
        `docker cp ${REMOTE_APP_DIR}/frontend/dist/. gsv_nginx:/usr/share/nginx/html/`,
        `docker exec gsv_nginx nginx -s reload || true`,
        `echo "DEPLOY_COMPLETE"`
      ].join(' && ');
      
      console.log('🚀 Extracting and reloading nginx on TrueNAS...');
      conn.exec(updateCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          return;
        }
        
        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
          console.log(`\n✅ Remote update finished with exit code ${code}!`);
          conn.end();
        });
      });
    });
  });
}).connect(SSH_CONFIG);
