const http = require('http');

const loginPayload = JSON.stringify({
  loginId: 'admin@gsv.local',
  password: 'Admin@GSV2024'
});

const req = http.request({
  hostname: '192.168.0.177',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginPayload.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Login Response Status:', res.statusCode);
    const loginData = JSON.parse(body);
    const token = loginData.data?.accessToken || loginData.accessToken;
    if (!token) {
      console.error('Failed to get token:', loginData);
      return;
    }
    console.log('Got Access Token!');

    // 1. Call users/sync-sheets
    console.log('\n--- Testing e-Office Users Sync ---');
    const syncReq = http.request({
      hostname: '192.168.0.177',
      port: 8080,
      path: '/api/users/sync-sheets',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (syncRes) => {
      let syncBody = '';
      syncRes.on('data', chunk => syncBody += chunk);
      syncRes.on('end', () => {
        console.log('Sync Users Response Status:', syncRes.statusCode);
        try {
          console.log('Sync Users Data:', JSON.stringify(JSON.parse(syncBody), null, 2));
        } catch (e) {
          console.log('Sync Users Raw Response:', syncBody);
        }
        
        // 2. Call internship/run with syncGoogleSheets
        testInternshipSync(token);
      });
    });
    syncReq.end();
  });
});

req.write(loginPayload);
req.end();

function testInternshipSync(token) {
  console.log('\n--- Testing Internship Portal Sync ---');
  const payload = JSON.stringify({
    functionName: 'syncGoogleSheets',
    arguments: []
  });
  
  const req = http.request({
    hostname: '192.168.0.177',
    port: 8080,
    path: '/api/internship/run',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Internship Sync Response Status:', res.statusCode);
      try {
        console.log('Internship Sync Data:', JSON.stringify(JSON.parse(body), null, 2));
      } catch (e) {
        console.log('Internship Sync Raw Response:', body);
      }
    });
  });
  
  req.write(payload);
  req.end();
}
