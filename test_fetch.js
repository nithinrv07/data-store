const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/records',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Fetching all records...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Response received:');
    console.log('Status:', res.statusCode);
    
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('\n✅ Records retrieved successfully!');
        console.log('Total records:', parsed.count);
        parsed.records.forEach((r, i) => {
          console.log(`\n  Record ${i + 1}:`);
          console.log(`    ID: ${r._id}`);
          console.log(`    Name: ${r.name}`);
          console.log(`    DOB: ${r.dob}`);
          console.log(`    Email: ${r.email}`);
        });
      } else {
        console.log('\n❌ Error:', parsed.message);
      }
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
