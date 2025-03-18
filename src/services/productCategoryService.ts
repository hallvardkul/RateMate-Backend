import { InvocationContext } from "@azure/functions";
import { 
    ProductCategory, 
    CreateProductCategoryRequest, 
    UpdateProductCategoryRequest,
    ProductSubcategory,
    ProductSubcategoryWithParent,
    CreateProductSubcategoryRequest,
    UpdateProductSubcategoryRequest
} from "../models/productCategory";

// Extend InvocationContext to include db property
declare module "@azure/functions" {
    interface InvocationContext {
        db: {
            query: (text: string, params?: any[]) => Promise<{ rows: any[], rowCount: number }>;
        };
    }
}

// Category CRUD operations
export async function getAllCategories(context: InvocationContext): Promise<ProductCategory[]> {
    try {
        const result = await context.db.query(
            'SELECT * FROM dbo.product_categories ORDER BY category_name'
        );
        return result.rows;
    } catch (error) {
        context.log('Error getting all categories:', error);
        throw error;
    }
}

export async function getActiveCategories(context: InvocationContext): Promise<ProductCategory[]> {
    try {
        const result = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE is_active = true ORDER BY category_name'
        );
        return result.rows;
    } catch (error) {
        context.log('Error getting active categories:', error);
        throw error;
    }
}

export async function getCategoryById(categoryId: number, context: InvocationContext): Promise<ProductCategory | null> {
    try {
        const result = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE category_id = $1',
            [categoryId]
        );
        
        if (result.rowCount === 0) {
            return null;
        }
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error getting category with ID ${categoryId}:`, error);
        throw error;
    }
}

export async function createCategory(category: CreateProductCategoryRequest, context: InvocationContext): Promise<ProductCategory> {
    try {
        // Check if category with same name already exists
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE category_name = $1',
            [category.category_name]
        );
        
        if (existingResult.rowCount > 0) {
            throw new Error(`Category with name '${category.category_name}' already exists`);
        }
        
        const result = await context.db.query(
            `INSERT INTO dbo.product_categories 
            (category_name, description, is_active) 
            VALUES ($1, $2, $3) 
            RETURNING *`,
            [
                category.category_name,
                category.description || null,
                category.is_active !== undefined ? category.is_active : true
            ]
        );
        
        return result.rows[0];
    } catch (error) {
        context.log('Error creating category:', error);
        throw error;
    }
}

export async function updateCategory(
    categoryId: number, 
    updates: UpdateProductCategoryRequest, 
    context: InvocationContext
): Promise<ProductCategory | null> {
    try {
        // Check if category exists
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE category_id = $1',
            [categoryId]
        );
        
        if (existingResult.rowCount === 0) {
            return null;
        }
        
        // Check if updating to a name that already exists
        if (updates.category_name) {
            const nameCheckResult = await context.db.query(
                'SELECT * FROM dbo.product_categories WHERE category_name = $1 AND category_id != $2',
                [updates.category_name, categoryId]
            );
            
            if (nameCheckResult.rowCount > 0) {
                throw new Error(`Category with name '${updates.category_name}' already exists`);
            }
        }
        
        // Build the update query dynamically based on provided fields
        const setClause: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;
        
        if (updates.category_name !== undefined) {
            setClause.push(`category_name = $${paramIndex++}`);
            queryParams.push(updates.category_name);
        }
        
        if (updates.description !== undefined) {
            setClause.push(`description = $${paramIndex++}`);
            queryParams.push(updates.description);
        }
        
        if (updates.is_active !== undefined) {
            setClause.push(`is_active = $${paramIndex++}`);
            queryParams.push(updates.is_active);
        }
        
        // If no updates provided, return the existing category
        if (setClause.length === 0) {
            return existingResult.rows[0];
        }
        
        // Add the category ID as the last parameter
        queryParams.push(categoryId);
        
        const result = await context.db.query(
            `UPDATE dbo.product_categories 
            SET ${setClause.join(', ')} 
            WHERE category_id = $${paramIndex} 
            RETURNING *`,
            queryParams
        );
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error updating category with ID ${categoryId}:`, error);
        throw error;
    }
}

