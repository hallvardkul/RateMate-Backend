import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { MediaService } from "../services/mediaService";
import { MediaUploadRequest, MediaUpdateRequest } from "../models/media";
import { withGuards } from "../utils/corsMiddleware";

app.http("media", {
    methods: ["GET","POST","DELETE","PATCH","OPTIONS"],
    authLevel: "anonymous",
    route: "media/{id?}",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        const mediaService = new MediaService();
        try {
            switch (request.method) {
                case 'POST': {
                    const formData = await request.formData();

                    // Log all form data entries
                    const entries = Array.from(formData.entries());
                    context.log('Form data entries:', entries.map(([key, value]) => ({ key, value })));

                    // File validation
                    const fileData = formData.get('file');
                    if (!fileData || !(fileData instanceof Blob)) {
                        return { status: 400, jsonBody: { error: "No valid file provided" } };
                    }

                    // Validate userId
                    const userIdStr = formData.get('userId');
                    context.log('userId received:', userIdStr);
                    if (!userIdStr) {
                        return { status: 400, jsonBody: { error: "userId is required" } };
                    }
                    const userId = parseInt(userIdStr.toString(), 10);
                    if (isNaN(userId) || userId <= 0) {
                        return { status: 400, jsonBody: { error: "userId must be a positive number" } };
                    }

                    // Validate productId
                    const productIdStr = formData.get('productId');
                    context.log('productId received:', productIdStr);
                    if (!productIdStr) {
                        return { status: 400, jsonBody: { error: "productId is required" } };
                    }
                    const productId = parseInt(productIdStr.toString(), 10);
                    if (isNaN(productId) || productId <= 0) {
                        return { status: 400, jsonBody: { error: "productId must be a positive number" } };
                    }

                    // Check product exists
                    const prodCheck = await pool.query('SELECT product_id FROM dbo.products WHERE product_id = $1', [productId]);
                    if (prodCheck.rows.length === 0) {
                        return { status: 400, jsonBody: { error: `Product with ID ${productId} does not exist` } };
                    }

                    // Optional tags
                    const tags = formData.get('tags')
                        ? formData.get('tags')!.toString().split(',').map(t => t.trim())
                        : undefined;

                    const arrayBuf = await fileData.arrayBuffer();
                    const buffer = Buffer.from(arrayBuf);

                    // File name
                    let fileName = formData.get('fileName')?.toString();
                    if (!fileName) {
                        const ext = fileData.type.split('/').pop() || 'bin';
                        fileName = `upload_${Date.now()}.${ext}`;
                    }

                    const contentType = fileData.type || 'application/octet-stream';

                    context.log('Uploading media:', { fileName, contentType, userId, productId, tags });

                    const uploadReq: MediaUploadRequest = { file: buffer, fileName, contentType, userId, productId, tags };
                    const result = await mediaService.uploadMedia(uploadReq);

                    return { status: 201, jsonBody: result };
                }

                case 'GET': {
                    const pid = request.query.get('productId');
                    if (!pid) {
                        return { status: 400, jsonBody: { error: "productId query parameter is required" } };
                    }
                    const media = await mediaService.getMediaByProductId(parseInt(pid, 10));
                    return { status: 200, jsonBody: media };
                }

                case 'DELETE': {
                    const id = request.params.id;
                    if (!id) {
                        return { status: 400, jsonBody: { error: "Media ID is required" } };
                    }
                    const deleted = await mediaService.deleteMedia(id);
                    if (!deleted) {
                        return { status: 404, jsonBody: { error: `Media with ID ${id} not found` } };
                    }
                    return { status: 200, jsonBody: { message: `Media with ID ${id} successfully deleted` } };
                }

                case 'PATCH': {
                    const id = request.params.id;
                    const body = await request.json() as MediaUpdateRequest;
                    const updated = await mediaService.updateMedia(id, body);
                    return { status: 200, jsonBody: updated };
                }

                default:
                    return { status: 405, jsonBody: { error: "Method not allowed" } };
            }
        } catch (error: any) {
            context.log('Error in media handler:', error);
            return { status: 500, jsonBody: { error: "Internal server error", details: error.message } };
        }
    })
}); 