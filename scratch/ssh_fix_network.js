const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Ready for Clean Container Restart!');
  
  // Commands to stop and remove old containers, then run docker compose up cleanly
  const command = `
    echo "Stopping old containers..."
    docker stop gsv_nginx gsv_api gsv_minio gsv_redis gsv_mailserver gsv_postgres gsv_coturn 2>/dev/null || true
    
    echo "Removing old containers..."
    docker rm gsv_nginx gsv_api gsv_minio gsv_redis gsv_mailserver gsv_postgres gsv_coturn 2>/dev/null || true
    
    echo "Starting docker compose stack..."
    cd /mnt/GSVR_Movies/apps/gsv-office/
    docker compose up -d
    
    echo "Verifying status..."
    docker ps
  `;

  console.log('Executing clean container restart...');
  conn.exec(command, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Execution finished with code: ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
