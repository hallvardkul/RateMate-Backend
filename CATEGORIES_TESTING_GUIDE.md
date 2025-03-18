# RateMate Categories API Testing Guide

This guide provides step-by-step instructions for testing the RateMate Categories API endpoints using Postman.

## Prerequisites

1. Ensure the RateMate Backend is running locally on port 7073
2. Have Postman installed
3. Have a user account with admin privileges

## Setup

1. Create a new Postman collection named "RateMate Categories"
2. Set up environment variables:
   - `baseUrl`: `http://localhost:7073/api`
   - `authToken`: (to be filled after login)

## Authentication

Before testing the category endpoints, you need to authenticate as an admin user:

1. **Register an Admin User** (if you don't have one already)
   - Method: POST
   - URL: `{{baseUrl}}/auth/register`
   - Body (JSON):
     ```json
     {
       "username": "admin_user",
       "email": "admin@example.com",
       "password": "SecurePassword123!",
       "is_admin": true
     }
     ```

2. **Login**
   - Method: POST
   - URL: `{{baseUrl}}/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "SecurePassword123!"
     }
     ```
   - After successful login, copy the token from the response and set it as the `authToken` environment variable

## Testing Category Endpoints

### 1. Get All Categories

- Method: GET
- URL: `{{baseUrl}}/categories`
- Headers: None required (public endpoint)
- Expected Response: 200 OK with an array of categories

### 2. Get Active Categories Only

- Method: GET
- URL: `{{baseUrl}}/categories?activeOnly=true`
- Headers: None required (public endpoint)
- Expected Response: 200 OK with an array of active categories

### 3. Create a Category

- Method: POST
- URL: `{{baseUrl}}/categories`
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "category_name": "Electronics",
    "description": "Electronic devices and gadgets",
    "is_active": true
  }
  ```
- Expected Response: 201 Created with the newly created category

### 4. Get Category by ID

- Method: GET
- URL: `{{baseUrl}}/categories/1` (replace 1 with the actual category ID)
- Headers: None required (public endpoint)
- Expected Response: 200 OK with the category details

### 5. Update a Category

- Method: PUT
- URL: `{{baseUrl}}/categories/1` (replace 1 with the actual category ID)
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "description": "Updated description for electronic devices",
    "is_active": true
  }
  ```
- Expected Response: 200 OK with the updated category

### 6. Create a Subcategory

- Method: POST
- URL: `{{baseUrl}}/subcategories`
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "parent_category_id": 1,
    "subcategory_name": "Smartphones",
    "description": "Mobile phones and smartphones",
    "is_active": true
  }
  ```
- Expected Response: 201 Created with the newly created subcategory

### 7. Get All Subcategories

- Method: GET
- URL: `{{baseUrl}}/subcategories`
- Headers: None required (public endpoint)
- Expected Response: 200 OK with an array of subcategories

### 8. Get Active Subcategories Only

- Method: GET
- URL: `{{baseUrl}}/subcategories?activeOnly=true`
- Headers: None required (public endpoint)
- Expected Response: 200 OK with an array of active subcategories

### 9. Get Subcategories by Category ID

- Method: GET
- URL: `{{baseUrl}}/categories/1/subcategories` (replace 1 with the actual category ID)
- Headers: None required (public endpoint)
- Expected Response: 200 OK with an array of subcategories for the specified category

### 10. Get Subcategory by ID

- Method: GET
- URL: `{{baseUrl}}/subcategories/1` (replace 1 with the actual subcategory ID)
- Headers: None required (public endpoint)
- Expected Response: 200 OK with the subcategory details

### 11. Update a Subcategory

- Method: PUT
- URL: `{{baseUrl}}/subcategories/1` (replace 1 with the actual subcategory ID)
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "description": "Updated description for smartphones",
    "is_active": true
  }
  ```
- Expected Response: 200 OK with the updated subcategory

### 12. Delete a Subcategory

- Method: DELETE
- URL: `{{baseUrl}}/subcategories/1` (replace 1 with the actual subcategory ID)
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Expected Response: 200 OK with the deleted subcategory

### 13. Delete a Category

- Method: DELETE
- URL: `{{baseUrl}}/categories/1` (replace 1 with the actual category ID)
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Expected Response: 200 OK with the deleted category

## Testing Error Scenarios

### 1. Create Category with Duplicate Name

- Method: POST
- URL: `{{baseUrl}}/categories`
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "category_name": "Electronics",
    "description": "This should fail as the name already exists"
  }
  ```
- Expected Response: 409 Conflict with an error message

### 2. Update Category to Duplicate Name

- Method: PUT
- URL: `{{baseUrl}}/categories/2` (replace 2 with a different category ID)
- Headers: 
  - Authorization: `Bearer {{authToken}}`
- Body (JSON):
  ```json
  {
    "category_name": "Electronics"
  }
  ```
- Expected Response: 409 Conflict with an error message

### 3. Delete Category with Subcategories

1. First, create a category and add subcategories to it
2. Then try to delete the category:
   - Method: DELETE
   - URL: `{{baseUrl}}/categories/1` (replace 1 with the category ID that has subcategories)
   - Headers: 
     - Authorization: `Bearer {{authToken}}`
   - Expected Response: 409 Conflict with an error message

### 4. Access Admin Endpoints without Authentication

- Method: POST
- URL: `{{baseUrl}}/categories`
- Headers: None
- Body (JSON):
  ```json
  {
    "category_name": "Test Category"
  }
  ```
- Expected Response: 401 Unauthorized

### 5. Access Admin Endpoints with Non-Admin User

1. Create a non-admin user and get their token
2. Try to create a category:
   - Method: POST
   - URL: `{{baseUrl}}/categories`
   - Headers: 
     - Authorization: `Bearer {{nonAdminToken}}`
   - Body (JSON):
     ```json
     {
       "category_name": "Test Category"
     }
     ```
   - Expected Response: 403 Forbidden

## Postman Collection Setup Tips

1. Organize your requests into folders:
   - Authentication
   - Categories
   - Subcategories
   - Error Testing

2. Use environment variables to store dynamic values:
   - `categoryId`: Store the ID of a created category
   - `subcategoryId`: Store the ID of a created subcategory

3. Use test scripts to automatically extract and store IDs:
   ```javascript
   // Example test script for the Create Category request
   var jsonData = pm.response.json();
   pm.environment.set("categoryId", jsonData.category_id);
   ```

4. Create a collection runner to execute the requests in sequence for automated testing. 