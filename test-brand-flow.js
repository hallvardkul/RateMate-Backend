const axios = require('axios');

const API_BASE = 'http://localhost:7071/api';

async function testBrandFlow() {
  console.log('🧪 Testing Brand Authentication Flow...\n');

  try {
    // Test 1: Register a new brand
    console.log('1️⃣ Testing Brand Registration...');
    const registerData = {
      brand_name: `TestBrand_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    };

    const registerResponse = await axios.post(`${API_BASE}/brands/auth/register`, registerData);
    console.log('✅ Brand registered successfully');
    console.log(`   Brand ID: ${registerResponse.data.brand.brand_id}`);
    console.log(`   Brand Name: ${registerResponse.data.brand.brand_name}\n`);

    // Test 2: Login with the new brand
    console.log('2️⃣ Testing Brand Login...');
    const loginResponse = await axios.post(`${API_BASE}/brands/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });
    console.log('✅ Brand login successful');
    console.log(`   Token received: ${loginResponse.data.token.substring(0, 50)}...\n`);

    const token = loginResponse.data.token;

    // Test 3: Access brand dashboard
    console.log('3️⃣ Testing Brand Dashboard...');
    const dashboardResponse = await axios.get(`${API_BASE}/brands/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard accessed successfully');
    console.log(`   Total Products: ${dashboardResponse.data.stats.total_products}`);
    console.log(`   Total Reviews: ${dashboardResponse.data.stats.total_reviews}\n`);

    // Test 4: Create a product
    console.log('4️⃣ Testing Product Creation...');
    const productData = {
      product_name: `Test Product ${Date.now()}`,
      product_category: 'Electronics',
      description: 'A test product for demonstration'
    };

    const productResponse = await axios.post(`${API_BASE}/brands/products`, productData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Product created successfully');
    console.log(`   Product ID: ${productResponse.data.product.product_id}`);
    console.log(`   Product Name: ${productResponse.data.product.product_name}\n`);

    // Test 5: Get brand's products
    console.log('5️⃣ Testing Get Brand Products...');
    const productsResponse = await axios.get(`${API_BASE}/brands/dashboard/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Brand products retrieved successfully');
    console.log(`   Number of products: ${productsResponse.data.products?.length || 0}\n`);

    // Test 6: Updated dashboard stats
    console.log('6️⃣ Testing Updated Dashboard Stats...');
    const updatedDashboardResponse = await axios.get(`${API_BASE}/brands/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Updated dashboard accessed successfully');
    console.log(`   Total Products: ${updatedDashboardResponse.data.stats.total_products}`);
    console.log(`   Recent Products: ${updatedDashboardResponse.data.recent_products.length}\n`);

    console.log('🎉 All tests passed! Brand authentication and dashboard are working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testBrandFlow(); 