import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { withGuards } from "../utils/corsMiddleware";
import { requireAuth } from "../utils/authMiddleware";
import { CreateReviewRequest, UpdateReviewRequest } from "../models/review";
import { 
    getReviewsByProductId, 
    getReviewById, 
    createReview, 
    updateReview, 
    deleteReview,
    getRatingCategories
} from "../services/reviewService";

// Reviews endpoint - handles all review operations
app.http('reviews', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: "reviews/{id?}",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const method = request.method;
            const id = request.params.id;
            const productId = request.query.get('productId');
            const categoriesOnly = request.query.get('categoriesOnly') === 'true';
            
            // Special endpoint to get all rating categories
            if (categoriesOnly && method === 'GET') {
                const categories = await getRatingCategories(context);
                return {
                    status: 200,
                    jsonBody: categories
                };
            }
            
            // GET requests can be public (no auth required)
            if (method === 'GET') {
                // Get a specific review by ID
                if (id) {
                    const reviewId = parseInt(id);
                    if (isNaN(reviewId)) {
                        return {
                            status: 400,
                            jsonBody: { error: "Invalid review ID" }
                        };
                    }
                    
                    const review = await getReviewById(reviewId, context);
                    if (!review) {
                        return {
                            status: 404,
                            jsonBody: { error: `Review with ID ${reviewId} not found` }
                        };
                    }
                    
                    return {
                        status: 200,
                        jsonBody: review
                    };
                }
                
                // Get all reviews for a product
                if (productId) {
                    const prodId = parseInt(productId);
                    if (isNaN(prodId)) {
                        return {
                            status: 400,
                            jsonBody: { error: "Invalid product ID" }
                        };
                    }
                    
                    const reviews = await getReviewsByProductId(prodId, context);
                    return {
                        status: 200,
                        jsonBody: reviews
                    };
                }
                
                return {
                    status: 400,
                    jsonBody: { error: "Missing required parameter: productId" }
                };
            }
            
            // All other methods require authentication
            const user = await requireAuth(request, context);
            
            // POST - Create a new review
            if (method === 'POST') {
                const reviewData = await request.json() as CreateReviewRequest;
                
                if (!reviewData || !reviewData.product_id || !reviewData.title || 
                    !reviewData.content || !reviewData.rating) {
                    return {
                        status: 400,
                        jsonBody: { error: "Missing required fields: product_id, title, content, rating" }
                    };
                }
                
                if (reviewData.rating < 1 || reviewData.rating > 10) {
                    return {
                        status: 400,
                        jsonBody: { error: "Rating must be between 1 and 10" }
                    };
                }
                
                // Validate category ratings if provided
                if (reviewData.category_ratings) {
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
                        const score = reviewData.category_ratings[category as keyof typeof reviewData.category_ratings];
                        if (score !== undefined && (score < 1 || score > 10)) {
                            return {
                                status: 400,
                                jsonBody: { error: `${category} rating must be between 1 and 10` }
                            };
                        }
                    }
                }
                
                try {
                    const newReview = await createReview(user.userId, reviewData, context);
                    return {
                        status: 201,
                        jsonBody: newReview
                    };
                } catch (error) {
                    if (error instanceof Error) {
                        if (error.message.includes('already reviewed')) {
                            return {
                                status: 409,
                                jsonBody: { error: error.message }
                            };
                        }
                        if (error.message.includes('not found')) {
                            return {
                                status: 404,
                                jsonBody: { error: error.message }
                            };
                        }
                    }
                    throw error;
                }
            }
            
            // PUT - Update an existing review
            if (method === 'PUT') {
                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: "Review ID is required" }
                    };
                }
                
                const reviewId = parseInt(id);
                if (isNaN(reviewId)) {
                    return {
                        status: 400,
                        jsonBody: { error: "Invalid review ID" }
                    };
                }
                
                const updates = await request.json() as UpdateReviewRequest;
                if (!updates || (!updates.title && !updates.content && updates.rating === undefined && !updates.category_ratings)) {
                    return {
                        status: 400,
                        jsonBody: { error: "No update fields provided" }
                    };
                }
                
                if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 10)) {
                    return {
                        status: 400,
                        jsonBody: { error: "Rating must be between 1 and 10" }
                    };
                }
                
                // Validate category ratings if provided
                if (updates.category_ratings) {
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
                        const score = updates.category_ratings[category as keyof typeof updates.category_ratings];
                        if (score !== undefined && (score < 1 || score > 10)) {
                            return {
                                status: 400,
                                jsonBody: { error: `${category} rating must be between 1 and 10` }
                            };
                        }
                    }
                }
                
                const updatedReview = await updateReview(reviewId, user.userId, updates, context);
                if (!updatedReview) {
                    return {
                        status: 404,
                        jsonBody: { error: `Review with ID ${reviewId} not found or you don't have permission to update it` }
                    };
                }
                
                return {
                    status: 200,
                    jsonBody: updatedReview
                };
            }
            
            // DELETE - Delete a review
            if (method === 'DELETE') {
                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: "Review ID is required" }
                    };
                }
                
                const reviewId = parseInt(id);
                if (isNaN(reviewId)) {
                    return {
                        status: 400,
                        jsonBody: { error: "Invalid review ID" }
                    };
                }
                
                const deletedReview = await deleteReview(reviewId, user.userId, context);
                if (!deletedReview) {
                    return {
                        status: 404,
                        jsonBody: { error: `Review with ID ${reviewId} not found or you don't have permission to delete it` }
                    };
                }
                
                return {
                    status: 200,
                    jsonBody: {
                        message: `Review with ID ${reviewId} successfully deleted`,
                        review: deletedReview
                    }
                };
            }
            
            return {
                status: 405,
                jsonBody: { error: "Method not allowed" }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.log('Error in reviews function:', error);
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