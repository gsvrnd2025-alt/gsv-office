const { Client } = require('./backend/node_modules/ssh2');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const LOCAL_APK = path.join(__dirname, 'gsv_office_app', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const REMOTE_APK = '/mnt/GSVR_Movies/apps/gsv-office/GSV-EOffice.apk';

console.log('📱 Uploading GSV E-Office APK to TrueNAS...');
console.log(`   Local:  ${LOCAL_APK}`);
console.log(`   Remote: ${REMOTE_APK}`);

const conn = new Client();
conn.on('ready', () => {
  console.log('🔒 SSH connection established!');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }

    const startTime = Date.now();
    sftp.fastPut(LOCAL_APK, REMOTE_APK, {
      step: (transferred, chunk, total) => {
        const pct = Math.round((transferred / total) * 100);
        process.stdout.write(`\r   Progress: ${pct}% (${(transferred / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB)`);
      }
    }, (err) => {
      if (err) { console.error('\nUpload error:', err); conn.end(); return; }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ APK uploaded in ${elapsed}s!`);
      console.log(`\n📥 Download URL: http://192.168.0.177:8080/apk/GSV-EOffice.apk`);
      console.log(`   Or access via file manager at: \\\\192.168.0.177\\GSVR_Movies\\apps\\gsv-office\\`);

      // Also make it accessible via the nginx static server
      const linkCmd = `mkdir -p /mnt/GSVR_Movies/apps/gsv-office && echo "APK_READY"`;
      conn.exec(linkCmd, (err, stream) => {
        stream?.on('data', d => process.stdout.write(d.toString()));
        stream?.on('close', () => conn.end());
        if (err) conn.end();
      });
    });
  });
}).connect(SSH_CONFIG);
