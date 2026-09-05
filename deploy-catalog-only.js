#!/usr/bin/env node
/**
 * GSV Office — TrueNAS Catalog Deployment Script
 * 
 * This script:
 * 1. Resolves GitHub username
 * 2. Updates Helm chart templates with correct user container paths
 * 3. Builds the TrueNAS SCALE App Catalog repository structure
 * 4. Pushes the catalog repository to GitHub
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

console.log('\n════════════════════════════════════════════════════');
console.log('       GSV Office — Catalog Setup & Deploy');
console.log('════════════════════════════════════════════════════');

// ── Step 0: Get GitHub username ──────────────────────────────
const GITHUB_USER = runCapture('gh api user --jq .login');
if (!GITHUB_USER) {
  console.error('\n❌ Not logged in to GitHub! Run: gh auth login');
  process.exit(1);
}
console.log(`\n✅ GitHub User: ${GITHUB_USER}`);

const IMAGE_API    = `ghcr.io/${GITHUB_USER}/gsv-office-api`;
const IMAGE_NGINX  = `ghcr.io/${GITHUB_USER}/gsv-office-nginx`;
const REPO_CATALOG = 'gsv-office-catalog';

// ── Step 1: Update Helm chart with real image URLs ───────────
console.log('\n📝 Step 1: Updating Helm chart with real image URLs...');
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

// ── Step 2: Build catalog repo structure ────────────────────
console.log('\n📚 Step 2: Building TrueNAS SCALE catalog structure...');
if (fs.existsSync(CATALOG_DIR)) {
  console.log('  Cleaning old catalog directory...');
  fs.rmSync(CATALOG_DIR, { recursive: true, force: true });
}
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
const logoSrc = path.join(PROJECT_ROOT, 'frontend', 'public', 'logo.png');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(CATALOG_DIR, 'stable', 'gsv-office', 'icon.png'));
  console.log('  ✓ GSV logo added as catalog icon');
} else {
  console.warn('  ⚠️  Warning: logo.png not found in frontend/public! Using fallback favicon.');
  const faviconSrc = path.join(PROJECT_ROOT, 'frontend', 'public', 'favicon.svg');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(CATALOG_DIR, 'stable', 'gsv-office', 'icon.png'));
  }
}

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
4. Install and enjoy! 🚀

## Default Login
- **Email:** admin@gsv.local  
- **Password:** Admin@GSV2024

## Docker Images (Public)
- API: \`${IMAGE_API}:latest\`
- Frontend: \`${IMAGE_NGINX}:latest\`
`);

fs.writeFileSync(path.join(CATALOG_DIR, '.gitignore'), 'node_modules/\n.env\n*.log\n');
console.log('  ✓ Catalog structure built');

// ── Step 3: Push catalog to GitHub ─────────────────────────
console.log('\n🐙 Step 3: Creating and pushing catalog to GitHub...');

// Create repo on github via gh CLI
run(`gh repo create ${REPO_CATALOG} --public --description "TrueNAS SCALE Custom App Catalog - GSV Office" --confirm`, { cwd: CATALOG_DIR, ignoreError: true });

// Setup git locally for catalog
run(`git init -b main`, { cwd: CATALOG_DIR, ignoreError: true });
run(`git config user.name "${GITHUB_USER}"`, { cwd: CATALOG_DIR });
run(`git config user.email "${GITHUB_USER}@users.noreply.github.com"`, { cwd: CATALOG_DIR });
run(`git add .`, { cwd: CATALOG_DIR });
run(`git commit -m "feat: GSV Office TrueNAS SCALE catalog v1.0.0 with GSV logo"`, { cwd: CATALOG_DIR });

// Get fresh token
const token = runCapture('gh auth token');
run(`git remote remove origin`, { cwd: CATALOG_DIR, ignoreError: true });
run(`git remote add origin https://${GITHUB_USER}:${token}@github.com/${GITHUB_USER}/${REPO_CATALOG}.git`, { cwd: CATALOG_DIR });
run(`git push -u origin main --force`, { cwd: CATALOG_DIR });

console.log(`
\n════════════════════════════════════════════════════════════
  🎉 GSV OFFICE CUSTOM CATALOG DEPLOYED SUCCESSFULLY!
════════════════════════════════════════════════════════════

🐙 GitHub Catalog Repository:
   https://github.com/${GITHUB_USER}/${REPO_CATALOG}

🐳 Public Docker Images (ghcr.io):
   API:     ${IMAGE_API}:latest
   Nginx:   ${IMAGE_NGINX}:latest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️  HOW TO ADD TO TRUENAS SCALE APPS LIST:
   1. Open your TrueNAS SCALE Web UI
   2. Navigate to: Apps ➡️ Manage Catalogs
   3. Click "Add Catalog"
   4. Enter the following:
      • Name:       GSV Office
      • Repository: https://github.com/${GITHUB_USER}/${REPO_CATALOG}
      • Train:      stable
      • Branch:     main
   5. Click "Save" and wait ~2 minutes
   6. Go to "Available Applications"
   7. Search: "GSV Office" ➡️ Click Install! 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
