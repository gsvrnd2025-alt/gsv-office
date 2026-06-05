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

    // Now call users/directory
    const dirReq = http.request({
      hostname: '192.168.0.177',
      port: 8080,
      path: '/api/users/directory',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (dirRes) => {
      let dirBody = '';
      dirRes.on('data', chunk => dirBody += chunk);
      dirRes.on('end', () => {
        console.log('Directory Response Status:', dirRes.statusCode);
        console.log('Directory Data:', JSON.stringify(JSON.parse(dirBody), null, 2));
      });
    });
    dirReq.end();
  });
});

req.write(loginPayload);
req.end();
