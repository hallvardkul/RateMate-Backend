import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";

// Get all products (public endpoint with filtering and pagination)
app.http('getPublicProducts', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/products",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '20');
            const search = url.searchParams.get('search') || '';
            const category = url.searchParams.get('category') || '';
            const brandId = url.searchParams.get('brandId') || '';
            const sortBy = url.searchParams.get('sortBy') || 'created_at';
            const sortOrder = url.searchParams.get('sortOrder') || 'DESC';

            const offset = (page - 1) * limit;

            let whereClause = "WHERE 1=1";
            const queryParams: any[] = [];

            if (search) {
                whereClause += ` AND (p.product_name ILIKE $${queryParams.length + 1} OR p.description ILIKE $${queryParams.length + 1})`;
                queryParams.push(`%${search}%`);
            }

            if (category) {
                whereClause += ` AND p.product_category = $${queryParams.length + 1}`;
                queryParams.push(category);
            }

            if (brandId) {
                whereClause += ` AND p.brand_id = $${queryParams.length + 1}`;
                queryParams.push(brandId);
            }

            // Validate sort parameters
            const validSortFields = ['product_name', 'average_rating', 'total_reviews', 'brand_name'];
            const validSortOrders = ['ASC', 'DESC'];
            
            const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'p.product_name';
            const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            const result = await pool.query(
                `SELECT 
                    p.product_id, p.product_name, p.product_category, p.description,
                    p.subcategory_id, p.category_id,
                    b.brand_id, b.brand_name, b.is_verified as brand_verified,
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    COUNT(DISTINCT r.review_id) as total_reviews
                 FROM dbo.products p
                 LEFT JOIN dbo.brands b ON p.brand_id = b.brand_id
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 ${whereClause}
                 GROUP BY p.product_id, p.product_name, p.product_category, p.description, 
                          p.subcategory_id, p.category_id, b.brand_id, b.brand_name, b.is_verified
                 ORDER BY ${finalSortBy} ${finalSortOrder}
                 LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
                [...queryParams, limit, offset]
            );

            // Get total count for pagination
            const countResult = await pool.query(
                `SELECT COUNT(DISTINCT p.product_id) as total FROM dbo.products p 
                 LEFT JOIN dbo.brands b ON p.brand_id = b.brand_id ${whereClause}`,
                queryParams
            );

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                status: 200,
                jsonBody: { 
                    products: result.rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            };
        } catch (error) {
            context.error('Error in getPublicProducts function:', error);
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

// Get product by ID (public endpoint)
app.http('getPublicProduct', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/products/{productId:int}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const productId = request.params.productId;

            if (!productId) {
                return {
                    status: 400,
                    jsonBody: { error: "Product ID is required" }
                };
            }

            const result = await pool.query(
                `SELECT 
                    p.product_id, p.product_name, p.product_category, p.description,
                    p.subcategory_id, p.category_id, p.brand,
                    b.brand_id, b.brand_name, b.email as brand_email, b.is_verified as brand_verified,
                    b.created_at as brand_created_at,
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    COUNT(DISTINCT r.review_id) as total_reviews
                 FROM dbo.products p
                 LEFT JOIN dbo.brands b ON p.brand_id = b.brand_id
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE p.product_id = $1
                 GROUP BY p.product_id, p.product_name, p.product_category, p.description, 
                          p.subcategory_id, p.category_id, p.brand, b.brand_id, b.brand_name, 
                          b.email, b.is_verified, b.created_at`,
                [productId]
            );

            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Product not found" }
                };
            }

            return {
                status: 200,
                jsonBody: { product: result.rows[0] }
            };
        } catch (error) {
            context.error('Error in getPublicProduct function:', error);
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

// Get product categories (public endpoint)
app.http('getPublicProductCategories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/products/categories",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const result = await pool.query(
                `SELECT DISTINCT product_category as category, COUNT(*) as product_count
                 FROM dbo.products 
                 WHERE product_category IS NOT NULL
                 GROUP BY product_category
                 ORDER BY product_count DESC, product_category ASC`
            );

            return {
                status: 200,
                jsonBody: { categories: result.rows }
            };
        } catch (error) {
            context.error('Error in getPublicProductCategories function:', error);
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

// Get all brands (public endpoint)
app.http('getPublicBrands', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/brands",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const url = new URL(request.url);
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '20');
            const search = url.searchParams.get('search') || '';
            const verified = url.searchParams.get('verified') || '';

            const offset = (page - 1) * limit;

            let whereClause = "WHERE 1=1";
            const queryParams: any[] = [];

            if (search) {
                whereClause += ` AND b.brand_name ILIKE $${queryParams.length + 1}`;
                queryParams.push(`%${search}%`);
            }

            if (verified === 'true') {
                whereClause += ` AND b.is_verified = true`;
            } else if (verified === 'false') {
                whereClause += ` AND b.is_verified = false`;
            }

            const result = await pool.query(
                `SELECT 
                    b.brand_id, b.brand_name, b.is_verified, b.created_at,
                    COUNT(DISTINCT p.product_id) as total_products,
                    COUNT(DISTINCT r.review_id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating
                 FROM dbo.brands b
                 LEFT JOIN dbo.products p ON b.brand_id = p.brand_id
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 ${whereClause}
                 GROUP BY b.brand_id, b.brand_name, b.is_verified, b.created_at
                 ORDER BY b.brand_name ASC
                 LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
                [...queryParams, limit, offset]
            );

            // Get total count for pagination
            const countResult = await pool.query(
                `SELECT COUNT(*) as total FROM dbo.brands b ${whereClause}`,
                queryParams
            );

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                status: 200,
                jsonBody: { 
                    brands: result.rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            };
        } catch (error) {
            context.error('Error in getPublicBrands function:', error);
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

// Get brand by ID (public endpoint)
app.http('getPublicBrand', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/brands/{brandId}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const brandId = request.params.brandId;

            if (!brandId) {
                return {
                    status: 400,
                    jsonBody: { error: "Brand ID is required" }
                };
            }

            // Get brand info
            const brandResult = await pool.query(
                `SELECT 
                    b.brand_id, b.brand_name, b.is_verified, b.created_at,
                    COUNT(DISTINCT p.product_id) as total_products,
                    COUNT(DISTINCT r.review_id) as total_reviews,
                    COALESCE(AVG(r.rating), 0) as average_rating
                 FROM dbo.brands b
                 LEFT JOIN dbo.products p ON b.brand_id = p.brand_id
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE b.brand_id = $1
                 GROUP BY b.brand_id, b.brand_name, b.is_verified, b.created_at`,
                [brandId]
            );

            if (brandResult.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Brand not found" }
                };
            }

            // Get brand's products
            const productsResult = await pool.query(
                `SELECT 
                    p.product_id, p.product_name, p.product_category, p.description,
                    COUNT(DISTINCT r.review_id) as review_count,
                    COALESCE(AVG(r.rating), 0) as average_rating
                 FROM dbo.products p
                 LEFT JOIN dbo.reviews r ON p.product_id = r.product_id
                 WHERE p.brand_id = $1
                 GROUP BY p.product_id, p.product_name, p.product_category, p.description
                 ORDER BY p.product_name ASC`,
                [brandId]
            );

            return {
                status: 200,
                jsonBody: { 
                    brand: brandResult.rows[0],
                    products: productsResult.rows
                }
            };
        } catch (error) {
            context.error('Error in getPublicBrand function:', error);
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

// Get product media (public endpoint)
app.http('getPublicProductMedia', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "public/products/{productId}/media",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const { productId } = request.params as { productId: string };
            if (!productId) {
                return { status: 400, jsonBody: { error: 'Product ID is required' } };
            }

            // fetch media rows
            const result = await pool.query(
                `SELECT media_id, file_url, file_type, uploaded_at
                 FROM dbo.products_media
                 WHERE product_id = $1
                 ORDER BY uploaded_at DESC`,
                [productId]
            );

            return { status: 200, jsonBody: { media: result.rows } };
        } catch (error) {
            context.error('Error in getPublicProductMedia function:', error);
            return { status: 500, jsonBody: { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) } };
        }
    },
}); 