export async function deleteCategory(categoryId: number, context: InvocationContext): Promise<ProductCategory | null> {
    try {
        // Check if category exists
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE category_id = $1',
            [categoryId]
        );
        
        if (existingResult.rowCount === 0) {
            return null;
        }
        
        // Check if category has subcategories
        const subcategoriesResult = await context.db.query(
            'SELECT COUNT(*) FROM dbo.product_subcategories WHERE parent_category_id = $1',
            [categoryId]
        );
        
        if (parseInt(subcategoriesResult.rows[0].count) > 0) {
            throw new Error(`Cannot delete category with ID ${categoryId} because it has subcategories`);
        }
        
        // Check if category has products
        const productsResult = await context.db.query(
            `SELECT COUNT(*) FROM dbo.products p
            JOIN dbo.product_subcategories ps ON p.subcategory_id = ps.subcategory_id
            WHERE ps.parent_category_id = $1`,
            [categoryId]
        );
        
        if (parseInt(productsResult.rows[0].count) > 0) {
            throw new Error(`Cannot delete category with ID ${categoryId} because it has products`);
        }
        
        const result = await context.db.query(
            'DELETE FROM dbo.product_categories WHERE category_id = $1 RETURNING *',
            [categoryId]
        );
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error deleting category with ID ${categoryId}:`, error);
        throw error;
    }
}

// Subcategory CRUD operations
export async function getAllSubcategories(context: InvocationContext): Promise<ProductSubcategoryWithParent[]> {
    try {
        const result = await context.db.query(
            `SELECT sc.*, pc.category_name as parent_category_name
            FROM dbo.product_subcategories sc
            JOIN dbo.product_categories pc ON sc.parent_category_id = pc.category_id
            ORDER BY pc.category_name, sc.subcategory_name`
        );
        return result.rows;
    } catch (error) {
        context.log('Error getting all subcategories:', error);
        throw error;
    }
}

export async function getActiveSubcategories(context: InvocationContext): Promise<ProductSubcategoryWithParent[]> {
    try {
        const result = await context.db.query(
            `SELECT sc.*, pc.category_name as parent_category_name
            FROM dbo.product_subcategories sc
            JOIN dbo.product_categories pc ON sc.parent_category_id = pc.category_id
            WHERE sc.is_active = true AND pc.is_active = true
            ORDER BY pc.category_name, sc.subcategory_name`
        );
        return result.rows;
    } catch (error) {
        context.log('Error getting active subcategories:', error);
        throw error;
    }
}

export async function getSubcategoriesByCategory(
    categoryId: number, 
    activeOnly: boolean = false,
    context: InvocationContext
): Promise<ProductSubcategory[]> {
    try {
        let query = 'SELECT * FROM dbo.product_subcategories WHERE parent_category_id = $1';
        
        if (activeOnly) {
            query += ' AND is_active = true';
        }
        
        query += ' ORDER BY subcategory_name';
        
        const result = await context.db.query(query, [categoryId]);
        return result.rows;
    } catch (error) {
        context.log(`Error getting subcategories for category ID ${categoryId}:`, error);
        throw error;
    }
}

export async function getSubcategoryById(
    subcategoryId: number, 
    context: InvocationContext
): Promise<ProductSubcategoryWithParent | null> {
    try {
        const result = await context.db.query(
            `SELECT sc.*, pc.category_name as parent_category_name
            FROM dbo.product_subcategories sc
            JOIN dbo.product_categories pc ON sc.parent_category_id = pc.category_id
            WHERE sc.subcategory_id = $1`,
            [subcategoryId]
        );
        
        if (result.rowCount === 0) {
            return null;
        }
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error getting subcategory with ID ${subcategoryId}:`, error);
        throw error;
    }
}

export async function createSubcategory(
    subcategory: CreateProductSubcategoryRequest, 
    context: InvocationContext
): Promise<ProductSubcategory> {
    try {
        // Check if parent category exists
        const categoryResult = await context.db.query(
            'SELECT * FROM dbo.product_categories WHERE category_id = $1',
            [subcategory.parent_category_id]
        );
        
        if (categoryResult.rowCount === 0) {
            throw new Error(`Parent category with ID ${subcategory.parent_category_id} not found`);
        }
        
        // Check if subcategory with same name already exists in this category
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_subcategories WHERE parent_category_id = $1 AND subcategory_name = $2',
            [subcategory.parent_category_id, subcategory.subcategory_name]
        );
        
        if (existingResult.rowCount > 0) {
            throw new Error(`Subcategory with name '${subcategory.subcategory_name}' already exists in this category`);
        }
        
        const result = await context.db.query(
            `INSERT INTO dbo.product_subcategories 
            (parent_category_id, subcategory_name, description, is_active) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *`,
            [
                subcategory.parent_category_id,
                subcategory.subcategory_name,
                subcategory.description || null,
                subcategory.is_active !== undefined ? subcategory.is_active : true
            ]
        );
        
        return result.rows[0];
    } catch (error) {
        context.log('Error creating subcategory:', error);
        throw error;
    }
}

