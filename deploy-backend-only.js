const { Client } = require('./backend/node_modules/ssh2');
const { execSync } = require('child_process');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

console.log('📦 Compressing backend dist package...');
try {
  execSync('tar -czf backend.tar.gz -C backend/dist .', { stdio: 'inherit' });
  console.log('  ✓ backend.tar.gz created.');
} catch (e) {
  console.error('Error creating tar package:', e);
  process.exit(1);
}

console.log(`\nConnecting to TrueNAS SCALE at ${SSH_CONFIG.host}...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('🔒 SSH connection established!');
  console.log('📤 Transferring backend.tar.gz via SFTP...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }
    
    sftp.fastPut('./backend.tar.gz', `${REMOTE_APP_DIR}/backend.tar.gz`, (uploadErr) => {
      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        conn.end();
        return;
      }
      console.log('  ✓ backend.tar.gz uploaded successfully.');
      
      const updateCmd = [
        `mkdir -p ${REMOTE_APP_DIR}/backend/dist`,
        `tar -xzf ${REMOTE_APP_DIR}/backend.tar.gz -C ${REMOTE_APP_DIR}/backend/dist`,
        `docker cp ${REMOTE_APP_DIR}/backend/dist/. gsv_api:/app/dist/`,
        `docker restart gsv_api`,
        `echo "BACKEND_DEPLOY_COMPLETE"`
      ].join(' && ');
      
      console.log('🚀 Extracting and restarting gsv_api on TrueNAS...');
      conn.exec(updateCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          return;
        }
        
        stream.on('close', (code, signal) => {
          console.log(`\n✅ Remote backend update finished with exit code ${code}!`);
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
}).connect(SSH_CONFIG);
