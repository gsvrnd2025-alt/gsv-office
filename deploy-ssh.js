/**
 * GSV Office — TrueNAS SCALE SSH Automated Deployment Utility
 * Supports Semantic Versioning & Secure Variable Injection.
 * Usage:
 *   node deploy-ssh.js [v1.0.1]
 */

const { Client } = require('./backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

// Load env variables if they exist
require('./backend/node_modules/dotenv').config();

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '192.168.0.177',
  port: parseInt(process.env.SSH_PORT || '22', 10),
  username: process.env.SSH_USER || 'root',
  password: process.env.SSH_PASS || 'Gsv@2018'
};

const REMOTE_APP_DIR = '/mnt/GSVR_Movies/apps/gsv-office';
const TRUENAS_CONFIG_DIR = '/mnt/.ix-apps/app_configs/gsv-office/versions/1.0.0';

// 1. Determine version to deploy
let deployVersion = process.argv[2];
if (!deployVersion) {
  try {
    const pkg = JSON.parse(fs.readFileSync('./frontend/package.json', 'utf8'));
    deployVersion = pkg.version ? `v${pkg.version}` : 'latest';
  } catch (e) {
    deployVersion = 'latest';
  }
}

// Clean version prefix if user passed it without 'v'
if (deployVersion !== 'latest' && !deployVersion.startsWith('v')) {
  deployVersion = `v${deployVersion}`;
}

console.log('════════════════════════════════════════════════════');
console.log('       GSV Office — Remote SSH Deployer');
console.log('════════════════════════════════════════════════════');
console.log(`Target Version : ${deployVersion}`);
console.log(`TrueNAS Host   : ${SSH_CONFIG.host}`);
console.log(`SSH Username   : ${SSH_CONFIG.username}`);
console.log('════════════════════════════════════════════════════');

function startDeployment() {
  console.log(`Connecting to TrueNAS SCALE...`);
  const conn = new Client();

  conn.on('ready', () => {
    console.log('🔒 SSH connection established successfully!');
    
    // ── Step 1: Create Remote Directories ──────────────────────────
    console.log('\n📁 Step 1: Creating remote directories...');
    const mkdirCmd = `mkdir -p ${REMOTE_APP_DIR}/database ${REMOTE_APP_DIR}/nginx/conf.d ${REMOTE_APP_DIR}/logs ${REMOTE_APP_DIR}/plugins ${REMOTE_APP_DIR}/uploads ${REMOTE_APP_DIR}/db ${REMOTE_APP_DIR}/redis ${REMOTE_APP_DIR}/minio ${REMOTE_APP_DIR}/downloads ${REMOTE_APP_DIR}/mailserver/config ${TRUENAS_CONFIG_DIR}/templates/rendered`;
    
    conn.exec(mkdirCmd, (err, stream) => {
      if (err) {
        handleError(err, 'Creating remote directories', conn);
        return;
      }
      
      stream.resume();
      stream.stderr.resume();
      
      stream.on('close', (code) => {
        if (code !== 0) {
          handleError(new Error(`Exit code ${code}`), 'Creating remote directories', conn);
          return;
        }
        console.log(`  ✓ Directories initialized.`);
        
        // ── Step 2: SFTP Upload Files ──────────────────────────────
        console.log('\n📤 Step 2: Transferring deployment files via SFTP...');
        conn.sftp((err, sftp) => {
          if (err) {
            handleError(err, 'Initializing SFTP channel', conn);
            return;
          }
          
          const filesToUpload = [
            { local: './docker-compose-truenas.yml', remote: `${REMOTE_APP_DIR}/docker-compose.yml` },
            { local: './docker-compose-truenas.yml', remote: `${TRUENAS_CONFIG_DIR}/user_config.yaml` }, // Update TrueNAS App template source!
            { local: './database/schema.sql', remote: `${REMOTE_APP_DIR}/database/schema.sql` },
            { local: './database/seed.sql', remote: `${REMOTE_APP_DIR}/database/seed.sql` },
            { local: './nginx/nginx.conf', remote: `${REMOTE_APP_DIR}/nginx/nginx.conf` },
            { local: './nginx/conf.d/default.conf', remote: `${REMOTE_APP_DIR}/nginx/conf.d/default.conf` },
            { local: './mailserver.env', remote: `${REMOTE_APP_DIR}/mailserver.env` }
          ];

          // Upload local .env if it exists
          if (fs.existsSync('./.env')) {
            filesToUpload.push({ local: './.env', remote: `${REMOTE_APP_DIR}/.env` });
          }
          
          try {
            const downloadFiles = fs.readdirSync('./downloads');
            for (const file of downloadFiles) {
              const localPath = path.join('./downloads', file);
              if (fs.statSync(localPath).isFile()) {
                filesToUpload.push({
                  local: localPath,
                  remote: `${REMOTE_APP_DIR}/downloads/${file}`
                });
              }
            }
          } catch (e) {
            console.warn('Warning: Could not read local downloads folder for transfer:', e.message);
          }
          
          let uploadedCount = 0;
          
          function uploadNext() {
            if (uploadedCount === filesToUpload.length) {
              console.log('  ✓ All files transferred successfully.');
              runDockerCompose(conn);
              return;
            }
            
            const file = filesToUpload[uploadedCount];
            
            // Optimize deployment by skipping files that already match local size
            sftp.stat(file.remote, (err, stats) => {
              try {
                const localSize = fs.statSync(file.local).size;
                if (!err && stats && stats.size === localSize) {
                  console.log(`  ✓ Skipping (already matches remote size): ${file.local}`);
                  uploadedCount++;
                  uploadNext();
                  return;
                }
              } catch (e) {}

              console.log(`  Transferring: ${file.local} ➡️ ${file.remote}`);
              sftp.fastPut(file.local, file.remote, (err) => {
                if (err) {
                  handleError(err, `Uploading ${file.local}`, conn);
                  return;
                }
                uploadedCount++;
                uploadNext();
              });
            });
          }
          
          uploadNext();
        });
      });
    });
  });

  conn.on('error', (err) => {
    handleError(err, 'SSH Connection', conn);
  });

  conn.connect(SSH_CONFIG);
}

