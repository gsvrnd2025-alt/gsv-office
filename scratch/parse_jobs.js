const fs = require('fs');
let content = fs.readFileSync('scratch/jobs2.json', 'utf16le');
if (!content.includes('[')) {
  content = fs.readFileSync('scratch/jobs2.json', 'utf8');
}
const jsonStartIndex = content.indexOf('[');
if (jsonStartIndex === -1) {
  console.error('No JSON array found in jobs2.json');
  process.exit(1);
}
const jsonContent = content.substring(jsonStartIndex);
const jobs = JSON.parse(jsonContent);
const appJobs = jobs.filter(j => j.method && j.method.includes('app.'));
console.log('App jobs:');
for (const j of appJobs.slice(0, 15)) {
  console.log(`ID: ${j.id}, Method: ${j.method}, State: ${j.state}, Error: ${j.error ? JSON.stringify(j.error) : 'None'}`);
}
