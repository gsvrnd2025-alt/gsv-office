#!/usr/bin/env node
/**
 * GSV Office — Full GitHub + Docker + Catalog Deployment Script
 * 
 * Run AFTER: gh auth login
 * 
 * This script:
 * 1. Gets your GitHub username from gh CLI
 * 2. Creates GitHub repos: gsv-office (code) + gsv-office-catalog
 * 3. Builds Docker images locally
 * 4. Authenticates Docker to ghcr.io
 * 5. Pushes images to GitHub Container Registry
 * 6. Creates the TrueNAS SCALE catalog repo and pushes to GitHub
 * 7. Prints the TrueNAS catalog URL to add
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'C:\\Users\\GSVPC_F2\\Documents\\A gsv office plugin';
const CATALOG_DIR = path.join(PROJECT_ROOT, 'gsv-office-catalog');

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  try {
    const result = execSync(cmd, {
      cwd: opts.cwd || PROJECT_ROOT,
      stdio: 'inherit',
      shell: true,
      ...opts
    });
    return result;
  } catch (e) {
    if (opts.ignoreError) {
      console.log(`  ⚠️  Ignored error: ${e.message}`);
      return null;
    }
    throw e;
  }
}

function runCapture(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, cwd: opts.cwd || PROJECT_ROOT });
  return result.stdout?.toString().trim() || '';
}

// ── Step 0: Get GitHub username ──────────────────────────────
console.log('\n════════════════════════════════════════════════════');
console.log('  GSV Office — GitHub + Docker + Catalog Deployment');
console.log('════════════════════════════════════════════════════');

const GITHUB_USER = runCapture('gh api user --jq .login');
if (!GITHUB_USER) {
  console.error('\n❌ Not logged in to GitHub! Run: gh auth login');
  process.exit(1);
}
console.log(`\n✅ GitHub User: ${GITHUB_USER}`);

const IMAGE_API   = `ghcr.io/${GITHUB_USER}/gsv-office-api`;
const IMAGE_NGINX = `ghcr.io/${GITHUB_USER}/gsv-office-nginx`;
const REPO_CODE   = 'gsv-office';
const REPO_CATALOG = 'gsv-office-catalog';

// ── Step 1: Initialize git in project ───────────────────────
console.log('\n📁 Step 1: Setting up git repository...');
run('git init', { ignoreError: true });
run(`git config user.name "${GITHUB_USER}"`, { ignoreError: true });
run(`git remote remove origin`, { ignoreError: true });

// ── Step 2: Create GitHub code repo ─────────────────────────
console.log('\n🐙 Step 2: Creating GitHub code repository...');
run(`gh repo create ${REPO_CODE} --public --description "GSV Office - Enterprise Self-Hosted Workspace Platform" --confirm`, { ignoreError: true });

// ── Step 3: Push code to GitHub ─────────────────────────────
console.log('\n📤 Step 3: Pushing source code to GitHub...');
run(`git add -A`);
run(`git commit -m "feat: GSV Office v1.0.0 - Enterprise Workspace Platform with GSV logo, favicon, and all fixes"`, { ignoreError: true });
run(`git remote add origin https://github.com/${GITHUB_USER}/${REPO_CODE}.git`, { ignoreError: true });
run(`git branch -M main`, { ignoreError: true });
run(`git push -u origin main --force`);
console.log(`✅ Code pushed to: https://github.com/${GITHUB_USER}/${REPO_CODE}`);

// ── Step 4: Docker login to ghcr.io ─────────────────────────
console.log('\n🐳 Step 4: Logging Docker into GitHub Container Registry...');
const ghToken = runCapture('gh auth token');
run(`echo ${ghToken} | docker login ghcr.io -u ${GITHUB_USER} --password-stdin`);

// ── Step 5: Build Docker images ──────────────────────────────
console.log('\n🔨 Step 5: Building Docker images...');
console.log('  Building NestJS API image...');
run(`docker build -t ${IMAGE_API}:latest -t ${IMAGE_API}:1.0.0 ./backend`, { cwd: PROJECT_ROOT });
console.log('\n  Building React/Nginx frontend image...');
run(`docker build -t ${IMAGE_NGINX}:latest -t ${IMAGE_NGINX}:1.0.0 ./frontend`, { cwd: PROJECT_ROOT });

// ── Step 6: Push Docker images ───────────────────────────────
console.log('\n📦 Step 6: Pushing images to GitHub Container Registry (ghcr.io)...');
run(`docker push ${IMAGE_API}:latest`);
run(`docker push ${IMAGE_API}:1.0.0`);
run(`docker push ${IMAGE_NGINX}:latest`);
run(`docker push ${IMAGE_NGINX}:1.0.0`);
console.log(`✅ Images published to ghcr.io!`);

// ── Step 7: Make packages public ────────────────────────────
console.log('\n🔓 Step 7: Making container packages public...');
run(`gh api --method PATCH /user/packages/container/gsv-office-api --field visibility=public`, { ignoreError: true });
run(`gh api --method PATCH /user/packages/container/gsv-office-nginx --field visibility=public`, { ignoreError: true });

// ── Step 8: Update Helm chart with real image URLs ───────────
console.log('\n📝 Step 8: Updating Helm chart with real image URLs...');
const valuesFile = path.join(PROJECT_ROOT, 'helm-chart', 'values.yaml');
let values = fs.readFileSync(valuesFile, 'utf8');
values = values
  .replace(/ghcr\.io\/gsv-office\/gsv-office-api/g, IMAGE_API)
  .replace(/ghcr\.io\/gsv-office\/gsv-office-nginx/g, IMAGE_NGINX);
fs.writeFileSync(valuesFile, values);
console.log('  ✓ values.yaml updated');

const chartFile = path.join(PROJECT_ROOT, 'helm-chart', 'Chart.yaml');
let chart = fs.readFileSync(chartFile, 'utf8');
chart = chart.replace(/gsv-office\/gsv-office-catalog/g, `${GITHUB_USER}/${REPO_CATALOG}`);
fs.writeFileSync(chartFile, chart);
console.log('  ✓ Chart.yaml updated');

const appFile = path.join(PROJECT_ROOT, 'helm-chart', 'app.yaml');
let app = fs.readFileSync(appFile, 'utf8');
app = app.replace(/gsv-office\/gsv-office-catalog/g, `${GITHUB_USER}/${REPO_CATALOG}`);
fs.writeFileSync(appFile, app);
console.log('  ✓ app.yaml updated');

// ── Step 9: Build catalog repo structure ────────────────────
console.log('\n📚 Step 9: Building TrueNAS SCALE catalog structure...');
const appVersionDir = path.join(CATALOG_DIR, 'stable', 'gsv-office', '1.0.0');
fs.mkdirSync(path.join(appVersionDir, 'templates'), { recursive: true });

// Copy all helm chart files into catalog structure
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const s = path.join(src, file);
    const d = path.join(dest, file);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(PROJECT_ROOT, 'helm-chart'), appVersionDir);

// Copy GSV logo into catalog for icon
const logoSrc = path.join(PROJECT_ROOT, 'old gsv eo office', 'GSV_SERVER_E_OFFICE', 'gsvlogo.png');
fs.copyFileSync(logoSrc, path.join(CATALOG_DIR, 'stable', 'gsv-office', 'icon.png'));
console.log('  ✓ GSV logo added as catalog icon');

// Create catalog README
fs.writeFileSync(path.join(CATALOG_DIR, 'README.md'), `# GSV Office — TrueNAS SCALE App Catalog

![GSV Logo](./stable/gsv-office/icon.png)

## GSV Office — Enterprise Self-Hosted Workspace Platform

All-in-one workspace with:
- 💬 Real-time Team Chat (WebSocket)
- 📁 Document & File Management  
- 🎫 Helpdesk Ticketing
- 💰 Billing & GST Invoicing
- 👥 HR & Employee Management
- 📦 Inventory & Purchase Orders
- 🔍 Audit Logs
- 🖥️ Server Administration

## Add This Catalog to TrueNAS SCALE

1. **Apps → Manage Catalogs → Add Catalog**
2. Fill in:
   - **Name:** \`GSV Office\`
   - **Repository:** \`https://github.com/${GITHUB_USER}/${REPO_CATALOG}\`
   - **Train:** \`stable\`
   - **Branch:** \`main\`
3. Wait ~2 minutes → search **"GSV Office"** in Apps

## Default Login
- **Email:** admin@gsv.local  
- **Password:** Admin@GSV2024

## Docker Images
- API: \`${IMAGE_API}:latest\`
- Frontend: \`${IMAGE_NGINX}:latest\`
`);

fs.writeFileSync(path.join(CATALOG_DIR, '.gitignore'), 'node_modules/\n.env\n*.log\n');
console.log('  ✓ Catalog structure built');

// ── Step 10: Push catalog to GitHub ─────────────────────────
console.log('\n🐙 Step 10: Creating and pushing catalog to GitHub...');
run(`gh repo create ${REPO_CATALOG} --public --description "TrueNAS SCALE Custom App Catalog - GSV Office" --confirm`, { cwd: CATALOG_DIR, ignoreError: true });
run(`git init -b main`, { cwd: CATALOG_DIR, ignoreError: true });
run(`git config user.name "${GITHUB_USER}"`, { cwd: CATALOG_DIR });
run(`git add .`, { cwd: CATALOG_DIR });
run(`git commit -m "feat: GSV Office TrueNAS SCALE catalog v1.0.0 with GSV logo"`, { cwd: CATALOG_DIR });
run(`git remote remove origin`, { cwd: CATALOG_DIR, ignoreError: true });
run(`git remote add origin https://github.com/${GITHUB_USER}/${REPO_CATALOG}.git`, { cwd: CATALOG_DIR });
run(`git push -u origin main --force`, { cwd: CATALOG_DIR });

// ── Done! ────────────────────────────────────────────────────
console.log(`
\n${'═'.repeat(60)}
  🎉 GSV OFFICE FULLY DEPLOYED TO GITHUB!
${'═'.repeat(60)}

📦 GitHub Repositories:
   Code:    https://github.com/${GITHUB_USER}/${REPO_CODE}
   Catalog: https://github.com/${GITHUB_USER}/${REPO_CATALOG}

🐳 Docker Images (ghcr.io):
   API:     ${IMAGE_API}:latest
   Nginx:   ${IMAGE_NGINX}:latest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  ADD TO TRUENAS SCALE APPS LIST:
   1. Open TrueNAS Web UI → Apps → Manage Catalogs
   2. Click "Add Catalog"
   3. Enter:
      Name:       GSV Office
      Repository: https://github.com/${GITHUB_USER}/${REPO_CATALOG}
      Train:      stable
      Branch:     main
   4. Save → wait 2 minutes
   5. Go to Apps → Available Applications
   6. Search: "GSV Office" → Install! 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Your App is LIVE NOW at:
   http://192.168.0.177:8080
   Login: admin@gsv.local / Admin@GSV2024

${'═'.repeat(60)}
`);
