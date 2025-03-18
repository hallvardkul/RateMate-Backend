import { app, InvocationContext, HttpRequest, HttpResponseInit } from "@azure/functions";
import pool from "./database/postgresClient";
import { CreateProductRequest, Product } from "./models/product";
import { MediaService } from "./services/mediaService";
import { MediaUploadRequest, MediaUpdateRequest } from "./models/media";

// Import auth functions
import "./functions/auth";

app.http('products', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: "products/{id?}",  // Optional id parameter for single product operations
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log(`Processing ${request.method} request for URL: ${request.url}`);
        
        try {
            switch (request.method) {
                case 'GET':
                    const id = request.params.id;
                    return id ? await getProductById(id, context) : await getAllProducts(context);
                
                case 'POST':
                    return await createProduct(request, context);
                
                case 'PUT':
                    return await updateProduct(request, context);
                
                case 'DELETE':
                    return await deleteProduct(request, context);
                
                default:
                    return {
                        status: 405,
                        jsonBody: { error: "Method not allowed" }
                    };
            }
        } catch (err: any) {
            context.log(`Request processing error: ${err}`);
            return {
                status: 500,
                jsonBody: { error: "Internal server error", details: err?.message || String(err) }
            };
        }
    }
});

// Media endpoints
app.http('media', {
    methods: ['GET', 'POST', 'DELETE', 'PATCH'],
    authLevel: 'anonymous',
    route: "media/{id?}",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        const mediaService = new MediaService();
        
        try {
            switch (request.method) {
                case 'POST': {
                    const formData = await request.formData();
                    
                    // Log all form data keys and values
                    const formDataEntries = Array.from(formData.entries());
                    context.log('All form data entries:', formDataEntries.map(([key, value]) => ({
                        key,
                        type: value instanceof Blob ? 'Blob' : typeof value,
                        value: value instanceof Blob ? `Blob (${value.size} bytes)` : value
                    })));

                    const fileData = formData.get('file');
                    if (!fileData || !(fileData instanceof Blob)) {
                        return {
                            status: 400,
                            jsonBody: { error: "No valid file provided" }
                        };
                    }

                    // Parse and validate userId
                    const userIdStr = formData.get('userId');
                    context.log('userId received:', userIdStr);
                    if (!userIdStr) {
                        return {
                            status: 400,
                            jsonBody: { error: "userId is required" }
                        };
                    }
                    const userId = parseInt(userIdStr.toString());
                    if (isNaN(userId) || userId <= 0) {
                        return {
                            status: 400,
                            jsonBody: { error: "userId must be a positive number" }
                        };
                    }

                    // Parse and validate productId
                    const productIdStr = formData.get('productId');
                    context.log('productId received:', productIdStr);
                    if (!productIdStr) {
                        return {
                            status: 400,
                            jsonBody: { error: "productId is required" }
                        };
                    }
                    const productId = parseInt(productIdStr.toString());
                    if (isNaN(productId) || productId <= 0) {
                        return {
                            status: 400,
                            jsonBody: { error: "productId must be a positive number" }
                        };
                    }

                    // Verify that the product exists in the database
                    try {
                        const productQuery = 'SELECT product_id FROM dbo.products WHERE product_id = $1';
                        const productResult = await pool.query(productQuery, [productId]);
                        if (productResult.rows.length === 0) {
                            return {
                                status: 400,
                                jsonBody: { error: `Product with ID ${productId} does not exist` }
                            };
                        }
                    } catch (err) {
                        context.log('Error checking product existence:', err);
                        return {
                            status: 500,
                            jsonBody: { error: "Failed to validate product" }
                        };
                    }

                    // Parse optional tags
                    const tags = formData.get('tags') ? formData.get('tags')?.toString().split(',').map(tag => tag.trim()) : undefined;

                    const arrayBuffer = await fileData.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    // Get file name from form data or generate one
                    let fileName = formData.get('fileName')?.toString();
                    if (!fileName) {
                        // Generate a file name based on timestamp if none provided
                        const extension = fileData.type.split('/').pop() || 'bin';
                        fileName = `upload_${Date.now()}.${extension}`;
                    }
                    
                    const contentType = fileData.type || 'application/octet-stream';

                    context.log('File details:', {
                        originalName: fileName,
                        size: buffer.length,
                        contentType
                    });

                    const uploadRequest: MediaUploadRequest = {
                        file: buffer,
                        fileName,
                        contentType,
                        userId,
                        productId,
                        tags
                    };

                    context.log('Processing upload request:', {
                        fileName,
                        contentType,
                        userId,
                        productId,
                        tags,
                        fileSize: buffer.length
                    });

                    const result = await mediaService.uploadMedia(uploadRequest);
                    return {
                        status: 201,
                        jsonBody: result
                    };
                }

                case 'GET': {
                    const productId = request.query.get('productId');
                    
                    if (!productId) {
                        return {
                            status: 400,
                            jsonBody: { error: "productId query parameter is required" }
                        };
                    }

                    const media = await mediaService.getMediaByProductId(parseInt(productId));
                    return {
                        status: 200,
                        jsonBody: media
                    };
                }

                case 'DELETE': {
                    const id = request.params.id;
                    if (!id) {
                        return {
                            status: 400,
                            jsonBody: { error: "Media ID is required" }
                        };
                    }

                    const success = await mediaService.deleteMedia(id);
                    if (!success) {
                        return {
                            status: 404,
                            jsonBody: { error: `Media with ID ${id} not found` }
                        };
                    }

                    return {
                        status: 200,
                        jsonBody: { message: `Media with ID ${id} successfully deleted` }
                    };
                }

                case 'PATCH': {
                    const id = request.params.id;
                    if (!id) {
                        return {
                            status: 400,
                            jsonBody: { error: "Media ID is required" }
                        };
                    }

                    const updates = await request.json() as MediaUpdateRequest;
                    const updatedMedia = await mediaService.updateMedia(id, updates);
                    
                    if (!updatedMedia) {
                        return {
                            status: 404,
                            jsonBody: { error: `Media with ID ${id} not found` }
                        };
                    }

                    return {
                        status: 200,
                        jsonBody: updatedMedia
                    };
                }

                default:
                    return {
                        status: 405,
                        jsonBody: { error: "Method not allowed" }
                    };
            }
        } catch (err: any) {
            context.log(`Error processing media request: ${err}`);
            return {
                status: 500,
                jsonBody: { error: "Internal server error", details: err?.message || String(err) }
            };
        }
    }
});

