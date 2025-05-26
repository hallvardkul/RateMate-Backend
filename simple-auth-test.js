const axios = require('axios');

const API_BASE = 'http://localhost:7071/api';

async function testAuth() {
    console.log('🧪 Testing Authentication (Skip Health Check)...\n');

    try {
        // Test user registration directly
        console.log('1️⃣ Testing user registration...');
        const userEmail = `testuser_${Date.now()}@example.com`;
        const userRegisterResponse = await axios.post(`${API_BASE}/auth/register`, {
            username: `testuser_${Date.now()}`,
            email: userEmail,
            password: 'password123'
        });
        console.log('✅ User registration successful');
        console.log(`   User ID: ${userRegisterResponse.data.user.user_id}`);
        console.log(`   User Type: ${userRegisterResponse.data.user.user_type}\n`);

        // Test user login
        console.log('2️⃣ Testing user login...');
        const userLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: userEmail,
            password: 'password123'
        });
        console.log('✅ User login successful');
        console.log(`   Token received: ${userLoginResponse.data.token.substring(0, 50)}...\n`);

        console.log('🎉 User authentication is working perfectly!');
        console.log('✨ The database schema fixes were successful!');

    } catch (error) {
        console.error('❌ Authentication test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error(`   Status: ${error.response.status}`);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Backend server is not running');
            console.log('   Please start the backend with: func start');
        }
    }
}

testAuth(); 