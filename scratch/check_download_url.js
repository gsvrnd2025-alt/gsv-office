const http = require('http');

const urls = [
  'http://192.168.0.177:8080/downloads/GSVOffice-Android.apk',
  'http://192.168.0.177:8080/downloads/GSVOffice-Windows.zip'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    console.log(`Checking URL: ${url}`);
    const req = http.request(url, { method: 'HEAD' }, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Content-Length: ${res.headers['content-length']}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log('---');
      resolve(res.statusCode === 200);
    });
    req.on('error', (e) => {
      console.error(`Error checking ${url}:`, e.message);
      resolve(false);
    });
    req.end();
  });
}

async function run() {
  for (const url of urls) {
    await checkUrl(url);
  }
}

run();
