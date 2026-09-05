const { Client } = require('./backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  const syncCmd = [
    'docker cp /mnt/GSVR_Movies/apps/gsv-office/frontend/dist/. gsv_nginx:/usr/share/nginx/html/',
    'docker cp /mnt/GSVR_Movies/apps/gsv-office/backend/dist/. gsv_api:/app/dist/',
    'docker exec gsv_nginx nginx -s reload',
    'docker restart gsv_api',
    'docker exec gsv_nginx cat /usr/share/nginx/html/index.html'
  ].join(' && ');

  console.log('Copying latest dist directly into running containers on TrueNAS...');
  conn.exec(syncCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', (code) => {
      console.log(`\nContainer sync complete (code: ${code})`);
      conn.end();
    });
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
