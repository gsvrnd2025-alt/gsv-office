const { Client } = require('./backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /mnt/GSVR_Movies/apps/gsv-office/frontend/dist/index.html && docker exec gsv_nginx cat /usr/share/nginx/html/index.html', (err, stream) => {
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
