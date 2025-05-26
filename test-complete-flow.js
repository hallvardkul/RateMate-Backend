const axios = require('axios');

const API_BASE = 'http://localhost:7071/api';

async function testCompleteFlow() {
    console.log('🧪 Testing Complete Authentication Flow...\n');

    try {
        // Test 1: Register a new user
        console.log('1️⃣ Testing User Registration...');
        const userRegisterData = {
            username: `testuser_${Date.now()}`,
            email: `testuser_${Date.now()}@example.com`,
            password: 'password123'
        };

        const userRegisterResponse = await axios.post(`${API_BASE}/auth/register`, userRegisterData);
        console.log('✅ User registered successfully');
        console.log(`   User ID: ${userRegisterResponse.data.user.user_id}`);
        console.log(`   Username: ${userRegisterResponse.data.user.username}\n`);

        // Test 2: Login as user
        console.log('2️⃣ Testing User Login...');
        const userLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: userRegisterData.email,
            password: userRegisterData.password
        });
        console.log('✅ User login successful');
        console.log(`   Token received: ${userLoginResponse.data.token.substring(0, 50)}...\n`);

        const userToken = userLoginResponse.data.token;

        // Test 3: Register a new brand
        console.log('3️⃣ Testing Brand Registration...');
        const brandRegisterData = {
            brand_name: `TestBrand_${Date.now()}`,
            email: `testbrand_${Date.now()}@example.com`,
            password: 'password123'
        };

        const brandRegisterResponse = await axios.post(`${API_BASE}/brands/auth/register`, brandRegisterData);
        console.log('✅ Brand registered successfully');
        console.log(`   Brand ID: ${brandRegisterResponse.data.brand.brand_id}`);
        console.log(`   Brand Name: ${brandRegisterResponse.data.brand.brand_name}\n`);

        // Test 4: Login as brand
        console.log('4️⃣ Testing Brand Login...');
        const brandLoginResponse = await axios.post(`${API_BASE}/brands/auth/login`, {
            email: brandRegisterData.email,
            password: brandRegisterData.password
        });
        console.log('✅ Brand login successful');
        console.log(`   Token received: ${brandLoginResponse.data.token.substring(0, 50)}...\n`);

        const brandToken = brandLoginResponse.data.token;

        // Test 5: Get brand dashboard
        console.log('5️⃣ Testing Brand Dashboard...');
        const dashboardResponse = await axios.get(`${API_BASE}/brands/dashboard`, {
            headers: { Authorization: `Bearer ${brandToken}` }
        });
        console.log('✅ Brand dashboard accessed');
        console.log(`   Verification Status: ${dashboardResponse.data.brand.is_verified ? 'Verified' : 'Not Verified'}`);
        console.log(`   Total Products: ${dashboardResponse.data.stats.total_products}\n`);

        // Test 6: Check brand verification status
        console.log('6️⃣ Testing Brand Verification Status...');
        const verificationStatusResponse = await axios.get(`${API_BASE}/brands/verification/status`, {
            headers: { Authorization: `Bearer ${brandToken}` }
        });
        console.log('✅ Brand verification status retrieved');
        console.log(`   Status: ${verificationStatusResponse.data.verification_status}`);
        console.log(`   Next Steps: ${verificationStatusResponse.data.next_steps}\n`);

        // Test 7: Submit brand verification
        console.log('7️⃣ Testing Brand Verification Submission...');
        const verificationSubmissionResponse = await axios.post(`${API_BASE}/brands/verification/submit`, {
            business_registration: 'REG12345',
            website: 'https://example.com',
            social_media: '@testbrand',
            additional_info: 'We are a legitimate test brand'
        }, {
            headers: { Authorization: `Bearer ${brandToken}` }
        });
        console.log('✅ Brand verification submitted');
        console.log(`   Status: ${verificationSubmissionResponse.data.status}\n`);

        // Test 8: Create a product as brand
        console.log('8️⃣ Testing Product Creation...');
        const productResponse = await axios.post(`${API_BASE}/brands/products`, {
            product_name: `Test Product ${Date.now()}`,
            product_category: 'Electronics',
            description: 'A comprehensive test product'
        }, {
            headers: { Authorization: `Bearer ${brandToken}` }
        });
        console.log('✅ Product created successfully');
        console.log(`   Product ID: ${productResponse.data.product.product_id}`);
        console.log(`   Product Name: ${productResponse.data.product.product_name}\n`);

        // Test 9: Get updated dashboard with new product
        console.log('9️⃣ Testing Updated Dashboard...');
        const updatedDashboardResponse = await axios.get(`${API_BASE}/brands/dashboard`, {
            headers: { Authorization: `Bearer ${brandToken}` }
        });
        console.log('✅ Updated dashboard retrieved');
        console.log(`   Total Products: ${updatedDashboardResponse.data.stats.total_products}`);
        console.log(`   Recent Products: ${updatedDashboardResponse.data.recent_products.length}\n`);

        // Test 10: Admin view of pending verifications
        console.log('🔟 Testing Admin Pending Verifications...');
        const pendingVerificationsResponse = await axios.get(`${API_BASE}/admin/brands/verification/pending`);
        console.log('✅ Pending verifications retrieved');
        console.log(`   Pending Count: ${pendingVerificationsResponse.data.count}\n`);

        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   ✅ User Registration & Login`);
        console.log(`   ✅ Brand Registration & Login`);
        console.log(`   ✅ Brand Dashboard Access`);
        console.log(`   ✅ Brand Verification System`);
        console.log(`   ✅ Product Creation`);
        console.log(`   ✅ Admin Verification Management`);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error(`   Status: ${error.response.status}`);
        }
    }
}

testCompleteFlow(); 