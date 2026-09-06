const { Client } = require('./backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /mnt/GSVR_Movies/apps/gsv-office && echo "--- DOWNLOADS ---" && ls -la /mnt/GSVR_Movies/apps/gsv-office/downloads', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
