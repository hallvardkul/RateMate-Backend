import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { 
    getAllCategories, 
    getActiveCategories, 
    getCategoryById, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    getAllSubcategories,
    getActiveSubcategories,
    getSubcategoriesByCategory,
    getSubcategoryById,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory
} from "../services/productCategoryService";
import { requireAuth, isAdmin, AuthUser } from "../utils/authMiddleware";
import { 
    CreateProductCategoryRequest, 
    UpdateProductCategoryRequest, 
    CreateProductSubcategoryRequest, 
    UpdateProductSubcategoryRequest 
} from "../models/productCategory";
import { setupDbContext } from "../database/dbMiddleware";
import { withGuards } from '../utils/corsMiddleware';

// Get all categories or active categories
app.http('getCategories', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: "categories",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            const activeOnly = request.query.get('activeOnly') === 'true';
            
            const categories = activeOnly 
                ? await getActiveCategories(context) 
                : await getAllCategories(context);
            
            return { status: 200, jsonBody: categories };
        } catch (error: any) {
            context.log('Error in getCategories:', error);
            return { status: 500, jsonBody: { error: "Failed to retrieve categories" } };
        }
    })
});

// Get a specific category by ID
app.http('getCategoryById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "categories/{categoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            const categoryId = parseInt(request.params.categoryId);
            
            if (isNaN(categoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid category ID" }
                };
            }
            
            const category = await getCategoryById(categoryId, context);
            
            if (!category) {
                return {
                    status: 404,
                    jsonBody: { error: `Category with ID ${categoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: category
            };
        } catch (error: any) {
            context.log('Error in getCategoryById:', error);
            return {
                status: 500,
                jsonBody: { error: "Failed to retrieve category" }
            };
        }
    }
});

// Create a new category (admin only)
app.http('createCategory', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "categories",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const requestBody = await request.json() as CreateProductCategoryRequest;
            
            // Validate request body
            if (!requestBody.category_name) {
                return {
                    status: 400,
                    jsonBody: { error: "Category name is required" }
                };
            }
            
            const newCategory = await createCategory(requestBody, context);
            
            return {
                status: 201,
                jsonBody: newCategory
            };
        } catch (error: any) {
            context.log('Error in createCategory:', error);
            
            if (error.message && error.message.includes('already exists')) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to create category" }
            };
        }
    }
});

// Update a category (admin only)
app.http('updateCategory', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: "categories/{categoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const categoryId = parseInt(request.params.categoryId);
            
            if (isNaN(categoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid category ID" }
                };
            }
            
            const requestBody = await request.json() as UpdateProductCategoryRequest;
            
            // Validate that at least one field is provided
            if (Object.keys(requestBody).length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: "At least one field must be provided for update" }
                };
            }
            
            const updatedCategory = await updateCategory(categoryId, requestBody, context);
            
            if (!updatedCategory) {
                return {
                    status: 404,
                    jsonBody: { error: `Category with ID ${categoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: updatedCategory
            };
        } catch (error: any) {
            context.log('Error in updateCategory:', error);
            
            if (error.message && error.message.includes('already exists')) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to update category" }
            };
        }
    }
});

// Delete a category (admin only)
app.http('deleteCategory', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: "categories/{categoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const categoryId = parseInt(request.params.categoryId);
            
            if (isNaN(categoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid category ID" }
                };
            }
            
            const deletedCategory = await deleteCategory(categoryId, context);
            
            if (!deletedCategory) {
                return {
                    status: 404,
                    jsonBody: { error: `Category with ID ${categoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: {
                    message: `Category with ID ${categoryId} successfully deleted`,
                    category: deletedCategory
                }
            };
        } catch (error: any) {
            context.log('Error in deleteCategory:', error);
            
            if (error.message && (
                error.message.includes('has subcategories') || 
                error.message.includes('has products')
            )) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to delete category" }
            };
        }
    }
});

// Get all subcategories or active subcategories
app.http('getSubcategories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "subcategories",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            const activeOnly = request.query.get('activeOnly') === 'true';
            
            const subcategories = activeOnly 
                ? await getActiveSubcategories(context) 
                : await getAllSubcategories(context);
            
            return {
                status: 200,
                jsonBody: subcategories
            };
        } catch (error: any) {
            context.log('Error in getSubcategories:', error);
            return {
                status: 500,
                jsonBody: { error: "Failed to retrieve subcategories" }
            };
        }
    }
});

// Get subcategories for a specific category
app.http('getSubcategoriesByCategory', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "categories/{categoryId}/subcategories",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            const categoryId = parseInt(request.params.categoryId);
            
            if (isNaN(categoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid category ID" }
                };
            }
            
            const activeOnly = request.query.get('activeOnly') === 'true';
            
            // Check if category exists
            const category = await getCategoryById(categoryId, context);
            
            if (!category) {
                return {
                    status: 404,
                    jsonBody: { error: `Category with ID ${categoryId} not found` }
                };
            }
            
            const subcategories = await getSubcategoriesByCategory(categoryId, activeOnly, context);
            
            return {
                status: 200,
                jsonBody: subcategories
            };
        } catch (error: any) {
            context.log('Error in getSubcategoriesByCategory:', error);
            return {
                status: 500,
                jsonBody: { error: "Failed to retrieve subcategories" }
            };
        }
    }
});

// Get a specific subcategory by ID
app.http('getSubcategoryById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "subcategories/{subcategoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            const subcategoryId = parseInt(request.params.subcategoryId);
            
            if (isNaN(subcategoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid subcategory ID" }
                };
            }
            
            const subcategory = await getSubcategoryById(subcategoryId, context);
            
            if (!subcategory) {
                return {
                    status: 404,
                    jsonBody: { error: `Subcategory with ID ${subcategoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: subcategory
            };
        } catch (error: any) {
            context.log('Error in getSubcategoryById:', error);
            return {
                status: 500,
                jsonBody: { error: "Failed to retrieve subcategory" }
            };
        }
    }
});

