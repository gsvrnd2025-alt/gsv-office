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
  console.log('🔒 SSH connection established for Downloads deployment.');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('Failed to start SFTP:', err);
      conn.end();
      return;
    }
    
    const files = [
      'GSVOffice-Android.apk',
      'GSVOffice-Windows.zip',
      'GSVOffice-Portable.exe',
      'GSVOffice-Setup.exe'
    ];
    
    let uploaded = 0;
    
    function uploadFile(filename) {
      const localPath = path.join(__dirname, '../downloads', filename);
      const remotePath = `${REMOTE_APP_DIR}/downloads/${filename}`;
      
      console.log(`Uploading ${filename} to ${remotePath}...`);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          console.error(`Upload error for ${filename}:`, err);
          conn.end();
          return;
        }
        console.log(`  ✓ ${filename} uploaded successfully.`);
        uploaded++;
        if (uploaded === files.length) {
          console.log('🚀 All download binaries successfully deployed to TrueNAS!');
          conn.end();
        } else {
          uploadFile(files[uploaded]);
        }
      });
    }
    
    uploadFile(files[0]);
  });
}).connect(SSH_CONFIG);
