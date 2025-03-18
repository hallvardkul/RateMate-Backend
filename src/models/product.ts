export interface Product {
    product_id: number;
    product_name: string;
    product_category: string;
    brand: string;
}

export interface CreateProductRequest {
    product_name: string;
    product_category: string;
    brand: string;
} 