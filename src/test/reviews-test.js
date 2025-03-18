const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:7074/api';
const TEST_USER = {
    username: `testuser_${Date.now()}`,
    email: `testuser_${Date.now()}@example.com`,
    password: 'Password123!'
};
let authToken = null;
let userId = null;
let productId = 1; // Assuming product with ID 1 exists
let reviewId = null;
let commentId = null;

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
    
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        console.error(`Error in ${method} request to ${endpoint}:`, error);
        return { status: 500, data: { error: error.message } };
    }
}

// Test server availability
async function testServerAvailability() {
    try {
        await fetch(API_BASE_URL);
        console.log('Server is reachable');
        return true;
    } catch (error) {
        console.error('Server is not reachable:', error.message);
        return false;
    }
}

// Register a test user
async function registerTestUser() {
    console.log(`\nRegistering test user: ${TEST_USER.username}`);
    const { status, data } = await apiRequest('auth/register', 'POST', TEST_USER);
    console.log(`Registration status: ${status}`);
    console.log('Registration response:', data);
    
    if (status === 201 && data.user_id) {
        userId = data.user_id;
        console.log(`User registered with ID: ${userId}`);
        return true;
    }
    return false;
}

// Login with test user
async function loginTestUser() {
    console.log(`\nLogging in as: ${TEST_USER.email}`);
    const { status, data } = await apiRequest('auth/login', 'POST', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });
    
    console.log(`Login status: ${status}`);
    
    if (status === 200 && data.token) {
        authToken = data.token;
        console.log('Login successful, received token');
        return true;
    }
    
    console.log('Login response:', data);
    return false;
}

// Test creating a review
async function testCreateReview() {
    console.log('\nTesting review creation');
    
    // First try without authentication
    let { status, data } = await apiRequest('reviews', 'POST', {
        product_id: productId,
        title: 'Test Review',
        content: 'This is a test review content',
        rating: 4
    });
    
    console.log(`Create review without auth status: ${status}`);
    console.log('Response:', data);
    
    // Now try with authentication
    ({ status, data } = await apiRequest('reviews', 'POST', {
        product_id: productId,
        title: 'Test Review',
        content: 'This is a test review content',
        rating: 4
    }, authToken));
    
    console.log(`Create review with auth status: ${status}`);
    console.log('Response:', data);
    
    if (status === 201 && data.review_id) {
        reviewId = data.review_id;
        console.log(`Review created with ID: ${reviewId}`);
        return true;
    }
    return false;
}

// Test getting reviews for a product
async function testGetReviews() {
    console.log('\nTesting get reviews for product');
    
    const { status, data } = await apiRequest(`reviews?productId=${productId}`);
    
    console.log(`Get reviews status: ${status}`);
    console.log('Reviews:', data);
    
    return status === 200;
}

// Test updating a review
async function testUpdateReview() {
    console.log('\nTesting review update');
    
    const { status, data } = await apiRequest(`reviews/${reviewId}`, 'PUT', {
        title: 'Updated Test Review',
        content: 'This is an updated test review content',
        rating: 5
    }, authToken);
    
    console.log(`Update review status: ${status}`);
    console.log('Updated review:', data);
    
    return status === 200;
}

// Test creating a comment
async function testCreateComment() {
    console.log('\nTesting comment creation');
    
    // First try without authentication
    let { status, data } = await apiRequest('comments', 'POST', {
        review_id: reviewId,
        content: 'This is a test comment'
    });
    
    console.log(`Create comment without auth status: ${status}`);
    console.log('Response:', data);
    
    // Now try with authentication
    ({ status, data } = await apiRequest('comments', 'POST', {
        review_id: reviewId,
        content: 'This is a test comment'
    }, authToken));
    
    console.log(`Create comment with auth status: ${status}`);
    console.log('Response:', data);
    
    if (status === 201 && data.comment_id) {
        commentId = data.comment_id;
        console.log(`Comment created with ID: ${commentId}`);
        return true;
    }
    return false;
}

// Test getting comments for a review
async function testGetComments() {
    console.log('\nTesting get comments for review');
    
    const { status, data } = await apiRequest(`comments?reviewId=${reviewId}`);
    
    console.log(`Get comments status: ${status}`);
    console.log('Comments:', data);
    
    return status === 200;
}

// Test creating a reply to a comment
async function testCreateReply() {
    console.log('\nTesting reply creation');
    
    const { status, data } = await apiRequest('comments', 'POST', {
        review_id: reviewId,
        parent_comment_id: commentId,
        content: 'This is a reply to the test comment'
    }, authToken);
    
    console.log(`Create reply status: ${status}`);
    console.log('Response:', data);
    
    return status === 201;
}

// Test getting replies to a comment
async function testGetReplies() {
    console.log('\nTesting get replies for comment');
    
    const { status, data } = await apiRequest(`comments?parentId=${commentId}`);
    
    console.log(`Get replies status: ${status}`);
    console.log('Replies:', data);
    
    return status === 200;
}

// Test updating a comment
async function testUpdateComment() {
    console.log('\nTesting comment update');
    
    const { status, data } = await apiRequest(`comments/${commentId}`, 'PUT', {
        content: 'This is an updated test comment'
    }, authToken);
    
    console.log(`Update comment status: ${status}`);
    console.log('Updated comment:', data);
    
    return status === 200;
}

// Test deleting a review (should fail if there are comments)
async function testDeleteReviewWithComments() {
    console.log('\nTesting delete review with comments (should fail)');
    
    const { status, data } = await apiRequest(`reviews/${reviewId}`, 'DELETE', null, authToken);
    
    console.log(`Delete review status: ${status}`);
    console.log('Response:', data);
    
    return status !== 200; // Should not be 200 if there are comments
}

// Test deleting a comment
async function testDeleteComment() {
    console.log('\nTesting comment deletion');
    
    const { status, data } = await apiRequest(`comments/${commentId}`, 'DELETE', null, authToken);
    
    console.log(`Delete comment status: ${status}`);
    console.log('Response:', data);
    
    return status === 200;
}

// Test deleting a review
async function testDeleteReview() {
    console.log('\nTesting review deletion');
    
    const { status, data } = await apiRequest(`reviews/${reviewId}`, 'DELETE', null, authToken);
    
    console.log(`Delete review status: ${status}`);
    console.log('Response:', data);
    
    return status === 200;
}

// Run all tests
async function runTests() {
    console.log('Starting API tests...');
    console.log(`API Base URL: ${API_BASE_URL}`);
    
    // Check if server is available
    if (!await testServerAvailability()) {
        console.error('Cannot reach the server. Make sure it is running.');
        return;
    }
    
    // Register and login
    if (!await registerTestUser()) {
        console.error('Failed to register test user. Aborting tests.');
        return;
    }
    
    if (!await loginTestUser()) {
        console.error('Failed to login. Aborting tests.');
        return;
    }
    
    // Run review tests
    if (!await testCreateReview()) {
        console.error('Failed to create review. Aborting tests.');
        return;
    }
    
    await testGetReviews();
    await testUpdateReview();
    
    // Run comment tests
    if (!await testCreateComment()) {
        console.error('Failed to create comment. Aborting tests.');
        return;
    }
    
    await testGetComments();
    await testCreateReply();
    await testGetReplies();
    await testUpdateComment();
    
    // Test deletion
    await testDeleteReviewWithComments();
    await testDeleteComment();
    await testDeleteReview();
    
    console.log('\nAll tests completed!');
}

// Run the tests
runTests().catch(error => {
    console.error('Error running tests:', error);
}); 