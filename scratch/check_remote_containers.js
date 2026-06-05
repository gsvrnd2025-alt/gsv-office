const { Client } = require('C:/Users/GSVPC_F2/Documents/A gsv office plugin/backend/node_modules/ssh2');
const conn = new Client();

function execSSH(conn, cmd, label) {
  return new Promise((resolve) => {
    console.log(`\n═══ ${label} ═══`);
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err.message);
        return resolve();
      }
      let output = '';
      stream.on('close', (code) => { resolve({ code, output }); });
      stream.on('data', (d) => { output += d.toString(); process.stdout.write(d.toString()); });
      stream.stderr.on('data', (d) => { process.stderr.write(d.toString()); });
    });
  });
}

conn.on('ready', async () => {
  console.log('Connected!\n');
  try {
    await execSSH(conn, 'docker ps -a --filter name=gsv', 'All GSV containers (including stopped)');
    await execSSH(conn, 'docker logs gsv_api --tail=50 2>&1', 'API container logs');
    await execSSH(conn, 'docker logs gsv_nginx --tail=50 2>&1', 'Nginx container logs');
  } catch(e) {
    console.error(e.message);
  } finally {
    conn.end();
  }
});
conn.on('error', e => console.error('SSH Error:', e.message));
conn.connect({ host: '192.168.0.177', port: 22, username: 'root', password: 'Gsv@2018' });
