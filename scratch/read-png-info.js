const fs = require('fs');
const pngPath = 'C:/Users/GSVPC_F2/.gemini/antigravity/brain/416f0a4a-184e-4c37-a4ad-7a087b6c31d7/gsv_office_icon_1780533757908.png';
const buffer = fs.readFileSync(pngPath);

console.log('Magic Bytes:', buffer.slice(0, 16).toString('hex'));
console.log('Size in bytes:', buffer.length);
