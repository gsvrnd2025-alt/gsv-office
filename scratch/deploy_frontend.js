require('../backend/node_modules/dotenv').config();
const { Client } = require('../backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

const conn = new Client();
conn.on('ready', () => {
  console.log('🔒 SSH connection established for Frontend hot-swap.');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('Failed to start SFTP:', err);
      conn.end();
      return;
    }
    
    const localZip = path.join(__dirname, '../frontend_dist.zip');
    const remoteZip = `${REMOTE_APP_DIR}/frontend_dist.zip`;
    
    console.log(`Uploading frontend_dist.zip to ${remoteZip}...`);
    sftp.fastPut(localZip, remoteZip, (err) => {
      if (err) {
        console.error('Upload error for frontend_dist.zip:', err);
        conn.end();
        return;
      }
      console.log('  ✓ frontend_dist.zip uploaded.');
      extractAndCopyToContainer();
    });
  });
  
  function extractAndCopyToContainer() {
    const commands = [
      `mkdir -p ${REMOTE_APP_DIR}/temp_dist`,
      `unzip -o ${REMOTE_APP_DIR}/frontend_dist.zip -d ${REMOTE_APP_DIR}/temp_dist`,
      `docker cp ${REMOTE_APP_DIR}/temp_dist/. gsv_nginx:/usr/share/nginx/html/`,
      `rm -rf ${REMOTE_APP_DIR}/temp_dist ${REMOTE_APP_DIR}/frontend_dist.zip`
    ];
    
    let execCount = 0;
    
    function runNext() {
      if (execCount === commands.length) {
        console.log('🚀 React frontend successfully updated in gsv_nginx container!');
        conn.end();
        return;
      }
      const cmd = commands[execCount];
      console.log(`Executing remote command: ${cmd}`);
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error(`Command failed: ${cmd}`, err);
          conn.end();
          return;
        }
        
        stream.resume();
        stream.stderr.resume();
        
        stream.on('close', (code) => {
          if (code !== 0) {
            console.warn(`Warning: Command "${cmd}" closed with exit code ${code}`);
          }
          execCount++;
          runNext();
        });
      });
    }
    
    runNext();
  }
  
}).connect(SSH_CONFIG);
