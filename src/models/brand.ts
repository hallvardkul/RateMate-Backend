export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Brand {
    brand_id: number;
    user_id: number; // Foreign key to users table
    brand_name: string;
    brand_description?: string;
    logo_url?: string;
    website?: string;
    contact_email?: string;
    phone?: string;
    address?: string;
    verification_status: VerificationStatus;
    created_at: Date;
    updated_at: Date;
}

export interface CreateBrandRequest {
    brand_name: string;
    brand_description?: string;
    website?: string;
    contact_email?: string;
    phone?: string;
    address?: string;
}

export interface UpdateBrandRequest {
    brand_name?: string;
    brand_description?: string;
    logo_url?: string;
    website?: string;
    contact_email?: string;
    phone?: string;
    address?: string;
}

export interface BrandProfile extends Brand {
    // Additional fields for profile display
    username?: string; // From linked user account
    followers_count?: number;
    products_count?: number;
    average_rating?: number;
    total_reviews?: number;
}

export interface BrandFollower {
    follow_id: number;
    brand_id: number;
    user_id: number;
    created_at: Date;
} 