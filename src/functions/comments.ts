import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { requireAuth } from "../utils/authMiddleware";
import { CreateCommentRequest, UpdateCommentRequest } from "../models/comment";
import { 
    getCommentsByReviewId, 
    getRepliesByCommentId,
    getCommentById, 
    createComment, 
    updateComment, 
    deleteComment 
} from "../services/commentService";
import { withGuards } from '../utils/corsMiddleware';

// Comments endpoint - handles all comment operations
app.http('comments', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: "comments/{id?}",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const method = request.method;
            const id = request.params.id;
            const reviewId = request.query.get('reviewId');
            const parentId = request.query.get('parentId');
            
            // GET requests can be public (no auth required)
            if (method === 'GET') {
                // Get a specific comment by ID
                if (id) {
                    const commentId = parseInt(id);
                    if (isNaN(commentId)) {
                        return {
                            status: 400,
                            jsonBody: { error: "Invalid comment ID" }
                        };
                    }
                    
                    const comment = await getCommentById(commentId, context);
                    if (!comment) {
                        return {
                            status: 404,
                            jsonBody: { error: `Comment with ID ${commentId} not found` }
                        };
                    }
                    
                    return {
                        status: 200,
                        jsonBody: comment
                    };
                }
                
                // Get replies to a comment
                if (parentId) {
                    const parentCommentId = parseInt(parentId);
                    if (isNaN(parentCommentId)) {
                        return {
                            status: 400,
                            jsonBody: { error: "Invalid parent comment ID" }
                        };
                    }
                    
                    const replies = await getRepliesByCommentId(parentCommentId, context);
                    return {
                        status: 200,
                        jsonBody: replies
                    };
                }
                
                // Get all comments for a review
                if (reviewId) {
                    const revId = parseInt(reviewId);
                    if (isNaN(revId)) {
                        return {
                            status: 400,
                            jsonBody: { error: "Invalid review ID" }
                        };
                    }
                    
                    const comments = await getCommentsByReviewId(revId, context);
                    return {
                        status: 200,
                        jsonBody: comments
                    };
                }
                
                return {
                    status: 400,
                    jsonBody: { error: "Missing required parameter: reviewId or parentId" }
                };
            }
            
            // All other methods require authentication
            const user = await requireAuth(request, context);
            
            // POST - Create a new comment
            if (method === 'POST') {
                const commentData = await request.json() as CreateCommentRequest;
                
                if (!commentData || !commentData.review_id || !commentData.content) {
                    return {
                        status: 400,
                        jsonBody: { error: "Missing required fields: review_id, content" }
                    };
                }
                
                try {
                    const newComment = await createComment(user.userId, commentData, context);
                    return {
                        status: 201,
                        jsonBody: newComment
                    };
                } catch (error) {
                    if (error instanceof Error) {
                        if (error.message.includes('not found')) {
                            return {
                                status: 404,
                                jsonBody: { error: error.message }
                            };
                        }
                        if (error.message.includes('parent comment')) {
                            return {
                                status: 400,
                                jsonBody: { error: error.message }
                            };
                        }
                    }
                    throw error;
                }
            }
            
            // PUT - Update an existing comment
            if (method === 'PUT') {
                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: "Comment ID is required" }
                    };
                }
                
                const commentId = parseInt(id);
                if (isNaN(commentId)) {
                    return {
                        status: 400,
                        jsonBody: { error: "Invalid comment ID" }
                    };
                }
                
                const updates = await request.json() as UpdateCommentRequest;
                if (!updates || !updates.content) {
                    return {
                        status: 400,
                        jsonBody: { error: "Content is required for update" }
                    };
                }
                
                const updatedComment = await updateComment(commentId, user.userId, updates, context);
                if (!updatedComment) {
                    return {
                        status: 404,
                        jsonBody: { error: `Comment with ID ${commentId} not found or you don't have permission to update it` }
                    };
                }
                
                return {
                    status: 200,
                    jsonBody: updatedComment
                };
            }
            
            // DELETE - Delete a comment
            if (method === 'DELETE') {
                if (!id) {
                    return {
                        status: 400,
                        jsonBody: { error: "Comment ID is required" }
                    };
                }
                
                const commentId = parseInt(id);
                if (isNaN(commentId)) {
                    return {
                        status: 400,
                        jsonBody: { error: "Invalid comment ID" }
                    };
                }
                
                const deletedComment = await deleteComment(commentId, user.userId, context);
                if (!deletedComment) {
                    return {
                        status: 404,
                        jsonBody: { error: `Comment with ID ${commentId} not found or you don't have permission to delete it` }
                    };
                }
                
                return {
                    status: 200,
                    jsonBody: {
                        message: `Comment with ID ${commentId} successfully deleted`,
                        comment: deletedComment
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
            
            context.log('Error in comments function:', error);
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