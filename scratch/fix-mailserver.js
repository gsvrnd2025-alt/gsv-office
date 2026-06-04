const { Client } = require('C:/Users/GSVPC_F2/Documents/A gsv office plugin/backend/node_modules/ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection Ready. Executing setup commands...');
  
  // Running command to add email accounts
  conn.exec('docker exec gsv_mailserver setup email add admin@gsv.local mail_password', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Add admin@gsv.local exited with code ' + code);
      
      conn.exec('docker exec gsv_mailserver setup email add vijay001@gsv.local mail_password', (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('close', (code2) => {
          console.log('Add vijay001@gsv.local exited with code ' + code2);
          
          conn.exec('docker exec gsv_mailserver setup email add testreg@gsv.local mail_password', (err3, stream3) => {
            if (err3) throw err3;
            stream3.on('close', (code3) => {
              console.log('Add testreg@gsv.local exited with code ' + code3);
              conn.end();
            });
            stream3.on('data', (d) => console.log(d.toString()));
            stream3.stderr.on('data', (d) => console.error(d.toString()));
          });
        });
        stream2.on('data', (d) => console.log(d.toString()));
        stream2.stderr.on('data', (d) => console.error(d.toString()));
      });
    });
    stream.on('data', (d) => console.log(d.toString()));
    stream.stderr.on('data', (d) => console.error(d.toString()));
  });
}).connect({
  host: '192.168.0.177',
  port: 22,
  username: 'root',
  password: 'Gsv@2018'
});
