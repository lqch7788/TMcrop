const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/farm-tasks',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('状态码:', res.statusCode);
    console.log('返回数据:', data.substring(0, 2000));
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
});

req.end();
