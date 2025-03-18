export interface ProductCategory {
    category_id: number;
    category_name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
}

export interface CreateProductCategoryRequest {
    category_name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateProductCategoryRequest {
    category_name?: string;
    description?: string;
    is_active?: boolean;
}

export interface ProductSubcategory {
    subcategory_id: number;
    parent_category_id: number;
    subcategory_name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
}

export interface ProductSubcategoryWithParent extends ProductSubcategory {
    parent_category_name?: string;
}

export interface CreateProductSubcategoryRequest {
    parent_category_id: number;
    subcategory_name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateProductSubcategoryRequest {
    parent_category_id?: number;
    subcategory_name?: string;
    description?: string;
    is_active?: boolean;
} 