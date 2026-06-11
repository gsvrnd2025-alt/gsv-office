const { Client } = require('./backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');
require('./backend/node_modules/dotenv').config();

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const localFile = process.argv[2];
if (!localFile) {
  console.error("Usage: node run-remote-script.js <local-file>");
  process.exit(1);
}

const remoteFile = '/tmp/' + path.basename(localFile);
const conn = new Client();

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error("SFTP initialization failed:", err);
      conn.end();
      process.exit(1);
    }
    
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) {
        console.error(`Upload failed for ${localFile}:`, err);
        conn.end();
        process.exit(1);
      }
      
      const cmd = remoteFile.endsWith('.py') ? `python3 ${remoteFile}` : `bash ${remoteFile}`;
      conn.exec(cmd, (err, stream) => {
        if (err) {
          console.error("Execution failed:", err);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code) => {
          conn.end();
          process.exit(code);
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
}).on('error', (err) => {
  console.error("SSH connection error:", err);
  process.exit(1);
}).connect(SSH_CONFIG);
