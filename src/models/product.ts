export interface Product {
    product_id: number;
    product_name: string;
    description: string;
    brand_id: number;
    category_id: number;
    // optional for joined data
    brand_name?: string;
    category_name?: string;
}

export interface CreateProductRequest {
    product_name: string;
    description?: string;
    brand_id: number;
    category_id: number;
} 