const http = require('http');

const recordData = {
  name: 'Test Person',
  dob: '1990-06-15',
  address: '789 Test Road',
  email: 'test@example.com',
  phone: '5555555555'
};

const postData = JSON.stringify(recordData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/records',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Sending POST request to add record...');
console.log('Payload:', recordData);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Response received:');
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
    
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('\n✅ Record added successfully!');
        console.log('Record ID:', parsed.record._id);
      } else {
        console.log('\n❌ Error:', parsed.message || parsed.errors);
      }
    } catch (e) {
      console.log('Error parsing response');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();
