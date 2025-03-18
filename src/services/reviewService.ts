import { InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { Review, CreateReviewRequest, UpdateReviewRequest, ReviewResponse, CategoryRating, RatingCategory } from "../models/review";

// Helper function to get all rating categories
export async function getRatingCategories(context: InvocationContext): Promise<RatingCategory[]> {
    try {
        const query = `
            SELECT * FROM dbo.rating_categories
            WHERE is_active = true
            ORDER BY category_id
        `;
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        context.log('Error in getRatingCategories:', err);
        throw err;
    }
}

// Helper function to get category ratings for a review
async function getCategoryRatingsForReview(reviewId: number, context: InvocationContext): Promise<CategoryRating[]> {
    try {
        const query = `
            SELECT * FROM dbo.category_ratings
            WHERE review_id = $1
            ORDER BY category
        `;
        const result = await pool.query(query, [reviewId]);
        return result.rows;
    } catch (err) {
        context.log('Error in getCategoryRatingsForReview:', err);
        throw err;
    }
}

// Helper function to calculate average category rating
function calculateAverageCategoryRating(categoryRatings: CategoryRating[]): number | null {
    if (!categoryRatings || categoryRatings.length === 0) {
        return null;
    }
    
    const sum = categoryRatings.reduce((total, rating) => total + rating.score, 0);
    return parseFloat((sum / categoryRatings.length).toFixed(1));
}

export async function getReviewsByProductId(productId: number, context: InvocationContext): Promise<ReviewResponse[]> {
    try {
        const query = `
            SELECT r.*, u.username, 
                   (SELECT COUNT(*) FROM dbo.comments c WHERE c.review_id = r.review_id) as comments_count
            FROM dbo.reviews r
            JOIN dbo.users u ON r.user_id = u.user_id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC
        `;
        const result = await pool.query(query, [productId]);
        const reviews = result.rows;
        
        // Get category ratings for each review
        for (const review of reviews) {
            review.category_ratings = await getCategoryRatingsForReview(review.review_id, context);
            review.average_category_rating = calculateAverageCategoryRating(review.category_ratings);
        }
        
        return reviews;
    } catch (err) {
        context.log('Error in getReviewsByProductId:', err);
        throw err;
    }
}

export async function getReviewById(reviewId: number, context: InvocationContext): Promise<ReviewResponse | null> {
    try {
        const query = `
            SELECT r.*, u.username, 
                   (SELECT COUNT(*) FROM dbo.comments c WHERE c.review_id = r.review_id) as comments_count
            FROM dbo.reviews r
            JOIN dbo.users u ON r.user_id = u.user_id
            WHERE r.review_id = $1
        `;
        const result = await pool.query(query, [reviewId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const review = result.rows[0];
        
        // Get category ratings for the review
        review.category_ratings = await getCategoryRatingsForReview(review.review_id, context);
        review.average_category_rating = calculateAverageCategoryRating(review.category_ratings);
        
        return review;
    } catch (err) {
        context.log('Error in getReviewById:', err);
        throw err;
    }
}

// Helper function to save category ratings
async function saveCategoryRatings(
    reviewId: number, 
    categoryRatings: CreateReviewRequest['category_ratings'], 
    context: InvocationContext
): Promise<void> {
    if (!categoryRatings) return;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Process each category rating
        const categories = [
            'value_for_money', 
            'build_quality', 
            'functionality', 
            'durability', 
            'ease_of_use', 
            'aesthetics', 
            'compatibility'
        ];
        
        for (const category of categories) {
            const score = categoryRatings[category as keyof typeof categoryRatings];
            
            if (score !== undefined) {
                // Insert the category rating
                await client.query(
                    `INSERT INTO dbo.category_ratings (review_id, category, score)
                     VALUES ($1, $2, $3)`,
                    [reviewId, category, score]
                );
            }
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        context.log('Error in saveCategoryRatings:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function createReview(
    userId: number, 
    review: CreateReviewRequest, 
    context: InvocationContext
): Promise<Review> {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // First, verify that the product exists
        const productCheck = await client.query(
            'SELECT product_id FROM dbo.products WHERE product_id = $1',
            [review.product_id]
        );
        
        if (productCheck.rows.length === 0) {
            throw new Error(`Product with ID ${review.product_id} not found`);
        }
        
        // Check if user already has a review for this product
        const existingReview = await client.query(
            'SELECT review_id FROM dbo.reviews WHERE user_id = $1 AND product_id = $2',
            [userId, review.product_id]
        );
        
        if (existingReview.rows.length > 0) {
            throw new Error('You have already reviewed this product');
        }
        
        // Create the review
        const query = `
            INSERT INTO dbo.reviews (product_id, user_id, title, content, rating, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const values = [
            review.product_id,
            userId,
            review.title,
            review.content,
            review.rating
        ];
        
        const result = await client.query(query, values);
        const createdReview = result.rows[0];
        
        // Save category ratings if provided
        if (review.category_ratings) {
            await saveCategoryRatings(createdReview.review_id, review.category_ratings, context);
        }
        
        await client.query('COMMIT');
        
        // Get the complete review with category ratings
        createdReview.category_ratings = await getCategoryRatingsForReview(createdReview.review_id, context);
        
        return createdReview;
    } catch (err) {
        await client.query('ROLLBACK');
        context.log('Error in createReview:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Helper function to update category ratings
async function updateCategoryRatings(
    reviewId: number, 
    categoryRatings: UpdateReviewRequest['category_ratings'], 
    context: InvocationContext
): Promise<void> {
    if (!categoryRatings) return;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Process each category rating
        const categories = [
            'value_for_money', 
            'build_quality', 
            'functionality', 
            'durability', 
            'ease_of_use', 
            'aesthetics', 
            'compatibility'
        ];
        
        for (const category of categories) {
            const score = categoryRatings[category as keyof typeof categoryRatings];
            
            if (score !== undefined) {
                // Check if the category rating already exists
                const existingRating = await client.query(
                    `SELECT rating_id FROM dbo.category_ratings 
                     WHERE review_id = $1 AND category = $2`,
                    [reviewId, category]
                );
                
                if (existingRating.rows.length > 0) {
                    // Update existing rating
                    await client.query(
                        `UPDATE dbo.category_ratings 
                         SET score = $1
                         WHERE review_id = $2 AND category = $3`,
                        [score, reviewId, category]
                    );
                } else {
                    // Insert new rating
                    await client.query(
                        `INSERT INTO dbo.category_ratings (review_id, category, score)
                         VALUES ($1, $2, $3)`,
                        [reviewId, category, score]
                    );
                }
            }
        }
        
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        context.log('Error in updateCategoryRatings:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function updateReview(
    reviewId: number,
    userId: number,
    updates: UpdateReviewRequest,
    context: InvocationContext
): Promise<Review | null> {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Check if the review exists and belongs to the user
        const reviewCheck = await client.query(
            'SELECT review_id FROM dbo.reviews WHERE review_id = $1 AND user_id = $2',
            [reviewId, userId]
        );
        
        if (reviewCheck.rows.length === 0) {
            return null; // Review not found or doesn't belong to user
        }
        
        // Build the update query dynamically based on provided fields
        let query = "UPDATE dbo.reviews SET updated_at = CURRENT_TIMESTAMP";
        const queryParams: any[] = [];
        let paramIndex = 1;
        
        if (updates.title !== undefined) {
            query += `, title = $${paramIndex}`;
            queryParams.push(updates.title);
            paramIndex++;
        }
        
        if (updates.content !== undefined) {
            query += `, content = $${paramIndex}`;
            queryParams.push(updates.content);
            paramIndex++;
        }
        
        if (updates.rating !== undefined) {
            query += `, rating = $${paramIndex}`;
            queryParams.push(updates.rating);
            paramIndex++;
        }
        
        query += ` WHERE review_id = $${paramIndex} RETURNING *`;
        queryParams.push(reviewId);
        
        const result = await client.query(query, queryParams);
        const updatedReview = result.rows[0];
        
        // Update category ratings if provided
        if (updates.category_ratings) {
            await updateCategoryRatings(reviewId, updates.category_ratings, context);
        }
        
        await client.query('COMMIT');
        
        // Get the complete review with updated category ratings
        updatedReview.category_ratings = await getCategoryRatingsForReview(reviewId, context);
        
        return updatedReview;
    } catch (err) {
        await client.query('ROLLBACK');
        context.log('Error in updateReview:', err);
        throw err;
    } finally {
        client.release();
    }
}

export async function deleteReview(
    reviewId: number,
    userId: number,
    context: InvocationContext
): Promise<Review | null> {
    try {
        // Check if the review exists and belongs to the user
        const reviewCheck = await pool.query(
            'SELECT * FROM dbo.reviews WHERE review_id = $1 AND user_id = $2',
            [reviewId, userId]
        );
        
        if (reviewCheck.rows.length === 0) {
            return null; // Review not found or doesn't belong to user
        }
        
        // Get category ratings before deletion (for return value)
        const categoryRatings = await getCategoryRatingsForReview(reviewId, context);
        const reviewToDelete = reviewCheck.rows[0];
        reviewToDelete.category_ratings = categoryRatings;
        
        // Delete the review (category_ratings will be deleted automatically due to CASCADE)
        const query = 'DELETE FROM dbo.reviews WHERE review_id = $1 RETURNING *';
        await pool.query(query, [reviewId]);
        
        return reviewToDelete;
    } catch (err) {
        context.log('Error in deleteReview:', err);
        throw err;
    }
} 