const fs = require('fs');
const code = fs.readFileSync('frontend/public/internship/admin.html', 'utf8');
const regex = /google\.script\.run(?:\s*\.\s*withSuccessHandler\s*\([^)]*\))?(?:\s*\.\s*withFailureHandler\s*\([^)]*\))?\s*\.\s*([a-zA-Z0-9_]+)/g;
let match;
const matches = [];
while ((match = regex.exec(code)) !== null) {
  matches.push(match[1]);
}
console.log([...new Set(matches)].sort().join('\n'));
