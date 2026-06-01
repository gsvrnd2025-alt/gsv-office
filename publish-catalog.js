#!/usr/bin/env node
/**
 * GSV Office — GitHub Catalog Publisher
 * 
 * This script:
 * 1. Creates the correct TrueNAS SCALE catalog folder structure
 * 2. Copies the Helm chart into it
 * 3. Initializes a git repo and pushes to GitHub
 * 
 * Usage: node publish-catalog.js <github-username>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const githubUsername = process.argv[2];
if (!githubUsername) {
  console.error('❌ Usage: node publish-catalog.js <your-github-username>');
  console.error('   Example: node publish-catalog.js myusername');
  process.exit(1);
}

const repoName = 'gsv-office-catalog';
const catalogDir = path.join(process.cwd(), repoName);
const helmSrc = path.join(process.cwd(), 'helm-chart');
const appVersion = '1.0.0';
const trainName = 'stable';

console.log(`\n🚀 Building TrueNAS SCALE catalog for GitHub user: ${githubUsername}\n`);

// ── Step 1: Create catalog directory structure ───────────────
const appVersionDir = path.join(catalogDir, trainName, 'gsv-office', appVersion);
fs.mkdirSync(path.join(appVersionDir, 'templates'), { recursive: true });
fs.mkdirSync(path.join(appVersionDir, 'questions'), { recursive: true });
console.log('📁 Created catalog directory structure');

// ── Step 2: Copy helm chart files ────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const s = path.join(src, file);
    const d = path.join(dest, file);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
copyDir(helmSrc, appVersionDir);
console.log('📋 Copied Helm chart files into catalog');

// ── Step 3: Update repo URL in Chart.yaml ────────────────────
const chartFile = path.join(appVersionDir, 'Chart.yaml');
let chartContent = fs.readFileSync(chartFile, 'utf8');
chartContent = chartContent.replace(
  /gsv-office\/gsv-office-catalog/g,
  `${githubUsername}/${repoName}`
);
fs.writeFileSync(chartFile, chartContent);

// Update app.yaml icon URL
const appFile = path.join(appVersionDir, 'app.yaml');
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace(
  /gsv-office\/gsv-office-catalog/g,
  `${githubUsername}/${repoName}`
);
fs.writeFileSync(appFile, appContent);
console.log(`✏️  Updated GitHub username to: ${githubUsername}`);

// ── Step 4: Create catalog README ────────────────────────────
fs.writeFileSync(path.join(catalogDir, 'README.md'), `# GSV Office — TrueNAS SCALE Catalog

This is a custom app catalog for [TrueNAS SCALE](https://www.truenas.com/truenas-scale/).

## How to Add This Catalog in TrueNAS SCALE

1. Open TrueNAS SCALE Web UI
2. Go to **Apps → Manage Catalogs → Add Catalog**
3. Fill in:
   - **Catalog Name:** \`GSV Office\`
   - **Repository:** \`https://github.com/${githubUsername}/${repoName}\`
   - **Preferred Trains:** \`stable\`
   - **Branch:** \`main\`
4. Click **Save** and wait ~2 minutes for indexing
5. Go to **Apps → Available Applications** and search **"GSV Office"**

## Apps Included

| App | Description |
|-----|-------------|
| **GSV Office** | Enterprise Self-Hosted Workspace Platform |

## Default Login
- **Email:** admin@gsv.local
- **Password:** Admin@GSV2024
`);

// ── Step 5: Create .gitignore ─────────────────────────────────
fs.writeFileSync(path.join(catalogDir, '.gitignore'), `node_modules/\n.env\n*.log\n`);

// ── Step 6: Git init and push ─────────────────────────────────
console.log('\n📦 Initializing git repository...');
const run = (cmd) => {
  try {
    const out = execSync(cmd, { cwd: catalogDir, stdio: 'pipe' }).toString();
    if (out.trim()) console.log('   ' + out.trim());
  } catch(e) {
    console.error('   ⚠️  ' + (e.stderr?.toString() || e.message));
  }
};

run('git init -b main');
run('git add .');
run('git commit -m "feat: initial GSV Office TrueNAS SCALE catalog v1.0.0"');

console.log('\n✅ Catalog repository created!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  NEXT STEPS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n1. Create a PUBLIC GitHub repo named: ${repoName}`);
console.log(`   → https://github.com/new\n`);
console.log(`2. Push this catalog:\n`);
console.log(`   cd ${catalogDir}`);
console.log(`   git remote add origin https://github.com/${githubUsername}/${repoName}.git`);
console.log(`   git push -u origin main\n`);
console.log('3. In TrueNAS SCALE Web UI:');
console.log('   Apps → Manage Catalogs → Add Catalog');
console.log(`   Repository: https://github.com/${githubUsername}/${repoName}`);
console.log('   Train: stable\n');
console.log('4. Search "GSV Office" in Available Applications 🎉\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
