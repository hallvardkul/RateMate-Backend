const fetch = require('node-fetch');

// Configuration
const baseUrl = 'http://localhost:7073/api';
let authToken = null;
let testUserId = null;
let testCategoryId = null;
let testSubcategoryId = null;

// Test user details
const timestamp = Date.now();
const testUser = {
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@example.com`,
    password: 'Password123!',
    is_admin: true
};

// Helper function for API requests
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    console.log(`Making ${method} request to ${endpoint}`);
    const response = await fetch(`${baseUrl}/${endpoint}`, options);
    const responseData = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(responseData, null, 2)}`);
    
    return { status: response.status, data: responseData };
}

// Test server availability
async function testServerAvailability() {
    console.log('=== Starting API Tests ===');
    console.log(`Base URL: ${baseUrl}`);
    
    try {
        await fetch(baseUrl);
        console.log('✅ Server is reachable');
    } catch (error) {
        console.error('❌ Server is not reachable:', error.message);
        process.exit(1);
    }
}

// Register a test admin user
async function registerTestAdmin() {
    console.log('\n--- Testing Admin User Registration ---');
    console.log(`Test user: ${JSON.stringify(testUser)}`);
    
    const { status, data } = await apiRequest('auth/register', 'POST', testUser);
    
    if (status === 201) {
        console.log('✅ Registration successful');
        testUserId = data.user.user_id;
    } else {
        console.error('❌ Registration failed');
    }
}

// Login with test admin user
async function loginTestAdmin() {
    console.log('\n--- Testing Admin User Login ---');
    
    const { status, data } = await apiRequest('auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password
    });
    
    if (status === 200 && data.token) {
        console.log('✅ Login successful');
        authToken = data.token;
    } else {
        console.error('❌ Login failed');
        process.exit(1);
    }
}

// Test getting all categories
async function testGetCategories() {
    console.log('\n--- Testing Get All Categories ---');
    
    const { status, data } = await apiRequest('categories');
    
    if (status === 200 && Array.isArray(data)) {
        console.log('✅ Successfully retrieved categories');
        console.log(`Found ${data.length} categories`);
    } else {
        console.error('❌ Failed to retrieve categories');
    }
}

// Test creating a category
async function testCreateCategory() {
    console.log('\n--- Testing Create Category ---');
    
    const categoryData = {
        category_name: `Test Category ${timestamp}`,
        description: "This is a test category created by the test script"
    };
    
    const { status, data } = await apiRequest('categories', 'POST', categoryData, authToken);
    
    if (status === 201) {
        console.log('✅ Successfully created category');
        testCategoryId = data.category_id;
    } else {
        console.error('❌ Failed to create category');
    }
}

// Test getting a category by ID
async function testGetCategoryById() {
    console.log('\n--- Testing Get Category By ID ---');
    
    if (!testCategoryId) {
        console.error('❌ No category ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`categories/${testCategoryId}`);
    
    if (status === 200) {
        console.log('✅ Successfully retrieved category');
    } else {
        console.error('❌ Failed to retrieve category');
    }
}

// Test updating a category
async function testUpdateCategory() {
    console.log('\n--- Testing Update Category ---');
    
    if (!testCategoryId) {
        console.error('❌ No category ID available for testing');
        return;
    }
    
    const updateData = {
        description: "This is an updated description for the test category"
    };
    
    const { status, data } = await apiRequest(`categories/${testCategoryId}`, 'PUT', updateData, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully updated category');
    } else {
        console.error('❌ Failed to update category');
    }
}

// Test creating a subcategory
async function testCreateSubcategory() {
    console.log('\n--- Testing Create Subcategory ---');
    
    if (!testCategoryId) {
        console.error('❌ No category ID available for testing');
        return;
    }
    
    const subcategoryData = {
        parent_category_id: testCategoryId,
        subcategory_name: `Test Subcategory ${timestamp}`,
        description: "This is a test subcategory created by the test script"
    };
    
    const { status, data } = await apiRequest('subcategories', 'POST', subcategoryData, authToken);
    
    if (status === 201) {
        console.log('✅ Successfully created subcategory');
        testSubcategoryId = data.subcategory_id;
    } else {
        console.error('❌ Failed to create subcategory');
    }
}

// Test getting subcategories by category
async function testGetSubcategoriesByCategory() {
    console.log('\n--- Testing Get Subcategories By Category ---');
    
    if (!testCategoryId) {
        console.error('❌ No category ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`categories/${testCategoryId}/subcategories`);
    
    if (status === 200 && Array.isArray(data)) {
        console.log('✅ Successfully retrieved subcategories');
        console.log(`Found ${data.length} subcategories`);
    } else {
        console.error('❌ Failed to retrieve subcategories');
    }
}

// Test getting a subcategory by ID
async function testGetSubcategoryById() {
    console.log('\n--- Testing Get Subcategory By ID ---');
    
    if (!testSubcategoryId) {
        console.error('❌ No subcategory ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`subcategories/${testSubcategoryId}`);
    
    if (status === 200) {
        console.log('✅ Successfully retrieved subcategory');
    } else {
        console.error('❌ Failed to retrieve subcategory');
    }
}

// Test updating a subcategory
async function testUpdateSubcategory() {
    console.log('\n--- Testing Update Subcategory ---');
    
    if (!testSubcategoryId) {
        console.error('❌ No subcategory ID available for testing');
        return;
    }
    
    const updateData = {
        description: "This is an updated description for the test subcategory"
    };
    
    const { status, data } = await apiRequest(`subcategories/${testSubcategoryId}`, 'PUT', updateData, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully updated subcategory');
    } else {
        console.error('❌ Failed to update subcategory');
    }
}

// Test deleting a subcategory
async function testDeleteSubcategory() {
    console.log('\n--- Testing Delete Subcategory ---');
    
    if (!testSubcategoryId) {
        console.error('❌ No subcategory ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`subcategories/${testSubcategoryId}`, 'DELETE', null, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully deleted subcategory');
    } else {
        console.error('❌ Failed to delete subcategory');
    }
}

// Test deleting a category
async function testDeleteCategory() {
    console.log('\n--- Testing Delete Category ---');
    
    if (!testCategoryId) {
        console.error('❌ No category ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`categories/${testCategoryId}`, 'DELETE', null, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully deleted category');
    } else {
        console.error('❌ Failed to delete category');
    }
}

// Run all tests
async function runTests() {
    try {
        await testServerAvailability();
        await registerTestAdmin();
        await loginTestAdmin();
        await testGetCategories();
        await testCreateCategory();
        await testGetCategoryById();
        await testUpdateCategory();
        await testCreateSubcategory();
        await testGetSubcategoriesByCategory();
        await testGetSubcategoryById();
        await testUpdateSubcategory();
        await testDeleteSubcategory();
        await testDeleteCategory();
        
        console.log('\n=== All Tests Completed ===');
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

// Run the tests
runTests(); 