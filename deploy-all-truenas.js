const { Client } = require('./backend/node_modules/ssh2');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';

console.log('════════════════════════════════════════════════════');
console.log('       GSV Office — Complete TrueNAS Push & Deploy');
console.log('════════════════════════════════════════════════════');

// 1. Pack Frontend and Backend archives
console.log('\n📦 Step 1: Packing Frontend & Backend dist archives...');
execSync('tar -czf frontend.tar.gz -C frontend/dist .', { stdio: 'inherit' });
execSync('tar -czf backend.tar.gz -C backend/dist .', { stdio: 'inherit' });
execSync('tar -czf adm-zip.tar.gz -C backend/node_modules adm-zip', { stdio: 'inherit' });
console.log('  ✓ Dist archives created.');

// 2. Prepare Flutter Binaries for Downloads
const localFlutterApk = path.join(__dirname, 'e_office_flutter', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const localFlutterExe = path.join(__dirname, 'e_office_flutter', 'build', 'windows', 'x64', 'runner', 'Release', 'e_office_flutter.exe');

if (fs.existsSync(localFlutterApk)) {
  fs.copyFileSync(localFlutterApk, path.join(__dirname, 'downloads', 'GSVOffice-Android.apk'));
  console.log('  ✓ Flutter APK copied to downloads/GSVOffice-Android.apk');
}
if (fs.existsSync(localFlutterExe)) {
  fs.copyFileSync(localFlutterExe, path.join(__dirname, 'downloads', 'GSVOffice-Portable.exe'));
  console.log('  ✓ Flutter Windows EXE copied to downloads/GSVOffice-Portable.exe');
}

console.log(`\nConnecting to TrueNAS SCALE at ${SSH_CONFIG.host}...`);

const conn = new Client();
conn.on('ready', () => {
  console.log('🔒 SSH connection established successfully!');

  // Ensure remote directories exist
  const mkdirCmd = `mkdir -p ${REMOTE_APP_DIR}/database ${REMOTE_APP_DIR}/nginx/conf.d ${REMOTE_APP_DIR}/downloads ${REMOTE_APP_DIR}/frontend/dist ${REMOTE_APP_DIR}/backend/dist ${REMOTE_APP_DIR}/backend/node_modules`;

  conn.exec(mkdirCmd, (err, stream) => {
    if (err) throw err;
    stream.resume();
    stream.stderr.resume();

    stream.on('close', () => {
      console.log('  ✓ Remote directories verified.');

      conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
          { local: './frontend.tar.gz', remote: `${REMOTE_APP_DIR}/frontend.tar.gz` },
          { local: './backend.tar.gz', remote: `${REMOTE_APP_DIR}/backend.tar.gz` },
          { local: './adm-zip.tar.gz', remote: `${REMOTE_APP_DIR}/adm-zip.tar.gz` },
          { local: './downloads/GSVOffice-Android.apk', remote: `${REMOTE_APP_DIR}/downloads/GSVOffice-Android.apk` },
          { local: './docker-compose-truenas.yml', remote: `${REMOTE_APP_DIR}/docker-compose.yml` },
          { local: './nginx/conf.d/default.conf', remote: `${REMOTE_APP_DIR}/nginx/conf.d/default.conf` },
        ];

        if (fs.existsSync('./downloads/GSVOffice-Portable.exe')) {
          filesToUpload.push({ local: './downloads/GSVOffice-Portable.exe', remote: `${REMOTE_APP_DIR}/downloads/GSVOffice-Portable.exe` });
        }

        console.log('\n📤 Step 2: Uploading updated bundles to TrueNAS via SFTP...');
        let uploaded = 0;

        function uploadNext() {
          if (uploaded === filesToUpload.length) {
            console.log('  ✓ All bundles pushed to TrueNAS successfully.');
            deployOnServer();
            return;
          }

          const item = filesToUpload[uploaded];
          console.log(`  Transferring: ${item.local} ➡️ ${item.remote}`);
          sftp.fastPut(item.local, item.remote, (err) => {
            if (err) {
              console.error(`❌ Upload failed for ${item.local}:`, err);
              conn.end();
              return;
            }
            uploaded++;
            uploadNext();
          });
        }

        uploadNext();
      });
    });
  });
}).connect(SSH_CONFIG);

function deployOnServer() {
  console.log('\n🔄 Step 3: Unpacking on TrueNAS and applying live container sync...');

  const deployCmd = [
    `tar -xzf ${REMOTE_APP_DIR}/frontend.tar.gz -C ${REMOTE_APP_DIR}/frontend/dist`,
    `tar -xzf ${REMOTE_APP_DIR}/backend.tar.gz -C ${REMOTE_APP_DIR}/backend/dist`,
    `tar -xzf ${REMOTE_APP_DIR}/adm-zip.tar.gz -C ${REMOTE_APP_DIR}/backend/node_modules`,
    `docker cp ${REMOTE_APP_DIR}/frontend/dist/. gsv_nginx:/usr/share/nginx/html/ || true`,
    `docker cp ${REMOTE_APP_DIR}/backend/dist/. gsv_api:/app/dist/ || true`,
    `docker cp ${REMOTE_APP_DIR}/backend/node_modules/adm-zip gsv_api:/app/node_modules/ || true`,
    `docker exec gsv_nginx nginx -s reload || true`,
    `docker restart gsv_api || true`,
    `sleep 3`,
    `echo "TRUENAS_DEPLOY_COMPLETE"`
  ].join(' && ');

  conn.exec(deployCmd, (err, stream) => {
    if (err) throw err;

    stream.on('data', d => process.stdout.write(d.toString()));
    stream.on('close', (code) => {
      conn.end();
      if (code === 0) {
        console.log('\n🎉 ALL UPDATES PUSHED & DEPLOYED TO TRUENAS SCALE!');
        console.log('🌐 Web Application: http://192.168.0.177:8080');
        console.log('📱 Android Flutter APK: http://192.168.0.177:8080/downloads/GSVOffice-Android.apk');
        console.log('🖥️ Windows Client: http://192.168.0.177:8080/downloads/GSVOffice-Portable.exe');
      }
    });
  });
}
