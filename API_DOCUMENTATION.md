# RateMate Backend API Documentation

## Overview

The RateMate backend provides separate authentication systems for brands and users, with brands managing products and users creating reviews.

## Authentication

### Brand Authentication

#### Register Brand
- **POST** `/api/brands/auth/register`
- **Body:**
```json
{
  "brand_name": "string",
  "email": "string",
  "password": "string"
}
```
- **Response:** Brand details and success message

#### Brand Login
- **POST** `/api/brands/auth/login`
- **Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response:** Brand details and JWT token

### User Authentication
Uses existing user authentication system from `auth.ts`.

## Brand Dashboard (Requires Brand Authentication)

### Get Brand Dashboard
- **GET** `/api/brands/dashboard`
- **Headers:** `Authorization: Bearer <brand_token>`
- **Response:** Brand statistics, recent products, and recent reviews

### Create Product
- **POST** `/api/brands/products`
- **Headers:** `Authorization: Bearer <brand_token>`
- **Body:**
```json
{
  "product_name": "string",
  "product_category": "string (optional)",
  "subcategory_id": "number (optional)",
  "category_id": "number (optional)",
  "description": "string (optional)"
}
```

### Get Brand's Products
- **GET** `/api/brands/products`
- **Headers:** `Authorization: Bearer <brand_token>`
- **Response:** List of brand's products with review statistics

### Update Product
- **PUT** `/api/brands/products/{productId}`
- **Headers:** `Authorization: Bearer <brand_token>`
- **Body:** Any combination of product fields to update

### Get Product Reviews (Brand View)
- **GET** `/api/brands/products/{productId}/reviews`
- **Headers:** `Authorization: Bearer <brand_token>`
- **Response:** All reviews for the brand's product

## User Reviews (Requires User Authentication)

### Create Review
- **POST** `/api/reviews`
- **Headers:** `Authorization: Bearer <user_token>`
- **Body:**
```json
{
  "product_id": "number",
  "title": "string",
  "content": "string",
  "rating": "number (1-5)"
}
```

### Get User's Reviews
- **GET** `/api/users/reviews`
- **Headers:** `Authorization: Bearer <user_token>`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)

### Update Review
- **PUT** `/api/reviews/{reviewId}`
- **Headers:** `Authorization: Bearer <user_token>`
- **Body:** Any combination of review fields to update

### Delete Review
- **DELETE** `/api/reviews/{reviewId}`
- **Headers:** `Authorization: Bearer <user_token>`

## Public Endpoints (No Authentication Required)

### Get Products
- **GET** `/api/public/products`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `search`: Search term for product name/description
  - `category`: Filter by product category
  - `brandId`: Filter by brand ID
  - `sortBy`: Sort field (product_name, average_rating, total_reviews, brand_name)
  - `sortOrder`: ASC or DESC (default: DESC)

### Get Product by ID
- **GET** `/api/public/products/{productId}`
- **Response:** Product details with brand information and review statistics

### Get Product Reviews
- **GET** `/api/products/{productId}/reviews`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sortBy`: Sort field (created_at, rating, updated_at)
  - `sortOrder`: ASC or DESC (default: DESC)
- **Response:** Reviews with pagination and rating statistics

### Get Product Categories
- **GET** `/api/public/products/categories`
- **Response:** List of available product categories with product counts

### Get Brands
- **GET** `/api/public/brands`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `search`: Search term for brand name
  - `verified`: Filter by verification status (true/false)

### Get Brand by ID
- **GET** `/api/public/brands/{brandId}`
- **Response:** Brand details with statistics and list of products

## Database Schema

### Brands Table
- `brand_id` (Primary Key)
- `brand_name` (Unique)
- `email` (Unique, for authentication)
- `password_hash` (for authentication)
- `is_verified` (Boolean)
- `created_at`, `updated_at` (Timestamps)

### Products Table
- `product_id` (Primary Key)
- `product_name`
- `product_category`
- `description`
- `brand_id` (Foreign Key to brands)
- `subcategory_id`, `category_id` (Optional)
- `brand` (Brand name, denormalized)

### Users Table
- `user_id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `created_at` (Timestamp)

### Reviews Table
- `review_id` (Primary Key)
- `user_id` (Foreign Key to users)
- `product_id` (Foreign Key to products)
- `title`, `content`
- `rating` (1-5)
- `created_at`, `updated_at` (Timestamps)

## Key Features

1. **Separate Authentication**: Brands and users have independent authentication systems
2. **Brand Product Management**: Only brands can create/update/delete products
3. **User Reviews**: Only users can create reviews for products
4. **Public API**: Anyone can view products, brands, and reviews without authentication
5. **Comprehensive Statistics**: Review counts, average ratings, and breakdowns
6. **Pagination**: All list endpoints support pagination
7. **Search & Filtering**: Products and brands can be searched and filtered
8. **Security**: JWT tokens with type validation, proper authorization checks

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

Error responses include descriptive error messages and details when appropriate. 