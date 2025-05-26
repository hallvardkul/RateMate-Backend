import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { requireAuth } from "../utils/authMiddleware";

interface CreateReviewRequest {
    product_id: number;
    title: string;
    content: string;
    rating: number;
}

interface UpdateReviewRequest {
    title?: string;
    content?: string;
    rating?: number;
}

// Create Review (Users Only)
app.http('createReview', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "reviews",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const user = await requireAuth(request, context);
            const body = await request.json() as CreateReviewRequest;
            const { product_id, title, content, rating } = body;

            // Guard clauses for validation
            if (!product_id || !title || !content || rating === undefined) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields: product_id, title, content, or rating" }
                };
            }

            if (rating < 1 || rating > 5) {
                return {
                    status: 400,
                    jsonBody: { error: "Rating must be between 1 and 5" }
                };
            }

            // Check if product exists
            const productCheck = await pool.query(
                "SELECT product_id, product_name FROM dbo.products WHERE product_id = $1",
                [product_id]
            );

            if (productCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            // Check if user has already reviewed this product
            const existingReview = await pool.query(
                "SELECT review_id FROM dbo.reviews WHERE user_id = $1 AND product_id = $2",
                [user.userId, product_id]
            );

            if (existingReview.rows.length > 0) {
                return {
                    status: 409,
                    jsonBody: { error: "You have already reviewed this product. Use PUT to update your review." }
                };
            }

            // Create the review
            const result = await pool.query(
                `INSERT INTO dbo.reviews (user_id, product_id, title, content, rating, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING review_id, user_id, product_id, title, content, rating, created_at`,
                [user.userId, product_id, title, content, rating]
            );

            const review = result.rows[0];

            return {
                status: 201,
                jsonBody: {
                    message: "Review created successfully",
                    review: {
                        ...review,
                        username: user.username,
                        product_name: productCheck.rows[0].product_name
                    }
                }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in createReview function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Get Reviews for a Product
app.http('getProductReviews', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "products/{productId}/reviews",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const productId = request.params.productId;

            if (!productId) {
                return {
                    status: 400,
                    jsonBody: { error: "Product ID is required" }
                };
            }

            // Check if product exists
            const productCheck = await pool.query(
                "SELECT product_id, product_name FROM dbo.products WHERE product_id = $1",
                [productId]
            );

            if (productCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            // Get pagination parameters
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const sortBy = url.searchParams.get('sortBy') || 'created_at';
            const sortOrder = url.searchParams.get('sortOrder') || 'DESC';

            const offset = (page - 1) * limit;

            // Validate sort parameters
            const validSortFields = ['created_at', 'rating', 'updated_at'];
            const validSortOrders = ['ASC', 'DESC'];
            
            const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            // Get reviews
            const result = await pool.query(
                `SELECT 
                    r.review_id, r.title, r.content, r.rating, r.created_at, r.updated_at,
                    u.username, u.user_id
                 FROM dbo.reviews r
                 JOIN dbo.users u ON r.user_id = u.user_id
                 WHERE r.product_id = $1
                 ORDER BY r.${finalSortBy} ${finalSortOrder}
                 LIMIT $2 OFFSET $3`,
                [productId, limit, offset]
            );

            // Get total count for pagination
            const countResult = await pool.query(
                "SELECT COUNT(*) as total FROM dbo.reviews WHERE product_id = $1",
                [productId]
            );

            // Get rating statistics
            const statsResult = await pool.query(
                `SELECT 
                    COUNT(*) as total_reviews,
                    AVG(rating) as average_rating,
                    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
                 FROM dbo.reviews WHERE product_id = $1`,
                [productId]
            );

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);
            const stats = statsResult.rows[0];

            return {
                status: 200,
                jsonBody: {
                    product_name: productCheck.rows[0].product_name,
                    reviews: result.rows,
                    statistics: {
                        total_reviews: parseInt(stats.total_reviews),
                        average_rating: parseFloat(stats.average_rating) || 0,
                        rating_breakdown: {
                            five_star: parseInt(stats.five_star),
                            four_star: parseInt(stats.four_star),
                            three_star: parseInt(stats.three_star),
                            two_star: parseInt(stats.two_star),
                            one_star: parseInt(stats.one_star)
                        }
                    },
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            };
        } catch (error) {
            context.error('Error in getProductReviews function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Get User's Reviews
app.http('getUserReviews', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "users/reviews",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const user = await requireAuth(request, context);

            // Get pagination parameters
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;

            // Get user's reviews
            const result = await pool.query(
                `SELECT 
                    r.review_id, r.title, r.content, r.rating, r.created_at, r.updated_at,
                    p.product_id, p.product_name, p.product_category,
                    b.brand_name
                 FROM dbo.reviews r
                 JOIN dbo.products p ON r.product_id = p.product_id
                 LEFT JOIN dbo.brands b ON p.brand_id = b.brand_id
                 WHERE r.user_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [user.userId, limit, offset]
            );

            // Get total count
            const countResult = await pool.query(
                "SELECT COUNT(*) as total FROM dbo.reviews WHERE user_id = $1",
                [user.userId]
            );

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                status: 200,
                jsonBody: {
                    reviews: result.rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in getUserReviews function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Update Review (User can only update their own reviews)
app.http('updateReview', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: "reviews/{reviewId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const user = await requireAuth(request, context);
            const reviewId = request.params.reviewId;

            if (!reviewId) {
                return {
                    status: 400,
                    jsonBody: { error: "Review ID is required" }
                };
            }

            // Check if review exists and belongs to user
            const reviewCheck = await pool.query(
                "SELECT user_id, product_id FROM dbo.reviews WHERE review_id = $1",
                [reviewId]
            );

            if (reviewCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Review not found" }
                };
            }

            if (reviewCheck.rows[0].user_id !== user.userId) {
                return {
                    status: 403,
                    jsonBody: { error: "You can only update your own reviews" }
                };
            }

            const updates = await request.json() as UpdateReviewRequest;
            
            if (Object.keys(updates).length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: "No update fields provided" }
                };
            }

            // Validate rating if provided
            if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
                return {
                    status: 400,
                    jsonBody: { error: "Rating must be between 1 and 5" }
                };
            }

            // Build dynamic update query
            const updateFields: string[] = [];
            const queryParams: any[] = [];
            let paramIndex = 1;

            if (updates.title !== undefined) {
                updateFields.push(`title = $${paramIndex++}`);
                queryParams.push(updates.title);
            }
            if (updates.content !== undefined) {
                updateFields.push(`content = $${paramIndex++}`);
                queryParams.push(updates.content);
            }
            if (updates.rating !== undefined) {
                updateFields.push(`rating = $${paramIndex++}`);
                queryParams.push(updates.rating);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            queryParams.push(reviewId);

            const query = `UPDATE dbo.reviews SET ${updateFields.join(', ')} WHERE review_id = $${paramIndex} RETURNING *`;
            const result = await pool.query(query, queryParams);

            return {
                status: 200,
                jsonBody: {
                    message: "Review updated successfully",
                    review: result.rows[0]
                }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in updateReview function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Delete Review (User can only delete their own reviews)
app.http('deleteReview', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: "reviews/{reviewId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const user = await requireAuth(request, context);
            const reviewId = request.params.reviewId;

            if (!reviewId) {
                return {
                    status: 400,
                    jsonBody: { error: "Review ID is required" }
                };
            }

            // Check if review exists and belongs to user
            const reviewCheck = await pool.query(
                "SELECT user_id FROM dbo.reviews WHERE review_id = $1",
                [reviewId]
            );

            if (reviewCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Review not found" }
                };
            }

            if (reviewCheck.rows[0].user_id !== user.userId) {
                return {
                    status: 403,
                    jsonBody: { error: "You can only delete your own reviews" }
                };
            }

            // Delete the review
            await pool.query(
                "DELETE FROM dbo.reviews WHERE review_id = $1",
                [reviewId]
            );

            return {
                status: 200,
                jsonBody: { message: "Review deleted successfully" }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in deleteReview function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
}); 