// Create a new subcategory (admin only)
app.http('createSubcategory', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "subcategories",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const requestBody = await request.json() as CreateProductSubcategoryRequest;
            
            // Validate request body
            if (!requestBody.parent_category_id || !requestBody.subcategory_name) {
                return {
                    status: 400,
                    jsonBody: { error: "Parent category ID and subcategory name are required" }
                };
            }
            
            const newSubcategory = await createSubcategory(requestBody, context);
            
            return {
                status: 201,
                jsonBody: newSubcategory
            };
        } catch (error: any) {
            context.log('Error in createSubcategory:', error);
            
            if (error.message && error.message.includes('not found')) {
                return {
                    status: 404,
                    jsonBody: { error: error.message }
                };
            }
            
            if (error.message && error.message.includes('already exists')) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to create subcategory" }
            };
        }
    }
});

// Update a subcategory (admin only)
app.http('updateSubcategory', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: "subcategories/{subcategoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const subcategoryId = parseInt(request.params.subcategoryId);
            
            if (isNaN(subcategoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid subcategory ID" }
                };
            }
            
            const requestBody = await request.json() as UpdateProductSubcategoryRequest;
            
            // Validate that at least one field is provided
            if (Object.keys(requestBody).length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: "At least one field must be provided for update" }
                };
            }
            
            const updatedSubcategory = await updateSubcategory(subcategoryId, requestBody, context);
            
            if (!updatedSubcategory) {
                return {
                    status: 404,
                    jsonBody: { error: `Subcategory with ID ${subcategoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: updatedSubcategory
            };
        } catch (error: any) {
            context.log('Error in updateSubcategory:', error);
            
            if (error.message && error.message.includes('not found')) {
                return {
                    status: 404,
                    jsonBody: { error: error.message }
                };
            }
            
            if (error.message && error.message.includes('already exists')) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to update subcategory" }
            };
        }
    }
});

// Delete a subcategory (admin only)
app.http('deleteSubcategory', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: "subcategories/{subcategoryId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Set up database context
            setupDbContext(context);
            
            // Check authentication
            let user: AuthUser;
            try {
                user = await requireAuth(request, context);
            } catch (error) {
                return {
                    status: 401,
                    jsonBody: { error: "Authentication required" }
                };
            }
            
            // Check admin status
            if (!isAdmin(user)) {
                return {
                    status: 403,
                    jsonBody: { error: "Admin access required" }
                };
            }
            
            const subcategoryId = parseInt(request.params.subcategoryId);
            
            if (isNaN(subcategoryId)) {
                return {
                    status: 400,
                    jsonBody: { error: "Invalid subcategory ID" }
                };
            }
            
            const deletedSubcategory = await deleteSubcategory(subcategoryId, context);
            
            if (!deletedSubcategory) {
                return {
                    status: 404,
                    jsonBody: { error: `Subcategory with ID ${subcategoryId} not found` }
                };
            }
            
            return {
                status: 200,
                jsonBody: {
                    message: `Subcategory with ID ${subcategoryId} successfully deleted`,
                    subcategory: deletedSubcategory
                }
            };
        } catch (error: any) {
            context.log('Error in deleteSubcategory:', error);
            
            if (error.message && error.message.includes('has products')) {
                return {
                    status: 409,
                    jsonBody: { error: error.message }
                };
            }
            
            return {
                status: 500,
                jsonBody: { error: "Failed to delete subcategory" }
            };
        }
    }
}); 