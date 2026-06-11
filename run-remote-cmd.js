require('./backend/node_modules/dotenv').config();
const { Client } = require('./backend/node_modules/ssh2');
const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const conn = new Client();
conn.on('ready', () => {
  const cmd = process.argv.slice(2).join(' ');
  console.log(`Running on TrueNAS: ${cmd}`);
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(SSH_CONFIG);
