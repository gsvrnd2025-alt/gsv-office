const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Connection to TrueNAS SCALE Established!');
  
  // Run deployment sequence
  const cmd = `
    echo "=== Running docker ps ==="
    docker ps
    
    echo "=== Checking directory contents ==="
    ls -la /mnt/GSVR_Movies/apps/gsv-office
    
    echo "=== Copying docker-compose-truenas.yml to TrueNAS ==="
  `;
  
  conn.exec('docker ps && ls -la /mnt/GSVR_Movies/apps/gsv-office', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream closed.');
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
