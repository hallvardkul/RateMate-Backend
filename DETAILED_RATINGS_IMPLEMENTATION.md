# Detailed Ratings Implementation

This document provides an overview of the detailed ratings functionality implemented in the RateMate backend.

## Overview

The detailed ratings system allows users to rate products across multiple categories (such as value for money, build quality, etc.) in addition to providing an overall rating. This provides more granular feedback and helps other users make more informed purchasing decisions.

## Database Changes

### New Tables

1. **Rating Categories Table**
   - Stores the predefined rating categories that users can rate products on
   - Schema:
     ```sql
     CREATE TABLE dbo.rating_categories (
         category_id SERIAL PRIMARY KEY,
         category_name VARCHAR(50) UNIQUE NOT NULL,
         description TEXT,
         is_active BOOLEAN DEFAULT TRUE
     );
     ```

2. **Category Ratings Table**
   - Stores the individual category ratings for each review
   - Schema:
     ```sql
     CREATE TABLE dbo.category_ratings (
         rating_id SERIAL PRIMARY KEY,
         review_id INTEGER NOT NULL,
         category VARCHAR(50) NOT NULL,
         score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (review_id) REFERENCES dbo.reviews(review_id) ON DELETE CASCADE,
         UNIQUE (review_id, category)
     );
     ```

### Predefined Categories

The following rating categories are predefined in the system:

1. **value_for_money**: Rating for the value received relative to the price paid
2. **build_quality**: Rating for the quality of materials and construction
3. **functionality**: Rating for how well the product performs its intended functions
4. **durability**: Rating for how well the product withstands wear and tear
5. **ease_of_use**: Rating for how intuitive and simple the product is to use
6. **aesthetics**: Rating for the visual appeal and design of the product
7. **compatibility**: Rating for how well the product works with other devices/systems

## Model Changes

### New Interfaces

1. **CategoryRating**
   ```typescript
   interface CategoryRating {
       rating_id?: number;
       review_id: number;
       category: string;
       score: number;
       created_at?: string;
   }
   ```

2. **RatingCategory**
   ```typescript
   interface RatingCategory {
       category_id: number;
       category_name: string;
       description: string;
       is_active: boolean;
   }
   ```

### Updated Interfaces

1. **Review**
   - Added optional `category_ratings` field of type `CategoryRating[]`

2. **CreateReviewRequest**
   - Added optional `category_ratings` field of type `Record<string, number>`

3. **UpdateReviewRequest**
   - Added optional `category_ratings` field of type `Record<string, number>`

4. **ReviewResponse**
   - Added optional `category_ratings` field of type `CategoryRating[]`
   - Added optional `average_category_rating` field of type `number`

## Service Changes

### New Functions

1. **getRatingCategories**
   - Retrieves all active rating categories from the database

2. **createCategoryRatings**
   - Helper function to insert category ratings for a review

3. **updateCategoryRatings**
   - Helper function to update category ratings for a review

4. **getCategoryRatingsForReview**
   - Helper function to retrieve all category ratings for a review

5. **calculateAverageCategoryRating**
   - Helper function to calculate the average of all category ratings for a review

### Updated Functions

1. **getReviewsByProductId**
   - Now includes category ratings and average category rating in the response

2. **getReviewById**
   - Now includes category ratings and average category rating in the response

3. **createReview**
   - Now handles the creation of category ratings
   - Validates that category ratings are within the valid range (1-10)

4. **updateReview**
   - Now handles the updating of category ratings
   - Validates that category ratings are within the valid range (1-10)

5. **deleteReview**
   - Now includes category ratings in the deleted review response

## API Endpoint Changes

### New Endpoint

1. **GET /api/reviews?categoriesOnly=true**
   - Returns all active rating categories
   - Used to inform clients about available rating categories

### Updated Endpoints

1. **GET /api/reviews?productId={productId}**
   - Now includes category ratings and average category rating in the response

2. **GET /api/reviews/{reviewId}**
   - Now includes category ratings and average category rating in the response

3. **POST /api/reviews**
   - Now accepts category ratings in the request body
   - Validates category ratings

4. **PUT /api/reviews/{reviewId}**
   - Now accepts category ratings in the request body
   - Validates category ratings

5. **DELETE /api/reviews/{reviewId}**
   - Now includes category ratings in the deleted review response

## Testing

A comprehensive test script has been created at `src/test/detailed-ratings-test.js` to test all aspects of the detailed ratings functionality, including:

1. Retrieving rating categories
2. Creating a review with category ratings
3. Retrieving a review with category ratings
4. Updating a review's category ratings
5. Deleting a review with category ratings

## Documentation

The README.md has been updated to include documentation for the detailed ratings functionality, including:

1. API endpoint descriptions
2. Request and response formats
3. Error handling
4. Database schema

A Postman testing guide has also been created to help with manual testing of the detailed ratings functionality.

## Future Enhancements

Potential future enhancements to the detailed ratings system could include:

1. Admin endpoints for managing rating categories (adding, updating, deactivating)
2. Weighted average calculations based on category importance
3. Statistical analysis of ratings across products
4. Filtering and sorting products based on specific category ratings
5. Visualization of rating data in charts and graphs 