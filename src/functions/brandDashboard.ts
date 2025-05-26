import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { requireBrandAuth, BrandUnauthorizedError } from "../utils/brandAuthMiddleware";

interface CreateProductRequest {
    product_name: string;
    product_category?: string;
    subcategory_id?: number;
    category_id?: number;
    description?: string;
}

interface UpdateProductRequest {
    product_name?: string;
    product_category?: string;
    subcategory_id?: number;
    category_id?: number;
    description?: string;
}

// Get Brand Dashboard - Overview of brand's products and stats
app.http('brandDashboard', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "brands/dashboard",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brand = await requireBrandAuth(request, context);

            // Get brand statistics
            const statsQuery = await pool.query(
                `SELECT 
                    COUNT(DISTINCT p.product_id) as total_products,
                    COUNT(DISTINCT r.review_id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    COUNT(DISTINCT r.user_id) as unique_reviewers
                 FROM dbo.brands b
                 LEFT JOIN dbo.products p ON b.brand_id = p.brand_id
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE b.brand_id = $1`,
                [brand.brandId]
            );

            // Get recent products
            const productsQuery = await pool.query(
                `SELECT 
                    p.product_id, p.product_name, p.product_category, p.description,
                    COUNT(DISTINCT r.review_id) as review_count,
                    COALESCE(AVG(r.rating), 0) as average_rating
                 FROM dbo.products p
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE p.brand_id = $1
                 GROUP BY p.product_id, p.product_name, p.product_category, p.description
                 ORDER BY p.product_id DESC
                 LIMIT 10`,
                [brand.brandId]
            );

            // Get recent reviews
            const reviewsQuery = await pool.query(
                `SELECT 
                    r.review_id, r.title, r.content, r.rating, r.created_at,
                    p.product_name, u.username
                 FROM dbo.reviews r
                 JOIN dbo.products p ON r.product_id = p.product_id
                 JOIN dbo.users u ON r.user_id = u.user_id
                 WHERE p.brand_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 5`,
                [brand.brandId]
            );

            const stats = statsQuery.rows[0];
            const products = productsQuery.rows;
            const recentReviews = reviewsQuery.rows;

            return {
                status: 200,
                jsonBody: {
                    brand: {
                        brand_id: brand.brandId,
                        brand_name: brand.brand_name,
                        email: brand.email,
                        is_verified: brand.is_verified
                    },
                    stats: {
                        total_products: parseInt(stats.total_products) || 0,
                        total_reviews: parseInt(stats.total_reviews) || 0,
                        average_rating: parseFloat(stats.average_rating) || 0,
                        unique_reviewers: parseInt(stats.unique_reviewers) || 0
                    },
                    recent_products: products,
                    recent_reviews: recentReviews
                }
            };
        } catch (error) {
            if (error instanceof BrandUnauthorizedError) {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in brandDashboard function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Create Product (Brand Only)
app.http('brandCreateProduct', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "brands/products",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brand = await requireBrandAuth(request, context);
            const body = await request.json() as CreateProductRequest;
            const { product_name, product_category, subcategory_id, category_id, description } = body;

            // Guard clauses for validation
            if (!product_name) {
                return {
                    status: 400,
                    jsonBody: { error: "Product name is required" }
                };
            }

            // Check if product name already exists for this brand
            const existingProduct = await pool.query(
                "SELECT product_id FROM dbo.products WHERE brand_id = $1 AND product_name = $2",
                [brand.brandId, product_name]
            );

            if (existingProduct.rows.length > 0) {
                return {
                    status: 409,
                    jsonBody: { error: "Product with this name already exists for your brand" }
                };
            }

            // Create the product
            const result = await pool.query(
                `INSERT INTO dbo.products (product_name, product_category, brand_id, subcategory_id, category_id, description, brand)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING product_id, product_name, product_category, brand_id, subcategory_id, category_id, description`,
                [product_name, product_category, brand.brandId, subcategory_id, category_id, description, brand.brand_name]
            );

            const product = result.rows[0];

            return {
                status: 201,
                jsonBody: {
                    message: "Product created successfully",
                    product
                }
            };
        } catch (error) {
            if (error instanceof BrandUnauthorizedError) {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in brandCreateProduct function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Get Brand's Products
app.http('getBrandProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "brands/dashboard/products",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brand = await requireBrandAuth(request, context);

            const result = await pool.query(
                `SELECT 
                    p.product_id, p.product_name, p.product_category, p.description,
                    p.subcategory_id, p.category_id,
                    COUNT(DISTINCT r.review_id) as review_count,
                    COALESCE(AVG(r.rating), 0) as average_rating
                 FROM dbo.products p
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE p.brand_id = $1
                 GROUP BY p.product_id, p.product_name, p.product_category, p.description, p.subcategory_id, p.category_id
                 ORDER BY p.product_name`,
                [brand.brandId]
            );

            return {
                status: 200,
                jsonBody: {
                    products: result.rows
                }
            };
        } catch (error) {
            if (error instanceof BrandUnauthorizedError) {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in getBrandProducts function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Update Product (Brand Only)
app.http('brandUpdateProduct', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: "brands/products/{productId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brand = await requireBrandAuth(request, context);
            const productId = request.params.productId;

            if (!productId) {
                return {
                    status: 400,
                    jsonBody: { error: "Product ID is required" }
                };
            }

            // Verify the product belongs to this brand
            const productCheck = await pool.query(
                "SELECT brand_id FROM dbo.products WHERE product_id = $1",
                [productId]
            );

            if (productCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            if (productCheck.rows[0].brand_id !== brand.brandId) {
                return {
                    status: 403,
                    jsonBody: { error: "You can only update your own products" }
                };
            }

            const updates = await request.json() as UpdateProductRequest;
            
            if (Object.keys(updates).length === 0) {
                return {
                    status: 400,
                    jsonBody: { error: "No update fields provided" }
                };
            }

            // Build dynamic update query
            const updateFields: string[] = [];
            const queryParams: any[] = [];
            let paramIndex = 1;

            if (updates.product_name !== undefined) {
                updateFields.push(`product_name = $${paramIndex++}`);
                queryParams.push(updates.product_name);
            }
            if (updates.product_category !== undefined) {
                updateFields.push(`product_category = $${paramIndex++}`);
                queryParams.push(updates.product_category);
            }
            if (updates.subcategory_id !== undefined) {
                updateFields.push(`subcategory_id = $${paramIndex++}`);
                queryParams.push(updates.subcategory_id);
            }
            if (updates.category_id !== undefined) {
                updateFields.push(`category_id = $${paramIndex++}`);
                queryParams.push(updates.category_id);
            }
            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                queryParams.push(updates.description);
            }

            queryParams.push(productId);

            const query = `UPDATE dbo.products SET ${updateFields.join(', ')} WHERE product_id = $${paramIndex} RETURNING *`;
            const result = await pool.query(query, queryParams);

            return {
                status: 200,
                jsonBody: {
                    message: "Product updated successfully",
                    product: result.rows[0]
                }
            };
        } catch (error) {
            if (error instanceof BrandUnauthorizedError) {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in brandUpdateProduct function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Get Product Reviews (Brand can view reviews of their products)
app.http('getBrandProductReviews', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "brands/products/{productId}/reviews",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brand = await requireBrandAuth(request, context);
            const productId = request.params.productId;

            if (!productId) {
                return {
                    status: 400,
                    jsonBody: { error: "Product ID is required" }
                };
            }

            // Verify the product belongs to this brand
            const productCheck = await pool.query(
                "SELECT brand_id, product_name FROM dbo.products WHERE product_id = $1",
                [productId]
            );

            if (productCheck.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            if (productCheck.rows[0].brand_id !== brand.brandId) {
                return {
                    status: 403,
                    jsonBody: { error: "You can only view reviews for your own products" }
                };
            }

            // Get reviews for the product
            const result = await pool.query(
                `SELECT 
                    r.review_id, r.title, r.content, r.rating, r.created_at, r.updated_at,
                    u.username, u.user_id
                 FROM dbo.reviews r
                 JOIN dbo.users u ON r.user_id = u.user_id
                 WHERE r.product_id = $1
                 ORDER BY r.created_at DESC`,
                [productId]
            );

            return {
                status: 200,
                jsonBody: {
                    product_name: productCheck.rows[0].product_name,
                    reviews: result.rows
                }
            };
        } catch (error) {
            if (error instanceof BrandUnauthorizedError) {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.error('Error in getBrandProductReviews function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
}); 