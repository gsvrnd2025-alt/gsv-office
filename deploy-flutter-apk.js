const { Client } = require('./backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const LOCAL_APK = path.join(__dirname, 'e_office_flutter', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const LOCAL_DOWNLOADS_APK = path.join(__dirname, 'downloads', 'GSVOffice-Android.apk');

if (fs.existsSync(LOCAL_APK)) {
  fs.copyFileSync(LOCAL_APK, LOCAL_DOWNLOADS_APK);
  console.log('✅ Copied native Flutter APK to local downloads:', LOCAL_DOWNLOADS_APK);
}

const conn = new Client();
conn.on('ready', () => {
  console.log('🔒 Connected to TrueNAS for Flutter APK deployment');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP Error:', err); conn.end(); return; }

    const remoteApk = '/mnt/GSVR_Movies/apps/gsv-office/downloads/GSVOffice-Android.apk';
    sftp.fastPut(LOCAL_APK, remoteApk, (err) => {
      if (err) { console.error('Upload failed:', err); conn.end(); return; }
      console.log('✅ Uploaded native Flutter APK to downloads/GSVOffice-Android.apk');
      
      conn.exec('ls -lh /mnt/GSVR_Movies/apps/gsv-office/downloads/GSVOffice-Android.apk', (err2, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.on('close', () => conn.end());
      });
    });
  });
}).connect(SSH_CONFIG);
