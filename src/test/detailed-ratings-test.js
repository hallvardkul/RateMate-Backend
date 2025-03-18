const fetch = require('node-fetch');

// Configuration
const baseUrl = 'http://localhost:7073/api';
let authToken = null;
let testUserId = null;
let testReviewId = null;

// Test user details
const timestamp = Date.now();
const testUser = {
    username: `testuser_${timestamp}`,
    email: `testuser_${timestamp}@example.com`,
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

// Register a test user
async function registerTestUser() {
    console.log('\n--- Testing User Registration ---');
    console.log(`Test user: ${JSON.stringify(testUser)}`);
    
    const { status, data } = await apiRequest('auth/register', 'POST', testUser);
    
    if (status === 201) {
        console.log('✅ Registration successful');
        testUserId = data.user.user_id;
    } else {
        console.error('❌ Registration failed');
    }
}

// Login with test user
async function loginTestUser() {
    console.log('\n--- Testing User Login ---');
    
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

// Get rating categories
async function testGetRatingCategories() {
    console.log('\n--- Testing Get Rating Categories ---');
    
    const { status, data } = await apiRequest('reviews?categoriesOnly=true', 'GET');
    
    if (status === 200 && Array.isArray(data)) {
        console.log('✅ Successfully retrieved rating categories');
        console.log(`Found ${data.length} categories`);
    } else {
        console.error('❌ Failed to retrieve rating categories');
    }
}

// Create a review with detailed ratings
async function testCreateReviewWithDetailedRatings() {
    console.log('\n--- Testing Create Review with Detailed Ratings ---');
    
    const reviewData = {
        product_id: 2, // Make sure this product exists in your database
        title: "Great product with detailed ratings",
        content: "This is a test review with detailed category ratings.",
        rating: 8, // Overall rating (1-10)
        category_ratings: {
            value_for_money: 7,
            build_quality: 9,
            functionality: 8,
            durability: 8,
            ease_of_use: 6,
            aesthetics: 9,
            compatibility: 7
        }
    };
    
    const { status, data } = await apiRequest('reviews', 'POST', reviewData, authToken);
    
    if (status === 201) {
        console.log('✅ Successfully created review with detailed ratings');
        testReviewId = data.review_id;
        
        // Verify category ratings were saved
        if (data.category_ratings && data.category_ratings.length > 0) {
            console.log(`✅ ${data.category_ratings.length} category ratings were saved`);
        } else {
            console.error('❌ Category ratings were not saved');
        }
    } else {
        console.error('❌ Failed to create review');
    }
}

// Get a review with detailed ratings
async function testGetReviewWithDetailedRatings() {
    console.log('\n--- Testing Get Review with Detailed Ratings ---');
    
    if (!testReviewId) {
        console.error('❌ No review ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`reviews/${testReviewId}`, 'GET');
    
    if (status === 200) {
        console.log('✅ Successfully retrieved review');
        
        // Verify category ratings were retrieved
        if (data.category_ratings && data.category_ratings.length > 0) {
            console.log(`✅ ${data.category_ratings.length} category ratings were retrieved`);
            console.log(`Average category rating: ${data.average_category_rating}`);
        } else {
            console.error('❌ Category ratings were not retrieved');
        }
    } else {
        console.error('❌ Failed to retrieve review');
    }
}

// Update a review's detailed ratings
async function testUpdateReviewDetailedRatings() {
    console.log('\n--- Testing Update Review Detailed Ratings ---');
    
    if (!testReviewId) {
        console.error('❌ No review ID available for testing');
        return;
    }
    
    const updateData = {
        title: "Updated review with modified ratings",
        category_ratings: {
            value_for_money: 8, // Increased from 7
            build_quality: 9,   // Same
            functionality: 9,   // Increased from 8
            // Not updating other ratings
        }
    };
    
    const { status, data } = await apiRequest(`reviews/${testReviewId}`, 'PUT', updateData, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully updated review ratings');
        
        // Verify category ratings were updated
        if (data.category_ratings) {
            const valueForMoneyRating = data.category_ratings.find(r => r.category === 'value_for_money');
            const functionalityRating = data.category_ratings.find(r => r.category === 'functionality');
            
            if (valueForMoneyRating && valueForMoneyRating.score === 8) {
                console.log('✅ value_for_money rating was updated correctly');
            } else {
                console.error('❌ value_for_money rating was not updated correctly');
            }
            
            if (functionalityRating && functionalityRating.score === 9) {
                console.log('✅ functionality rating was updated correctly');
            } else {
                console.error('❌ functionality rating was not updated correctly');
            }
        } else {
            console.error('❌ Category ratings were not included in response');
        }
    } else {
        console.error('❌ Failed to update review');
    }
}

// Delete the test review
async function testDeleteReview() {
    console.log('\n--- Testing Delete Review ---');
    
    if (!testReviewId) {
        console.error('❌ No review ID available for testing');
        return;
    }
    
    const { status, data } = await apiRequest(`reviews/${testReviewId}`, 'DELETE', null, authToken);
    
    if (status === 200) {
        console.log('✅ Successfully deleted review');
        
        // Verify category ratings were included in the deleted review
        if (data.review.category_ratings && data.review.category_ratings.length > 0) {
            console.log(`✅ ${data.review.category_ratings.length} category ratings were included in deleted review`);
        } else {
            console.error('❌ Category ratings were not included in deleted review');
        }
    } else {
        console.error('❌ Failed to delete review');
    }
}

// Run all tests
async function runTests() {
    try {
        await testServerAvailability();
        await registerTestUser();
        await loginTestUser();
        await testGetRatingCategories();
        await testCreateReviewWithDetailedRatings();
        await testGetReviewWithDetailedRatings();
        await testUpdateReviewDetailedRatings();
        await testDeleteReview();
        
        console.log('\n=== Tests Completed ===');
    } catch (error) {
        console.error('Error during tests:', error);
    }
}

// Run the tests
runTests(); 