// Product helper functions
async function getAllProducts(context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const query = 'SELECT * FROM dbo.products ORDER BY product_id';
        const result = await pool.query(query);
        
        context.log(`Retrieved ${result.rows.length} products`);
        return {
            status: 200,
            jsonBody: result.rows
        };
    } catch (err: any) {
        context.log(`Database error in getAllProducts: ${err}`);
        return {
            status: 500,
            jsonBody: { error: "Failed to retrieve products", details: err?.message }
        };
    }
}

async function getProductById(id: string, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const query = 'SELECT * FROM dbo.products WHERE product_id = $1';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return {
                status: 404,
                jsonBody: { error: `Product with ID ${id} not found` }
            };
        }

        context.log(`Retrieved product with ID ${id}`);
        return {
            status: 200,
            jsonBody: result.rows[0]
        };
    } catch (err: any) {
        context.log(`Database error in getProductById: ${err}`);
        return {
            status: 500,
            jsonBody: { error: "Failed to retrieve product", details: err?.message }
        };
    }
}

async function createProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const product = await request.json() as CreateProductRequest;
        
        // Validate request body
        if (!product || !product.product_name || !product.product_category || !product.brand) {
            context.log('Validation failed: Missing required fields');
            return {
                status: 400,
                jsonBody: { error: "Missing required fields: product_name, product_category, and brand are required" }
            };
        }

        const query = `
            INSERT INTO dbo.products (product_name, product_category, brand)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const values = [product.product_name, product.product_category, product.brand];
        
        context.log('Executing create query:', { query, values });
        const result = await pool.query(query, values);
        context.log('Created product:', result.rows[0]);
        
        return {
            status: 201,
            jsonBody: result.rows[0]
        };
    } catch (err: any) {
        context.log(`Database error in createProduct: ${err}`);
        return {
            status: 500,
            jsonBody: { error: "Failed to create product", details: err?.message }
        };
    }
}

async function updateProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const id = request.params.id;
        if (!id) {
            return {
                status: 400,
                jsonBody: { error: "Product ID is required" }
            };
        }

        const product = await request.json() as Product;
        if (!product || !product.product_name || !product.product_category || !product.brand) {
            return {
                status: 400,
                jsonBody: { error: "Missing required fields: product_name, product_category, and brand are required" }
            };
        }

        const query = `
            UPDATE dbo.products 
            SET product_name = $1, product_category = $2, brand = $3
            WHERE product_id = $4
            RETURNING *
        `;
        const values = [product.product_name, product.product_category, product.brand, id];
        
        context.log('Executing update query:', { query, values });
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return {
                status: 404,
                jsonBody: { error: `Product with ID ${id} not found` }
            };
        }

        context.log('Updated product:', result.rows[0]);
        return {
            status: 200,
            jsonBody: result.rows[0]
        };
    } catch (err: any) {
        context.log(`Database error in updateProduct: ${err}`);
        return {
            status: 500,
            jsonBody: { error: "Failed to update product", details: err?.message }
        };
    }
}

async function deleteProduct(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const id = request.params.id;
        if (!id) {
            return {
                status: 400,
                jsonBody: { error: "Product ID is required" }
            };
        }

        const query = 'DELETE FROM dbo.products WHERE product_id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return {
                status: 404,
                jsonBody: { error: `Product with ID ${id} not found` }
            };
        }

        context.log(`Deleted product with ID ${id}`);
        return {
            status: 200,
            jsonBody: { message: `Product with ID ${id} successfully deleted`, product: result.rows[0] }
        };
    } catch (err: any) {
        context.log(`Database error in deleteProduct: ${err}`);
        return {
            status: 500,
            jsonBody: { error: "Failed to delete product", details: err?.message }
        };
    }
} 