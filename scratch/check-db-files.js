const { Client } = require('C:/Users/GSVPC_F2/Documents/A gsv office plugin/backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Ready');
  const cmd = `docker exec gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT id, name, original_name, mime_type, storage_url, storage_path FROM files LIMIT 10;"`;
  
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
