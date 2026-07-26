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
  console.log('🔒 SSH connection established for HTML deployment.');
  
  // Create temp dir on remote
  conn.exec(`mkdir -p ${REMOTE_APP_DIR}/temp_html`, (err, stream) => {
    if (err) {
      console.error('Failed to create remote temp directory:', err);
      conn.end();
      return;
    }
    
    stream.resume();
    stream.stderr.resume();
    
    stream.on('close', (code) => {
      if (code !== 0) {
        console.error(`mkdir failed with exit code ${code}`);
        conn.end();
        return;
      }
      
      conn.sftp((err, sftp) => {
        if (err) {
          console.error('Failed to start SFTP:', err);
          conn.end();
          return;
        }
        
        const files = [
          'admin.html',
          'combined.html',
          'index.html',
          'student.html'
        ];
        
        let uploaded = 0;
        
        function uploadFile(filename) {
          const localPath = path.join(__dirname, '../frontend/public/internship', filename);
          const remotePath = `${REMOTE_APP_DIR}/temp_html/${filename}`;
          
          console.log(`Uploading ${filename} to remote temp folder...`);
          sftp.fastPut(localPath, remotePath, (err) => {
            if (err) {
              console.error(`Upload error for ${filename}:`, err);
              conn.end();
              return;
            }
            console.log(`  ✓ ${filename} uploaded.`);
            uploaded++;
            if (uploaded === files.length) {
              console.log('All files uploaded. Copying to gsv_nginx container...');
              copyToContainer();
            } else {
              uploadFile(files[uploaded]);
            }
          });
        }
        
        uploadFile(files[0]);
      });
    });
  });
  
  function copyToContainer() {
    const commands = [
      `docker cp ${REMOTE_APP_DIR}/temp_html/admin.html gsv_nginx:/usr/share/nginx/html/internship/admin.html`,
      `docker cp ${REMOTE_APP_DIR}/temp_html/combined.html gsv_nginx:/usr/share/nginx/html/internship/combined.html`,
      `docker cp ${REMOTE_APP_DIR}/temp_html/index.html gsv_nginx:/usr/share/nginx/html/internship/index.html`,
      `docker cp ${REMOTE_APP_DIR}/temp_html/student.html gsv_nginx:/usr/share/nginx/html/internship/student.html`,
      `rm -rf ${REMOTE_APP_DIR}/temp_html`
    ];
    
    let execCount = 0;
    
    function runNext() {
      if (execCount === commands.length) {
        console.log('🚀 UI updates successfully deployed to TrueNAS container!');
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