export async function updateSubcategory(
    subcategoryId: number, 
    updates: UpdateProductSubcategoryRequest, 
    context: InvocationContext
): Promise<ProductSubcategory | null> {
    try {
        // Check if subcategory exists
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_subcategories WHERE subcategory_id = $1',
            [subcategoryId]
        );
        
        if (existingResult.rowCount === 0) {
            return null;
        }
        
        const existingSubcategory = existingResult.rows[0];
        
        // If changing parent category, check if it exists
        if (updates.parent_category_id !== undefined && 
            updates.parent_category_id !== existingSubcategory.parent_category_id) {
            
            const categoryResult = await context.db.query(
                'SELECT * FROM dbo.product_categories WHERE category_id = $1',
                [updates.parent_category_id]
            );
            
            if (categoryResult.rowCount === 0) {
                throw new Error(`Parent category with ID ${updates.parent_category_id} not found`);
            }
        }
        
        // Check if updating to a name that already exists in the category
        if (updates.subcategory_name !== undefined && 
            updates.subcategory_name !== existingSubcategory.subcategory_name) {
            
            const parentCategoryId = updates.parent_category_id !== undefined ? 
                updates.parent_category_id : existingSubcategory.parent_category_id;
            
            const nameCheckResult = await context.db.query(
                'SELECT * FROM dbo.product_subcategories WHERE parent_category_id = $1 AND subcategory_name = $2 AND subcategory_id != $3',
                [parentCategoryId, updates.subcategory_name, subcategoryId]
            );
            
            if (nameCheckResult.rowCount > 0) {
                throw new Error(`Subcategory with name '${updates.subcategory_name}' already exists in this category`);
            }
        }
        
        // Build the update query dynamically based on provided fields
        const setClause: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;
        
        if (updates.parent_category_id !== undefined) {
            setClause.push(`parent_category_id = $${paramIndex++}`);
            queryParams.push(updates.parent_category_id);
        }
        
        if (updates.subcategory_name !== undefined) {
            setClause.push(`subcategory_name = $${paramIndex++}`);
            queryParams.push(updates.subcategory_name);
        }
        
        if (updates.description !== undefined) {
            setClause.push(`description = $${paramIndex++}`);
            queryParams.push(updates.description);
        }
        
        if (updates.is_active !== undefined) {
            setClause.push(`is_active = $${paramIndex++}`);
            queryParams.push(updates.is_active);
        }
        
        // If no updates provided, return the existing subcategory
        if (setClause.length === 0) {
            return existingSubcategory;
        }
        
        // Add the subcategory ID as the last parameter
        queryParams.push(subcategoryId);
        
        const result = await context.db.query(
            `UPDATE dbo.product_subcategories 
            SET ${setClause.join(', ')} 
            WHERE subcategory_id = $${paramIndex} 
            RETURNING *`,
            queryParams
        );
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error updating subcategory with ID ${subcategoryId}:`, error);
        throw error;
    }
}

export async function deleteSubcategory(subcategoryId: number, context: InvocationContext): Promise<ProductSubcategory | null> {
    try {
        // Check if subcategory exists
        const existingResult = await context.db.query(
            'SELECT * FROM dbo.product_subcategories WHERE subcategory_id = $1',
            [subcategoryId]
        );
        
        if (existingResult.rowCount === 0) {
            return null;
        }
        
        // Check if subcategory has products
        const productsResult = await context.db.query(
            'SELECT COUNT(*) FROM dbo.products WHERE subcategory_id = $1',
            [subcategoryId]
        );
        
        if (parseInt(productsResult.rows[0].count) > 0) {
            throw new Error(`Cannot delete subcategory with ID ${subcategoryId} because it has products`);
        }
        
        const result = await context.db.query(
            'DELETE FROM dbo.product_subcategories WHERE subcategory_id = $1 RETURNING *',
            [subcategoryId]
        );
        
        return result.rows[0];
    } catch (error) {
        context.log(`Error deleting subcategory with ID ${subcategoryId}:`, error);
        throw error;
    }
} 