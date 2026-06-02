const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Ready. Fetching logs...');
  conn.exec('docker logs --tail 200 gsv_api', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code ' + code);
      fs.writeFileSync('scratch/api_logs.txt', output);
      console.log('Logs saved to scratch/api_logs.txt');
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