function handleError(err, context, conn) {
  console.error(`\n❌ Error in context "${context}": ${err.message}`);
  try { conn.end(); } catch (e) {}
  process.exit(1);
}

function runDockerCompose(conn) {
  console.log('\n🐋 Step 3: Aligning remote environments and starting containers...');

  // Clean version string for environment variable (v1.0.1 -> 1.0.1)
  const plainVersion = deployVersion.startsWith('v') ? deployVersion.substring(1) : deployVersion;

  // Shell commands to run on the TrueNAS host
  const composeCmd = [
    // 1. Ensure env file exists
    `touch ${REMOTE_APP_DIR}/.env`,
    // 2. Inject target version into env file
    `sed -i '/^APP_VERSION=/d' ${REMOTE_APP_DIR}/.env`,
    `echo "APP_VERSION=${plainVersion}" >> ${REMOTE_APP_DIR}/.env`,
    // 3. Replicate environment to TrueNAS configuration folders so compose reads them
    `cp ${REMOTE_APP_DIR}/.env ${TRUENAS_CONFIG_DIR}/.env`,
    `cp ${REMOTE_APP_DIR}/.env ${TRUENAS_CONFIG_DIR}/templates/rendered/.env`,
    // 4. Set permissions for served download binaries
    `chmod -R 755 ${REMOTE_APP_DIR}/downloads || true`,
    // 5. Patch rendered docker-compose file on TrueNAS to include downloads volume mount
    `python3 -c "import os; fp='/mnt/.ix-apps/app_configs/gsv-office/versions/1.0.0/templates/rendered/docker-compose.yaml'; (lambda c: open(fp, 'w').write(c.replace('    - uploads_data:/var/www/uploads:ro', '    - /mnt/GSVR_Movies/apps/gsv-office/downloads:/var/www/downloads:ro\\\\n    - uploads_data:/var/www/uploads:ro')))(open(fp).read()) if os.path.exists(fp) else None"`,
    // 6. Pre-pull images to ensure smooth startup
    `docker image pull ghcr.io/gsvrnd2025-alt/gsv-office-api:${deployVersion}`,
    `docker image pull ghcr.io/gsvrnd2025-alt/gsv-office-nginx:${deployVersion}`,
    // 6. Clean up old standalone/conflicting container instances
    `docker stop gsv_nginx gsv_api gsv_postgres gsv_redis gsv_minio gsv_mailserver || true`,
    `docker rm gsv_nginx gsv_api gsv_postgres gsv_redis gsv_minio gsv_mailserver || true`,
    // 7. Stop and restart TrueNAS app via middleware (renders docker-compose and starts it)
    `midclt call app.stop "gsv-office" || true`,
    `midclt call app.start "gsv-office"`,
    // 8. Clean up unused and dangling Docker images to save space
    `docker image prune -f || true`,
    `sleep 10`,
    `midclt call app.query`
  ].join(' && ');

  console.log(`Executing remote command sequence on TrueNAS...\n`);
  
  conn.exec(composeCmd, (err, stream) => {
    if (err) {
      handleError(err, 'Docker Compose Command Execution', conn);
      return;
    }
    
    stream.on('close', (code) => {
      console.log(`\n✅ Remote command execution finished (exit code: ${code})`);
      conn.end();
      
      if (code === 0) {
        console.log(`
Successfully deployed version ${deployVersion} to TrueNAS SCALE!
🌐 App URL: http://192.168.0.177:8080
`);
      } else {
        process.exit(code);
      }
    });
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}

// Run deployment
startDeployment();
