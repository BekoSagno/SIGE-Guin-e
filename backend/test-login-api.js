import fetch from 'node-fetch';

async function testLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'mamadou@test.com',
        password: 'password123',
      }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.token) {
      console.log('\n✅ Connexion réussie !');
      console.log('Token:', data.token.substring(0, 50) + '...');
      console.log('User:', data.user);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
