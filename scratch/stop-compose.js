const { Client } = require('../backend/node_modules/ssh2');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connected. Stopping manual docker-compose services to resolve name conflicts...');
  const stopCmd = 'cd /mnt/GSVR_Movies/apps/gsv-office && docker compose down';
  
  conn.exec(stopCmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log(`✓ Manual docker-compose stopped successfully (exit code: ${code}).`);
      conn.end();
    });
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(SSH_CONFIG);
