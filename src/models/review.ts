export interface Review {
    review_id: number;
    product_id: number;
    user_id: number;
    title: string;
    content: string;
    rating: number;
    created_at: Date;
    updated_at: Date;
    // Optional fields for API responses
    username?: string;
    product_name?: string;
    category_ratings?: CategoryRating[];
}

export interface CategoryRating {
    rating_id?: number;
    review_id: number;
    category: string;
    score: number;
    created_at?: Date;
}

export interface RatingCategory {
    category_id: number;
    category_name: string;
    description: string;
    is_active: boolean;
}

export interface CreateReviewRequest {
    product_id: number;
    title: string;
    content: string;
    rating: number;
    category_ratings?: {
        value_for_money?: number;
        build_quality?: number;
        functionality?: number;
        durability?: number;
        ease_of_use?: number;
        aesthetics?: number;
        compatibility?: number;
    };
}

export interface UpdateReviewRequest {
    title?: string;
    content?: string;
    rating?: number;
    category_ratings?: {
        value_for_money?: number;
        build_quality?: number;
        functionality?: number;
        durability?: number;
        ease_of_use?: number;
        aesthetics?: number;
        compatibility?: number;
    };
}

export interface ReviewResponse extends Review {
    comments_count?: number;
    average_category_rating?: number;
} 