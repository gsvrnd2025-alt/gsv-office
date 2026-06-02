/**
 * GSV Office — TrueNAS SCALE SSH Automated Deployment Utility
 * Uses ssh2 to securely copy files and deploy docker compose setup remotely.
 */

const { Client } = require('./backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

console.log('════════════════════════════════════════════════════');
console.log('       GSV Office — Remote SSH Deployer');
console.log('════════════════════════════════════════════════════');
console.log(`Connecting to TrueNAS SCALE at ${SSH_CONFIG.host}...`);

const conn = new Client();

conn.on('ready', () => {
  console.log('🔒 SSH connection established successfully!');
  
  // ── Step 1: Create Remote Directories ──────────────────────────
  console.log('\n📁 Step 1: Creating remote directories...');
  const mkdirCmd = `mkdir -p ${REMOTE_APP_DIR}/database ${REMOTE_APP_DIR}/nginx/conf.d ${REMOTE_APP_DIR}/logs ${REMOTE_APP_DIR}/plugins ${REMOTE_APP_DIR}/uploads ${REMOTE_APP_DIR}/db ${REMOTE_APP_DIR}/redis ${REMOTE_APP_DIR}/minio`;
  
  conn.exec(mkdirCmd, (err, stream) => {
    if (err) throw err;
    
    // Resume streams to prevent buffering blocks
    stream.resume();
    stream.stderr.resume();
    
    stream.on('close', (code, signal) => {
      console.log(`  ✓ Directories initialized (exit code: ${code})`);
      
      // ── Step 2: SFTP Upload Files ──────────────────────────────
      console.log('\n📤 Step 2: Transferring deployment files via SFTP...');
      conn.sftp((err, sftp) => {
        if (err) throw err;
        
        const filesToUpload = [
          { local: './docker-compose-truenas.yml', remote: `${REMOTE_APP_DIR}/docker-compose.yml` },
          { local: './database/schema.sql', remote: `${REMOTE_APP_DIR}/database/schema.sql` },
          { local: './database/seed.sql', remote: `${REMOTE_APP_DIR}/database/seed.sql` },
          { local: './nginx/nginx.conf', remote: `${REMOTE_APP_DIR}/nginx/nginx.conf` },
          { local: './nginx/conf.d/default.conf', remote: `${REMOTE_APP_DIR}/nginx/conf.d/default.conf` },
          { local: './mailserver.env', remote: `${REMOTE_APP_DIR}/mailserver.env` }
        ];
        
        let uploadedCount = 0;
        
        function uploadNext() {
          if (uploadedCount === filesToUpload.length) {
            console.log('  ✓ All files transferred successfully.');
            // ── Step 3: Run Docker Compose Up ───────────────────────
            runDockerCompose();
            return;
          }
          
          const file = filesToUpload[uploadedCount];
          console.log(`  Transferring: ${file.local} ➡️ ${file.remote}`);
          
          sftp.fastPut(file.local, file.remote, (err) => {
            if (err) {
              console.error(`❌ Failed to upload ${file.local}:`, err);
              conn.end();
              return;
            }
            uploadedCount++;
            uploadNext();
          });
        }
        
        uploadNext();
      });
    });
  });
}).connect(SSH_CONFIG);

function runDockerCompose() {
  console.log('\n🐋 Step 3: Initiating Docker Compose commands on TrueNAS SCALE...');
  
  // Ensure external network is created, stop/remove any conflicting container names, pull fresh images, and start new ones
  const composeCmd = [
    `docker network create ix-gsv-office_gsv_network || true`,
    `docker stop gsv_nginx gsv_api gsv_postgres gsv_redis gsv_minio gsv_mailserver || true`,
    `docker rm gsv_nginx gsv_api gsv_postgres gsv_redis gsv_minio gsv_mailserver || true`,
    `cd ${REMOTE_APP_DIR}`,
    `docker compose pull`,
    `docker compose down --remove-orphans`,
    `docker compose up -d`,
    `sleep 5`,
    `docker compose ps`
  ].join(' && ');
  
  console.log(`Executing remote command:\n${composeCmd}\n`);
  
  conn.exec(composeCmd, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`\n✅ Remote command execution finished (exit code: ${code})`);
      conn.end();
      
      if (code === 0) {
        console.log(`
════════════════════════════════════════════════════════════
  🎉 GSV OFFICE SUCCESSFULLY DEPLOYED TO TRUENAS SCALE!
════════════════════════════════════════════════════════════
🌐 App URL: http://192.168.0.177:8080
👤 Login Credentials:
   • Email: admin@gsv.local
   • Password: Admin@GSV2024
════════════════════════════════════════════════════════════
`);
      } else {
        console.error('❌ Deployment command failed. Please check logs above.');
      }
    });
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}
