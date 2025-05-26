import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import jwt from 'jsonwebtoken';

// Interface for verification request
interface VerificationRequest {
    brand_id: number;
    verification_status: 'pending' | 'approved' | 'rejected';
    verification_notes?: string;
}

// Brand Verification Submission (Brands can submit verification documents)
app.http('submitBrandVerification', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "brands/verification/submit",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Extract brand info from JWT token
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    status: 401,
                    jsonBody: { error: "Authorization header required" }
                };
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            
            if (decoded.type !== 'brand') {
                return {
                    status: 403,
                    jsonBody: { error: "Only brands can submit verification requests" }
                };
            }

            const body = await request.json() as {
                business_registration?: string;
                website?: string;
                social_media?: string;
                additional_info?: string;
            };

            // Update brand with verification submission
            const result = await pool.query(
                `UPDATE dbo.brands 
                 SET verification_status = 'pending',
                     business_registration = $2,
                     website = $3,
                     social_media = $4,
                     verification_submitted_at = CURRENT_TIMESTAMP,
                     additional_verification_info = $5
                 WHERE brand_id = $1
                 RETURNING brand_id, brand_name, verification_status`,
                [decoded.brandId, body.business_registration, body.website, body.social_media, body.additional_info]
            );

            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Brand not found" }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    message: "Verification request submitted successfully",
                    brand: result.rows[0],
                    status: "pending"
                }
            };
        } catch (error) {
            context.error('Error in submitBrandVerification function:', error);
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

// Get Brand Verification Status
app.http('getBrandVerificationStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "brands/verification/status",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Extract brand info from JWT token
            const authHeader = request.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    status: 401,
                    jsonBody: { error: "Authorization header required" }
                };
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            
            if (decoded.type !== 'brand') {
                return {
                    status: 403,
                    jsonBody: { error: "Only brands can check verification status" }
                };
            }

            const result = await pool.query(
                `SELECT brand_id, brand_name, is_verified, verification_status,
                        verification_submitted_at, verification_approved_at,
                        verification_notes
                 FROM dbo.brands 
                 WHERE brand_id = $1`,
                [decoded.brandId]
            );

            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Brand not found" }
                };
            }

            const brand = result.rows[0];

            return {
                status: 200,
                jsonBody: {
                    brand_id: brand.brand_id,
                    brand_name: brand.brand_name,
                    is_verified: brand.is_verified,
                    verification_status: brand.verification_status || 'not_submitted',
                    verification_submitted_at: brand.verification_submitted_at,
                    verification_approved_at: brand.verification_approved_at,
                    verification_notes: brand.verification_notes,
                    next_steps: getVerificationNextSteps(brand.verification_status, brand.is_verified)
                }
            };
        } catch (error) {
            context.error('Error in getBrandVerificationStatus function:', error);
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

// Admin: List Pending Verifications (Admin only)
app.http('listPendingVerifications', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "admin/brands/verification/pending",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // TODO: Add admin authentication check here
            // For now, this is open but in production you'd want proper admin auth

            const result = await pool.query(
                `SELECT b.brand_id, b.brand_name, b.email, b.created_at,
                        b.verification_status, b.verification_submitted_at,
                        b.business_registration, b.website, b.social_media,
                        b.additional_verification_info,
                        COUNT(p.product_id) as product_count
                 FROM dbo.brands b
                 LEFT JOIN dbo.products p ON b.brand_id = p.brand_id
                 WHERE b.verification_status = 'pending'
                 GROUP BY b.brand_id, b.brand_name, b.email, b.created_at,
                          b.verification_status, b.verification_submitted_at,
                          b.business_registration, b.website, b.social_media,
                          b.additional_verification_info
                 ORDER BY b.verification_submitted_at ASC`
            );

            return {
                status: 200,
                jsonBody: {
                    pending_verifications: result.rows,
                    count: result.rows.length
                }
            };
        } catch (error) {
            context.error('Error in listPendingVerifications function:', error);
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

// Admin: Approve/Reject Brand Verification
app.http('processBrandVerification', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "admin/brands/verification/process",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // TODO: Add admin authentication check here
            const body = await request.json() as VerificationRequest;
            const { brand_id, verification_status, verification_notes } = body;

            if (!brand_id || !verification_status) {
                return {
                    status: 400,
                    jsonBody: { error: "brand_id and verification_status are required" }
                };
            }

            if (!['approved', 'rejected'].includes(verification_status)) {
                return {
                    status: 400,
                    jsonBody: { error: "verification_status must be 'approved' or 'rejected'" }
                };
            }

            // Update brand verification status
            const result = await pool.query(
                `UPDATE dbo.brands 
                 SET verification_status = $2,
                     is_verified = $3,
                     verification_approved_at = CASE WHEN $2 = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
                     verification_notes = $4
                 WHERE brand_id = $1
                 RETURNING brand_id, brand_name, email, is_verified, verification_status`,
                [brand_id, verification_status, verification_status === 'approved', verification_notes]
            );

            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "Brand not found" }
                };
            }

            const brand = result.rows[0];

            return {
                status: 200,
                jsonBody: {
                    message: `Brand verification ${verification_status} successfully`,
                    brand,
                    action_taken: verification_status,
                    notes: verification_notes
                }
            };
        } catch (error) {
            context.error('Error in processBrandVerification function:', error);
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

// Helper function to provide next steps based on verification status
function getVerificationNextSteps(status: string, isVerified: boolean): string {
    if (isVerified) {
        return "Your brand is verified! You have full access to all features.";
    }
    
    switch (status) {
        case 'pending':
            return "Your verification is under review. We'll notify you once it's processed.";
        case 'rejected':
            return "Your verification was rejected. Please review the notes and resubmit with additional information.";
        case 'not_submitted':
        default:
            return "Submit your verification documents to get your brand verified and unlock additional features.";
    }
} 