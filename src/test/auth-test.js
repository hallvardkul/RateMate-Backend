// Simple test script for authentication and user profile endpoints
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:7074/api';
let authToken = '';

// Test user credentials
const testUser = {
  username: 'testuser_' + Date.now(),
  email: `testuser_${Date.now()}@example.com`,
  password: 'Password123!'
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
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    throw error;
  }
}

// Test functions
async function testRegister() {
  console.log('\n--- Testing User Registration ---');
  console.log('Test user:', testUser);
  
  try {
    const result = await apiRequest('auth/register', 'POST', testUser);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 201) {
      console.log('✅ Registration successful');
      return true;
    } else {
      console.log('❌ Registration failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Registration failed due to connection error');
    return false;
  }
}

async function testLogin() {
  console.log('\n--- Testing User Login ---');
  
  const credentials = {
    email: testUser.email,
    password: testUser.password
  };
  
  try {
    const result = await apiRequest('auth/login', 'POST', credentials);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.token) {
      authToken = result.data.token;
      console.log('✅ Login successful');
      console.log('Token received:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Login failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Login failed due to connection error');
    return false;
  }
}

async function testGetProfile() {
  console.log('\n--- Testing Get User Profile ---');
  
  try {
    // First try without token
    console.log('Testing without authentication token:');
    let result = await apiRequest('user/profile');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 401) {
      console.log('✅ Correctly rejected unauthenticated request');
    } else {
      console.log('❌ Failed to reject unauthenticated request');
    }
    
    // Then try with token
    console.log('\nTesting with authentication token:');
    result = await apiRequest('user/profile', 'GET', null, authToken);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.profile) {
      console.log('✅ Successfully retrieved user profile');
      return true;
    } else {
      console.log('❌ Failed to retrieve user profile');
      return false;
    }
  } catch (error) {
    console.log('❌ Profile test failed due to connection error');
    return false;
  }
}

async function testUpdateProfile() {
  console.log('\n--- Testing Update User Profile ---');
  
  const updates = {
    username: `updated_${testUser.username}`
  };
  
  try {
    const result = await apiRequest('user/profile', 'PUT', updates, authToken);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 && result.data.profile.username === updates.username) {
      console.log('✅ Successfully updated user profile');
      return true;
    } else {
      console.log('❌ Failed to update user profile');
      return false;
    }
  } catch (error) {
    console.log('❌ Update profile test failed due to connection error');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== Starting API Tests ===');
  console.log(`Base URL: ${API_BASE_URL}`);
  
  try {
    // Check if server is running
    try {
      await fetch(`${API_BASE_URL}/auth/register`);
      console.log('✅ Server is reachable');
    } catch (error) {
      console.error('❌ Cannot connect to server. Make sure Azure Functions is running on port 7074.');
      console.error('   Run: npm run build && func start --port 7074');
      return;
    }
    
    // Register a new user
    const registerSuccess = await testRegister();
    if (!registerSuccess) {
      console.log('❌ Stopping tests: Registration failed');
      return;
    }
    
    // Login with the new user
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('❌ Stopping tests: Login failed');
      return;
    }
    
    // Get user profile
    const getProfileSuccess = await testGetProfile();
    if (!getProfileSuccess) {
      console.log('❌ Get profile test failed');
    }
    
    // Update user profile
    const updateProfileSuccess = await testUpdateProfile();
    if (!updateProfileSuccess) {
      console.log('❌ Update profile test failed');
    }
    
    console.log('\n=== Tests Completed ===');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 