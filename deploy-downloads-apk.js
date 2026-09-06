const { Client } = require('./backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const LOCAL_APK = path.join(__dirname, 'gsv_office_app', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const LOCAL_DOWNLOADS_APK = path.join(__dirname, 'downloads', 'GSVOffice-Android.apk');

// Copy locally first
if (fs.existsSync(LOCAL_APK)) {
  fs.copyFileSync(LOCAL_APK, LOCAL_DOWNLOADS_APK);
  console.log('✅ Copied APK to local downloads folder:', LOCAL_DOWNLOADS_APK);
} else {
  console.error('❌ Local APK not found at:', LOCAL_APK);
}

const conn = new Client();
conn.on('ready', () => {
  console.log('🔒 Connected to TrueNAS');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP Error:', err); conn.end(); return; }

    const remoteApk1 = '/mnt/GSVR_Movies/apps/gsv-office/downloads/GSVOffice-Android.apk';
    const remoteApk2 = '/mnt/GSVR_Movies/apps/gsv-office/downloads/GSV-EOffice.apk';
    
    console.log('📤 Uploading to', remoteApk1);
    sftp.fastPut(LOCAL_APK, remoteApk1, (err) => {
      if (err) { console.error('Upload 1 failed:', err); conn.end(); return; }
      console.log('✅ Uploaded to downloads/GSVOffice-Android.apk');
      
      sftp.fastPut(LOCAL_APK, remoteApk2, (err2) => {
        if (err2) console.error('Upload 2 failed:', err2);
        else console.log('✅ Uploaded to downloads/GSV-EOffice.apk');
        
        conn.exec('ls -lh /mnt/GSVR_Movies/apps/gsv-office/downloads/GSVOffice-Android.apk && docker exec gsv_nginx ls -lh /var/www/downloads/GSVOffice-Android.apk', (err3, stream) => {
          stream.on('data', d => process.stdout.write(d.toString()));
          stream.on('close', () => conn.end());
        });
      });
    });
  });
}).connect(SSH_CONFIG);
