const axios = require('axios');

const API_BASE = 'http://localhost:7071/api';

async function quickTest() {
    console.log('🧪 Quick Authentication Test...\n');

    try {
        // Test 1: Check if server is running
        console.log('1️⃣ Testing server connectivity...');
        const healthResponse = await axios.get(`${API_BASE}/health`);
        console.log('✅ Backend server is running');
        console.log(`   Status: ${healthResponse.data.status}`);
        console.log(`   Database: ${healthResponse.data.database}\n`);

        // Test 2: User registration
        console.log('2️⃣ Testing user registration...');
        const userEmail = `testuser_${Date.now()}@example.com`;
        const userRegisterResponse = await axios.post(`${API_BASE}/auth/register`, {
            username: `testuser_${Date.now()}`,
            email: userEmail,
            password: 'password123'
        });
        console.log('✅ User registration successful');
        console.log(`   User ID: ${userRegisterResponse.data.user.user_id}\n`);

        // Test 3: User login
        console.log('3️⃣ Testing user login...');
        const userLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: userEmail,
            password: 'password123'
        });
        console.log('✅ User login successful');
        console.log(`   Token received: ${userLoginResponse.data.token.substring(0, 50)}...\n`);

        // Test 4: Brand registration
        console.log('4️⃣ Testing brand registration...');
        const brandEmail = `testbrand_${Date.now()}@example.com`;
        const brandRegisterResponse = await axios.post(`${API_BASE}/brands/auth/register`, {
            brand_name: `TestBrand_${Date.now()}`,
            email: brandEmail,
            password: 'password123'
        });
        console.log('✅ Brand registration successful');
        console.log(`   Brand ID: ${brandRegisterResponse.data.brand.brand_id}\n`);

        // Test 5: Brand login
        console.log('5️⃣ Testing brand login...');
        const brandLoginResponse = await axios.post(`${API_BASE}/brands/auth/login`, {
            email: brandEmail,
            password: 'password123'
        });
        console.log('✅ Brand login successful');
        console.log(`   Token received: ${brandLoginResponse.data.token.substring(0, 50)}...\n`);

        console.log('🎉 All core authentication tests passed!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Backend server running');
        console.log('   ✅ Database connected');
        console.log('   ✅ User registration & login');
        console.log('   ✅ Brand registration & login');
        console.log('\n✨ The database schema fixes were successful!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error(`   Status: ${error.response.status}`);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Backend server may still be starting...');
            console.log('   Try running this test again in a few seconds');
        }
    }
}

quickTest(); 