# Postman Testing Guide for RateMate API

This guide provides step-by-step instructions for testing the RateMate API using Postman, with a focus on the review and comment functionality including the detailed ratings system.

## Setup

1. Make sure your Azure Functions app is running locally:
   ```
   npm run start
   ```

2. Import the Postman collection (if available) or create a new collection named "RateMate API".

3. Set up environment variables in Postman:
   - `baseUrl`: `http://localhost:7073/api`
   - `authToken`: (will be populated after login)
   - `userId`: (will be populated after login)
   - `reviewId`: (will be populated after creating a review)
   - `commentId`: (will be populated after creating a comment)

## Authentication

### Register a Test User

1. Create a new POST request to `{{baseUrl}}/auth/register`
2. Set the Content-Type header to `application/json`
3. In the request body, add:
   ```json
   {
     "username": "testuser_ratings",
     "email": "testuser_ratings@example.com",
     "password": "Password123!"
   }
   ```
   - If you get a duplicate key error, modify the username and email
4. Send the request
5. Verify you receive a 201 Created response with user details

### Login with Test User

1. Create a new POST request to `{{baseUrl}}/auth/login`
2. Set the Content-Type header to `application/json`
3. In the request body, add:
   ```json
   {
     "email": "testuser_ratings@example.com",
     "password": "Password123!"
   }
   ```
4. Send the request
5. Verify you receive a 200 OK response with a token
6. Save the token to your environment variable:
   - Right-click on the token value in the response
   - Select "Set as variable value" and choose `authToken`
   - Save the user_id to the `userId` environment variable

## Testing Detailed Ratings

### Get Rating Categories

1. Create a new GET request to `{{baseUrl}}/reviews?categoriesOnly=true`
2. Send the request
3. Verify you receive a 200 OK response with an array of rating categories
4. Note the available category names for use in creating reviews

### Create a Review with Detailed Ratings

1. Create a new POST request to `{{baseUrl}}/reviews`
2. Set the Content-Type header to `application/json`
3. Set the Authorization header to `Bearer {{authToken}}`
4. In the request body, add:
   ```json
   {
     "product_id": 2,
     "title": "Great product with detailed ratings",
     "content": "This is a test review with detailed category ratings.",
     "rating": 8,
     "category_ratings": {
       "value_for_money": 7,
       "build_quality": 9,
       "functionality": 8,
       "durability": 8,
       "ease_of_use": 6,
       "aesthetics": 9,
       "compatibility": 7
     }
   }
   ```
5. Send the request
6. Verify you receive a 201 Created response with the review details including category ratings
7. Save the review_id to your environment variable:
   - Right-click on the review_id value in the response
   - Select "Set as variable value" and choose `reviewId`

### Get a Review with Detailed Ratings

1. Create a new GET request to `{{baseUrl}}/reviews/{{reviewId}}`
2. Send the request
3. Verify you receive a 200 OK response with the review details
4. Check that the response includes:
   - The overall rating (8)
   - An array of category ratings
   - The average_category_rating field

### Get Reviews for a Product

1. Create a new GET request to `{{baseUrl}}/reviews?productId=2`
2. Send the request
3. Verify you receive a 200 OK response with an array of reviews
4. Check that your review is included with all category ratings

### Update a Review's Detailed Ratings

1. Create a new PUT request to `{{baseUrl}}/reviews/{{reviewId}}`
2. Set the Content-Type header to `application/json`
3. Set the Authorization header to `Bearer {{authToken}}`
4. In the request body, add:
   ```json
   {
     "title": "Updated review with modified ratings",
     "category_ratings": {
       "value_for_money": 8,
       "build_quality": 9,
       "functionality": 9
     }
   }
   ```
5. Send the request
6. Verify you receive a 200 OK response with the updated review
7. Check that:
   - The value_for_money rating has been updated to 8
   - The functionality rating has been updated to 9
   - Other ratings remain unchanged

## Testing Comments on Reviews

### Create a Comment on the Review

1. Create a new POST request to `{{baseUrl}}/comments`
2. Set the Content-Type header to `application/json`
3. Set the Authorization header to `Bearer {{authToken}}`
4. In the request body, add:
   ```json
   {
     "review_id": {{reviewId}},
     "content": "This is a comment on a review with detailed ratings."
   }
   ```
5. Send the request
6. Verify you receive a 201 Created response with the comment details
7. Save the comment_id to your environment variable:
   - Right-click on the comment_id value in the response
   - Select "Set as variable value" and choose `commentId`

### Get Comments for the Review

1. Create a new GET request to `{{baseUrl}}/comments?reviewId={{reviewId}}`
2. Send the request
3. Verify you receive a 200 OK response with an array containing your comment

## Cleanup

### Delete the Comment

1. Create a new DELETE request to `{{baseUrl}}/comments/{{commentId}}`
2. Set the Authorization header to `Bearer {{authToken}}`
3. Send the request
4. Verify you receive a 200 OK response confirming the comment was deleted

### Delete the Review

1. Create a new DELETE request to `{{baseUrl}}/reviews/{{reviewId}}`
2. Set the Authorization header to `Bearer {{authToken}}`
3. Send the request
4. Verify you receive a 200 OK response with the deleted review details
5. Check that the deleted review includes the category ratings

## Advanced Testing

### Test Validation Rules

1. Try creating a review with an invalid rating (outside 1-10 range)
2. Try creating a review with invalid category ratings
3. Try updating a review with invalid category ratings
4. Try creating a review for a non-existent product

### Test Authorization

1. Try updating a review created by another user
2. Try deleting a review created by another user
3. Try accessing protected endpoints without authentication

## Automating Tests in Postman

You can use Postman's test scripts to automate validation and variable extraction:

1. In the Login request, add this test script:
   ```javascript
   pm.test("Status code is 200", function () {
     pm.response.to.have.status(200);
   });
   
   var jsonData = pm.response.json();
   pm.environment.set("authToken", jsonData.token);
   pm.environment.set("userId", jsonData.user.user_id);
   ```

2. In the Create Review request, add this test script:
   ```javascript
   pm.test("Status code is 201", function () {
     pm.response.to.have.status(201);
   });
   
   var jsonData = pm.response.json();
   pm.environment.set("reviewId", jsonData.review_id);
   ```

3. Create a Collection Runner to execute all requests in sequence 