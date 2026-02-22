const http = require('http');

// Test login for school12 teacher
const testLogin = async (email, password) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
};

const testSubjectsAccess = async (token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/subjects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
};

async function main() {
  const testCases = [
    { email: 'school12@gmail.com', password: 'Test@123', role: 'principal' },
    { email: 't3school12@gmail.com', password: 'Test@123', role: 'class_teacher' },
    { email: 't4school12@gmail.com', password: 'Test@123', role: 'teacher' },
  ];

  for (const test of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${test.email} (expected role: ${test.role})`);
    console.log('='.repeat(60));
    
    try {
      const loginResult = await testLogin(test.email, test.password);
      
      // Handle nested response structure
      const token = loginResult.data?.accessToken || loginResult.accessToken || loginResult.access_token;
      const user = loginResult.data?.user || loginResult.user;
      
      if (token) {
        console.log('Login SUCCESS');
        console.log('Role from response:', user?.role);
        console.log('Has subject:view:', user?.permissions?.includes('subject:view') ? 'YES' : 'NO');
        console.log('Permissions count:', user?.permissions?.length || 0);
        
        // Now test subjects access
        console.log('\nTesting GET /subjects...');
        const subjectsResult = await testSubjectsAccess(token);
        console.log('Status:', subjectsResult.status);
        if (subjectsResult.status === 200) {
          console.log('SUCCESS - Can access subjects');
          const count = subjectsResult.data?.data?.data?.length || subjectsResult.data?.data?.items?.length || subjectsResult.data?.data?.length || 0;
          console.log('Subjects count:', count);
        } else {
          console.log('FAILED:', JSON.stringify(subjectsResult.data, null, 2));
        }
      } else if (loginResult.requireRoleSelection) {
        console.log('Multiple roles available:', loginResult.options?.map(o => o.role).join(', '));
      } else {
        console.log('Login FAILED - no token:', JSON.stringify(loginResult, null, 2));
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
