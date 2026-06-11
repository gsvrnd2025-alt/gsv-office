const http = require('http');

const payload = JSON.stringify({
  loginId: 'admin@gsv.local',
  password: 'Admin@GSV2024'
});

const loginReq = http.request({
  host: '192.168.0.177',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      console.error('Login failed:', res.statusCode, body);
      return;
    }
    const data = JSON.parse(body);
    console.log('Login response data:', data);
    const token = data.data?.accessToken || data.accessToken || data.token || data.access_token;
    console.log('Login successful! Access token obtained:', token);
    testDownload(token);
  });
});

loginReq.on('error', (e) => console.error('Login error:', e));
loginReq.write(payload);
loginReq.end();

function testDownload(token) {
  // We can test one of the folder IDs that failed: e04b095c-e648-441b-a3a2-ac24c316bf45
  const folderId = 'e04b095c-e648-441b-a3a2-ac24c316bf45';
  console.log(`Testing download for folder ID: ${folderId}`);
  
  const req = http.request({
    host: '192.168.0.177',
    port: 8080,
    path: `/api/files/folders/${folderId}/download`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    console.log(`Download response status: ${res.statusCode}`);
    console.log('Headers:', res.headers);
    let body = '';
    res.on('data', chunk => {
      // If it's a 500, we want to print the JSON error. If it's zip, we don't want to print binary.
      if (res.headers['content-type']?.includes('application/json')) {
        body += chunk;
      }
    });
    res.on('end', () => {
      if (body) {
        console.log('Response body:', body);
      } else {
        console.log('Zip file download initiated successfully!');
      }
    });
  });

  req.on('error', (e) => console.error('Download error:', e));
  req.end();
}
