/**
 * Icon Generator — creates simple colored icons for the tray
 * Run: node generate-icons.js
 */
const fs = require('fs');
const path = require('path');

// Create assets directory
const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// We'll generate simple SVG icons and convert them
// For now, create placeholder PNG using raw bytes (1x1 colored pixels scaled)

// Simple 16x16 PNG for tray — uses raw PNG header
// We'll use a cross-platform approach with Canvas if available, else fallback to copying

function createColoredSVG(color, size = 64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect rx="${size * 0.2}" width="${size}" height="${size}" fill="url(#g)"/>
  <text x="50%" y="54%" font-size="${size * 0.55}" font-family="Arial" fill="white" 
        text-anchor="middle" dominant-baseline="middle">🏢</text>
</svg>`;
}

// Save SVGs (Electron can use SVG for some icons)
fs.writeFileSync(path.join(assetsDir, 'icon-online.svg'), createColoredSVG('#22c55e'));
fs.writeFileSync(path.join(assetsDir, 'icon-offline.svg'), createColoredSVG('#ef4444'));
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), createColoredSVG('#6366f1'));

console.log('SVG icons created in assets/');
console.log('NOTE: For production, replace with proper .ico and .png files.');
console.log('      Use a tool like https://icoconvert.com to convert.');
