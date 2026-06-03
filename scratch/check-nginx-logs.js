const { Client } = require('C:/Users/GSVPC_F2/Documents/A gsv office plugin/backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Ready');
  const cmd = `
    echo "=== Docker Containers ==="
    docker ps -a
    
    echo "=== Nginx Container Logs ==="
    docker logs gsv_nginx --tail 30
    
    echo "=== API Container Logs ==="
    docker logs gsv_api --tail 30
    
    echo "=== Checking Uploads Folder ==="
    ls -la /mnt/GSVR_Movies/apps/gsv-office/uploads || true
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
