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
  console.log('🔒 SSH connection established for backend hot-swap.');

  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }

    const localZip = path.join(__dirname, '../backend_dist.zip');
    const remoteZip = `${REMOTE_APP_DIR}/backend_dist.zip`;

    console.log(`Uploading backend_dist.zip...`);
    sftp.fastPut(localZip, remoteZip, (err) => {
      if (err) { console.error('Upload error:', err); conn.end(); return; }
      console.log('  ✓ backend_dist.zip uploaded.');
      extractAndSwap();
    });
  });

  function extractAndSwap() {
    const commands = [
      `mkdir -p ${REMOTE_APP_DIR}/temp_backend`,
      `unzip -o ${REMOTE_APP_DIR}/backend_dist.zip -d ${REMOTE_APP_DIR}/temp_backend`,
      `docker cp ${REMOTE_APP_DIR}/temp_backend/. gsv_api:/app/dist/`,
      `docker restart gsv_api`,
      `rm -rf ${REMOTE_APP_DIR}/temp_backend ${REMOTE_APP_DIR}/backend_dist.zip`
    ];

    let i = 0;
    function runNext() {
      if (i >= commands.length) {
        console.log('🚀 Backend hot-swapped successfully in gsv_api container!');
        conn.end();
        return;
      }
      const cmd = commands[i++];
      console.log(`Executing: ${cmd}`);
      conn.exec(cmd, (err, stream) => {
        if (err) { console.error(err.message); runNext(); return; }
        let out = '';
        stream.on('data', d => out += d);
        stream.stderr.on('data', d => out += d);
        stream.on('close', (code) => {
          if (out.trim()) console.log(out.trim());
          if (code && code !== 0) console.warn(`  ⚠ Exited with code ${code}`);
          runNext();
        });
      });
    }
    runNext();
  }
}).connect(SSH_CONFIG);
