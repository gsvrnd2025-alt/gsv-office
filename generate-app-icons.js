const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logoPath = path.resolve('frontend/src/assets/gsvlogo.png');
console.log('Logo source:', logoPath, 'exists:', fs.existsSync(logoPath));

// Target densities for Android
const targets = [
  { dir: 'e_office_flutter/android/app/src/main/res/mipmap-mdpi', size: 48 },
  { dir: 'e_office_flutter/android/app/src/main/res/mipmap-hdpi', size: 72 },
  { dir: 'e_office_flutter/android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { dir: 'e_office_flutter/android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { dir: 'e_office_flutter/android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
  { dir: 'e_office_flutter/web/icons', size: 192, name: 'Icon-192.png' },
  { dir: 'e_office_flutter/web/icons', size: 512, name: 'Icon-512.png' },
  { dir: 'e_office_flutter/web/icons', size: 192, name: 'Icon-maskable-192.png' },
  { dir: 'e_office_flutter/web/icons', size: 512, name: 'Icon-maskable-512.png' },
  { dir: 'e_office_flutter/web', size: 64, name: 'favicon.png' },
];

// PowerShell script to resize images using System.Drawing
const psScript = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${logoPath.replace(/\\/g, '\\\\')}')
`;

const resizeCommands = targets.map(t => {
  const targetDir = path.resolve(t.dir);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  
  const files = t.name ? [t.name] : ['ic_launcher.png', 'ic_launcher_round.png'];
  return files.map(file => {
    const dest = path.join(targetDir, file).replace(/\\/g, '\\\\');
    return `
$destBmp = New-Object System.Drawing.Bitmap(${t.size}, ${t.size})
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, ${t.size}, ${t.size})
$g.Dispose()
$destBmp.Save('${dest}', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: ${dest} (${t.size}x${t.size})"
`;
  }).join('\n');
}).join('\n');

const fullPsScript = psScript + '\n' + resizeCommands + '\n$src.Dispose()\n';
const scriptFile = path.resolve('generate-icons.ps1');
fs.writeFileSync(scriptFile, fullPsScript, 'utf8');

console.log('Running icon generator script...');
try {
  const out = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptFile}"`, { encoding: 'utf8' });
  console.log(out);
  console.log('✅ App icons successfully generated!');
} catch (err) {
  console.error('Error running script:', err.message);
}
