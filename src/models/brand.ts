export interface Brand {
    brand_id: number;
    brand_name: string;
    created_at?: Date;
}

export interface CreateBrandRequest {
    brand_name: string;
} 