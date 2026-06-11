#!/usr/bin/env node
/**
 * GSV Office — Semantic Versioning Release Utility
 * Usage:
 *   node scripts/release.js [patch | minor | major] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Helper to log with style
function logInfo(msg) { console.log(`\x1b[36mℹ ${msg}\x1b[0m`); }
function logSuccess(msg) { console.log(`\x1b[32m✔ ${msg}\x1b[0m`); }
function logWarning(msg) { console.log(`\x1b[33m⚠ ${msg}\x1b[0m`); }
function logError(msg) { console.error(`\x1b[31m✘ ${msg}\x1b[0m`); }

// Parse target bump type
const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const bumpType = args[0] || 'patch';

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  logError(`Invalid bump type: "${bumpType}". Must be patch, minor, or major.`);
  process.exit(1);
}

// 1. Read current version from frontend/package.json
const frontendPkgPath = path.join(PROJECT_ROOT, 'frontend', 'package.json');
if (!fs.existsSync(frontendPkgPath)) {
  logError(`Frontend package.json not found at ${frontendPkgPath}`);
  process.exit(1);
}

const frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf8'));
const currentVersion = frontendPkg.version || '1.0.0';
logInfo(`Current version: ${currentVersion}`);

// Parse version parts
const [major, minor, patch] = currentVersion.split('.').map(Number);
let nextVersion = '';
if (bumpType === 'major') {
  nextVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  nextVersion = `${major}.${minor + 1}.0`;
} else {
  nextVersion = `${major}.${minor}.${patch + 1}`;
}

logInfo(`Next version (${bumpType}): ${nextVersion}`);

if (DRY_RUN) {
  logWarning('--- DRY RUN MODE: No files will be modified ---');
}

// Helper to update files
function updateFile(filePath, searchRegex, replaceString) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(absolutePath)) {
    logWarning(`File not found, skipping: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(absolutePath, 'utf8');
  const updatedContent = content.replace(searchRegex, replaceString);
  if (content === updatedContent) {
    logInfo(`No changes detected in ${filePath}`);
    return;
  }
  if (!DRY_RUN) {
    fs.writeFileSync(absolutePath, updatedContent, 'utf8');
    logSuccess(`Updated ${filePath}`);
  } else {
    logInfo(`[Dry-Run] Would update ${filePath}`);
  }
}

// 2. Update frontend/package.json
updateFile('frontend/package.json', /"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);

// 3. Update backend/package.json
updateFile('backend/package.json', /"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);

// 4. Update .env and .env.example
updateFile('.env', /APP_VERSION=[^\r\n]*/, `APP_VERSION=${nextVersion}`);
updateFile('.env.example', /APP_VERSION=[^\r\n]*/, `APP_VERSION=${nextVersion}`);

// 5. Update docker-compose-truenas.yml
updateFile('docker-compose-truenas.yml', /APP_VERSION:\s*"[^"]+"/, `APP_VERSION: "${nextVersion}"`);

// 6. Update Helm chart config files
updateFile('helm-chart/Chart.yaml', /version:\s*[^\r\n]*/, `version: ${nextVersion}`);
updateFile('helm-chart/Chart.yaml', /appVersion:\s*"[^"]*"/, `appVersion: "${nextVersion}"`);
updateFile('helm-chart/app.yaml', /app_version:\s*"[^"]*"/, `app_version: "${nextVersion}"`);
updateFile('helm-chart/app.yaml', /version:\s*"[^"]*"/, `version: "${nextVersion}"`);
updateFile('helm-chart/app.yaml', /lib_version:\s*"[^"]*"/, `lib_version: "${nextVersion}"`);
updateFile('helm-chart/app.yaml', /lib_version_hash:\s*"gsv-office-[^"]*"/, `lib_version_hash: "gsv-office-${nextVersion}"`);

// Update Helm chart default values
updateFile('helm-chart/values.yaml', /tag:\s*"latest"/g, `tag: "v${nextVersion}"`);
updateFile('helm-chart/values.yaml', /tag:\s*"v[^"]*"/g, `tag: "v${nextVersion}"`);

// 7. Write build metadata
const buildMetadata = {
  version: nextVersion,
  buildTime: new Date().toISOString(),
  bumpType,
  gitCommit: DRY_RUN ? 'dry-run-commit-sha' : runGitCommand('git rev-parse HEAD')
};

const metadataPath = path.join(PROJECT_ROOT, 'build-metadata.json');
if (!DRY_RUN) {
  fs.writeFileSync(metadataPath, JSON.stringify(buildMetadata, null, 2), 'utf8');
  logSuccess('Generated build-metadata.json');
} else {
  logInfo('[Dry-Run] Would generate build-metadata.json');
}

// Git tag and changelog helper
function runGitCommand(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT }).toString().trim();
  } catch (err) {
    return 'unknown';
  }
}

if (!DRY_RUN) {
  logInfo('Generating commit history for changelog...');
  const commits = runGitCommand('git log -n 15 --oneline');
  const changelogEntry = `## Release v${nextVersion} (${new Date().toISOString().split('T')[0]})\n\n${commits || 'No commits documented.'}\n\n`;
  
  const changelogPath = path.join(PROJECT_ROOT, 'CHANGELOG.md');
  let existingChangelog = '';
  if (fs.existsSync(changelogPath)) {
    existingChangelog = fs.readFileSync(changelogPath, 'utf8');
  }
  fs.writeFileSync(changelogPath, changelogEntry + existingChangelog, 'utf8');
  logSuccess('Updated CHANGELOG.md');
  
  logSuccess(`\n🎉 Semantic version bumped successfully to v${nextVersion}!`);
  logInfo(`To release, run:\n  git add -A && git commit -m "chore(release): v${nextVersion}" && git tag -a v${nextVersion} -m "Release v${nextVersion}"`);
} else {
  logSuccess('\n🎉 Dry-run run completed successfully.');
}
