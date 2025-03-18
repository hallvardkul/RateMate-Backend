export interface Comment {
    comment_id: number;
    review_id: number;
    user_id: number;
    parent_comment_id: number | null;
    content: string;
    created_at: Date;
    updated_at: Date;
    // Optional fields for API responses
    username?: string;
    replies?: Comment[];
}

export interface CreateCommentRequest {
    review_id: number;
    parent_comment_id?: number;
    content: string;
}

export interface UpdateCommentRequest {
    content: string;
}

export interface CommentResponse extends Comment {
    replies_count?: number;
} 