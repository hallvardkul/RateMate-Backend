import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withGuards } from "../utils/corsMiddleware";
import pool from "../database/postgresClient";

// Comprehensive Product Dashboard - Shows product details, ratings, reviews, and comments
app.http('productDashboard', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: "dashboard/products/{productId:int}",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const productId = request.params.productId;
            
            if (!productId) {
                return {
                    status: 400,
                    jsonBody: { error: "Product ID is required" }
                };
            }

            // Get product details with brand information
            const productResult = await pool.query(
                `SELECT 
                    p.product_id, 
                    p.product_name, 
                    p.product_category, 
                    p.description,
                    p.subcategory_id, 
                    p.category_id,
                    p.brand as brand_name_legacy,
                    b.brand_id,
                    b.brand_name,
                    b.email as brand_email,
                    b.is_verified as brand_verified,
                    b.website as brand_website,
                    b.created_at as brand_created_at
                 FROM dbo.products p
                 LEFT JOIN dbo.brands b ON p.brand_id = b.brand_id
                 WHERE p.product_id = $1`,
                [productId]
            );

            if (productResult.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            const product = productResult.rows[0];

            // Get overall rating statistics
            const ratingStatsResult = await pool.query(
                `SELECT 
                    COUNT(r.review_id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    COALESCE(MIN(r.rating), 0) as min_rating,
                    COALESCE(MAX(r.rating), 0) as max_rating,
                    COUNT(CASE WHEN r.rating >= 8 THEN 1 END) as excellent_count,
                    COUNT(CASE WHEN r.rating >= 6 AND r.rating < 8 THEN 1 END) as good_count,
                    COUNT(CASE WHEN r.rating >= 4 AND r.rating < 6 THEN 1 END) as average_count,
                    COUNT(CASE WHEN r.rating < 4 THEN 1 END) as poor_count
                 FROM dbo.reviews r
                 WHERE r.product_id = $1`,
                [productId]
            );

            const ratingStats = ratingStatsResult.rows[0];

            // Get rating distribution (count for each rating 1-10)
            const ratingDistributionResult = await pool.query(
                `SELECT 
                    r.rating,
                    COUNT(*) as count
                 FROM dbo.reviews r
                 WHERE r.product_id = $1
                 GROUP BY r.rating
                 ORDER BY r.rating DESC`,
                [productId]
            );

            const ratingDistribution = Array.from({length: 10}, (_, i) => ({
                rating: 10 - i,
                count: 0
            }));

            ratingDistributionResult.rows.forEach(row => {
                const index = ratingDistribution.findIndex(item => item.rating === row.rating);
                if (index >= 0) {
                    ratingDistribution[index].count = parseInt(row.count);
                }
            });

            // Get category rating averages
            const categoryRatingsResult = await pool.query(
                `SELECT 
                    cr.category,
                    AVG(cr.score) as average_score,
                    COUNT(cr.rating_id) as rating_count
                 FROM dbo.category_ratings cr
                 JOIN dbo.reviews r ON cr.review_id = r.review_id
                 WHERE r.product_id = $1
                 GROUP BY cr.category
                 ORDER BY average_score DESC`,
                [productId]
            );

            // Get all reviews with user information and category ratings
            const reviewsResult = await pool.query(
                `SELECT 
                    r.review_id,
                    r.product_id,
                    r.user_id,
                    r.title,
                    r.content,
                    r.rating,
                    r.created_at,
                    r.updated_at,
                    u.username,
                    u.avatar_url,
                    u.is_verified as user_verified,
                    COUNT(c.comment_id) as comments_count
                 FROM dbo.reviews r
                 LEFT JOIN dbo.users u ON r.user_id = u.user_id
                 LEFT JOIN dbo.comments c ON r.review_id = c.review_id
                 WHERE r.product_id = $1
                 GROUP BY r.review_id, r.product_id, r.user_id, r.title, r.content, 
                          r.rating, r.created_at, r.updated_at, u.username, u.avatar_url, u.is_verified
                 ORDER BY r.created_at DESC`,
                [productId]
            );

            // For each review, get its category ratings and top-level comments
            const reviewsWithDetails = await Promise.all(
                reviewsResult.rows.map(async (review) => {
                    // Get category ratings for this review
                    const categoryRatingsForReview = await pool.query(
                        `SELECT category, score, created_at
                         FROM dbo.category_ratings
                         WHERE review_id = $1
                         ORDER BY category`,
                        [review.review_id]
                    );

                    // Get top-level comments for this review
                    const commentsResult = await pool.query(
                        `SELECT 
                            c.comment_id,
                            c.review_id,
                            c.user_id,
                            c.parent_comment_id,
                            c.content,
                            c.created_at,
                            c.updated_at,
                            u.username,
                            u.avatar_url,
                            u.is_verified as user_verified
                         FROM dbo.comments c
                         LEFT JOIN dbo.users u ON c.user_id = u.user_id
                         WHERE c.review_id = $1 AND c.parent_comment_id IS NULL
                         ORDER BY c.created_at ASC`,
                        [review.review_id]
                    );

                    // For each top-level comment, get its replies
                    const commentsWithReplies = await Promise.all(
                        commentsResult.rows.map(async (comment) => {
                            const repliesResult = await pool.query(
                                `SELECT 
                                    c.comment_id,
                                    c.review_id,
                                    c.user_id,
                                    c.parent_comment_id,
                                    c.content,
                                    c.created_at,
                                    c.updated_at,
                                    u.username,
                                    u.avatar_url,
                                    u.is_verified as user_verified
                                 FROM dbo.comments c
                                 LEFT JOIN dbo.users u ON c.user_id = u.user_id
                                 WHERE c.parent_comment_id = $1
                                 ORDER BY c.created_at ASC`,
                                [comment.comment_id]
                            );

                            return {
                                ...comment,
                                replies: repliesResult.rows
                            };
                        })
                    );

                    return {
                        ...review,
                        category_ratings: categoryRatingsForReview.rows,
                        comments: commentsWithReplies
                    };
                })
            );

            // Calculate recommendation percentage (ratings 7+ out of 10)
            const recommendationPercentage = ratingStats.total_reviews > 0 
                ? Math.round(((parseInt(ratingStats.excellent_count) + parseInt(ratingStats.good_count)) / parseInt(ratingStats.total_reviews)) * 100)
                : 0;

            const dashboardData = {
                product: product,
                rating_statistics: {
                    total_reviews: parseInt(ratingStats.total_reviews),
                    average_rating: parseFloat(ratingStats.average_rating).toFixed(1),
                    min_rating: parseInt(ratingStats.min_rating),
                    max_rating: parseInt(ratingStats.max_rating),
                    recommendation_percentage: recommendationPercentage,
                    rating_distribution: ratingDistribution,
                    quality_breakdown: {
                        excellent: parseInt(ratingStats.excellent_count), // 8-10
                        good: parseInt(ratingStats.good_count),           // 6-7
                        average: parseInt(ratingStats.average_count),     // 4-5
                        poor: parseInt(ratingStats.poor_count)            // 1-3
                    }
                },
                category_ratings: categoryRatingsResult.rows.map(row => ({
                    category: row.category,
                    average_score: parseFloat(row.average_score).toFixed(1),
                    rating_count: parseInt(row.rating_count)
                })),
                reviews: reviewsWithDetails
            };

            return {
                status: 200,
                jsonBody: dashboardData
            };

        } catch (error) {
            context.error('Error in productDashboard function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    })
}); 