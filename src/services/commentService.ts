import { InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { Comment, CreateCommentRequest, UpdateCommentRequest, CommentResponse } from "../models/comment";

export async function getCommentsByReviewId(reviewId: number, context: InvocationContext): Promise<CommentResponse[]> {
    try {
        // Get all top-level comments (no parent_comment_id)
        const query = `
            SELECT c.*, u.username,
                   (SELECT COUNT(*) FROM dbo.comments WHERE parent_comment_id = c.comment_id) as replies_count
            FROM dbo.comments c
            JOIN dbo.users u ON c.user_id = u.user_id
            WHERE c.review_id = $1 AND c.parent_comment_id IS NULL
            ORDER BY c.created_at ASC
        `;
        const result = await pool.query(query, [reviewId]);
        
        // For each top-level comment, get its replies
        const topLevelComments = result.rows;
        for (const comment of topLevelComments) {
            comment.replies = await getRepliesByCommentId(comment.comment_id, context);
        }
        
        return topLevelComments;
    } catch (err) {
        context.log('Error in getCommentsByReviewId:', err);
        throw err;
    }
}

export async function getRepliesByCommentId(commentId: number, context: InvocationContext): Promise<Comment[]> {
    try {
        const query = `
            SELECT c.*, u.username
            FROM dbo.comments c
            JOIN dbo.users u ON c.user_id = u.user_id
            WHERE c.parent_comment_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await pool.query(query, [commentId]);
        return result.rows;
    } catch (err) {
        context.log('Error in getRepliesByCommentId:', err);
        throw err;
    }
}

export async function getCommentById(commentId: number, context: InvocationContext): Promise<Comment | null> {
    try {
        const query = `
            SELECT c.*, u.username
            FROM dbo.comments c
            JOIN dbo.users u ON c.user_id = u.user_id
            WHERE c.comment_id = $1
        `;
        const result = await pool.query(query, [commentId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    } catch (err) {
        context.log('Error in getCommentById:', err);
        throw err;
    }
}

export async function createComment(
    userId: number, 
    comment: CreateCommentRequest, 
    context: InvocationContext
): Promise<Comment> {
    try {
        // First, verify that the review exists
        const reviewCheck = await pool.query(
            'SELECT review_id FROM dbo.reviews WHERE review_id = $1',
            [comment.review_id]
        );
        
        if (reviewCheck.rows.length === 0) {
            throw new Error(`Review with ID ${comment.review_id} not found`);
        }
        
        // If this is a reply, verify that the parent comment exists and belongs to the same review
        if (comment.parent_comment_id) {
            const parentCheck = await pool.query(
                'SELECT review_id FROM dbo.comments WHERE comment_id = $1',
                [comment.parent_comment_id]
            );
            
            if (parentCheck.rows.length === 0) {
                throw new Error(`Parent comment with ID ${comment.parent_comment_id} not found`);
            }
            
            if (parentCheck.rows[0].review_id !== comment.review_id) {
                throw new Error('Parent comment does not belong to the specified review');
            }
        }
        
        // Create the comment
        const query = `
            INSERT INTO dbo.comments (review_id, user_id, parent_comment_id, content, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const values = [
            comment.review_id,
            userId,
            comment.parent_comment_id || null,
            comment.content
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        context.log('Error in createComment:', err);
        throw err;
    }
}

export async function updateComment(
    commentId: number,
    userId: number,
    updates: UpdateCommentRequest,
    context: InvocationContext
): Promise<Comment | null> {
    try {
        // Check if the comment exists and belongs to the user
        const commentCheck = await pool.query(
            'SELECT comment_id FROM dbo.comments WHERE comment_id = $1 AND user_id = $2',
            [commentId, userId]
        );
        
        if (commentCheck.rows.length === 0) {
            return null; // Comment not found or doesn't belong to user
        }
        
        // Update the comment
        const query = `
            UPDATE dbo.comments 
            SET content = $1, updated_at = CURRENT_TIMESTAMP
            WHERE comment_id = $2
            RETURNING *
        `;
        
        const result = await pool.query(query, [updates.content, commentId]);
        return result.rows[0];
    } catch (err) {
        context.log('Error in updateComment:', err);
        throw err;
    }
}

export async function deleteComment(
    commentId: number,
    userId: number,
    context: InvocationContext
): Promise<Comment | null> {
    try {
        // Check if the comment exists and belongs to the user
        const commentCheck = await pool.query(
            'SELECT * FROM dbo.comments WHERE comment_id = $1 AND user_id = $2',
            [commentId, userId]
        );
        
        if (commentCheck.rows.length === 0) {
            return null; // Comment not found or doesn't belong to user
        }
        
        // Delete the comment (replies will be deleted automatically due to CASCADE)
        const query = 'DELETE FROM dbo.comments WHERE comment_id = $1 RETURNING *';
        const result = await pool.query(query, [commentId]);
        
        return result.rows[0];
    } catch (err) {
        context.log('Error in deleteComment:', err);
        throw err;
    }
} 