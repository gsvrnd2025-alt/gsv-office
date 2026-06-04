const { Client } = require('C:/Users/GSVPC_F2/Documents/A gsv office plugin/backend/node_modules/ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Ready. Fetching mailserver logs...');
  conn.exec('docker logs --tail 200 gsv_mailserver', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      fs.writeFileSync('scratch/mailserver_logs.txt', output);
      console.log('Mailserver logs saved to scratch/mailserver_logs.txt');
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    }).stderr.on('data', (data) => {
      output += data.toString();
    });
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
