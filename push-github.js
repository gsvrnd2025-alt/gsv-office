const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Fetching GitHub token via gh CLI...');
  const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
  const repoUrl = `https://${token}@github.com/gsvrnd2025-alt/gsv-office.git`;
  const gitDir = 'F:\\RnD Projects\\A gsv office plugin';

  console.log('Aborting any in-progress rebase...');
  try { execSync('git rebase --abort', { cwd: gitDir, stdio: 'inherit' }); } catch {}

  console.log('Fetching origin/main...');
  execSync(`git fetch "${repoUrl}" main`, { cwd: gitDir, stdio: 'inherit' });

  console.log('Resetting local branch to origin/main...');
  execSync('git reset --hard FETCH_HEAD', { cwd: gitDir, stdio: 'inherit' });

  console.log('Syncing latest code from GSV Server Plugin workspace...');
  try {
    execSync(`robocopy "F:\\gsv_server plugin" "${gitDir}" /E /XD node_modules dist .git .gemini scratch logs uploads db redis minio downloads frontend\\android\\jdk21 /XF *.log *.tar.gz *.apk *.exe /NJH /NJS /NDL`, { stdio: 'inherit' });
  } catch (robocopyErr) {
    if (robocopyErr.status && robocopyErr.status > 7) {
      throw robocopyErr;
    }
  }

  // Ensure .gitignore ignores jdk21
  const gitignorePath = path.join(gitDir, '.gitignore');
  let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('frontend/android/jdk21')) {
    gitignoreContent += '\nfrontend/android/jdk21/\n';
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
  }

  console.log('Staging all modified and new files...');
  execSync('git add -A', { cwd: gitDir, stdio: 'inherit' });

  const status = execSync('git status --porcelain', { cwd: gitDir, encoding: 'utf8' });
  if (status.trim()) {
    console.log('Committing changes...');
    execSync('git commit -m "feat: Direct SMB folder sharing, unlimited 100GB+ file uploads, and live sync deployment"', { cwd: gitDir, stdio: 'inherit' });
    
    console.log('Pushing latest commits to origin main...');
    execSync(`git push "${repoUrl}" main`, { cwd: gitDir, stdio: 'inherit' });
    console.log('\n🎉 Successfully pushed to https://github.com/gsvrnd2025-alt/gsv-office.git!');
  } else {
    console.log('Already up to date with remote!');
  }
} catch (err) {
  console.error('Git operation failed:', err.message);
  process.exit(1);
}
