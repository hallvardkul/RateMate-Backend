import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { Brand, CreateBrandRequest } from "../models/brand";

export async function BrandsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        switch (request.method) {
            case 'GET':
                const id = request.params.id;
                return id ? await getBrandById(id, context) : await getAllBrands(context);
            case 'POST':
                return await createBrand(request, context);
            case 'PUT':
                return await updateBrand(request, context);
            case 'DELETE':
                return await deleteBrand(request, context);
            default:
                return { status: 405, jsonBody: { error: "Method not allowed" } };
        }
    } catch (err: any) {
        context.log(`Error in brands function:`, err);
        return {
            status: 500,
            jsonBody: { error: "Internal server error", details: err instanceof Error ? err.message : String(err) }
        };
    }
}

async function getAllBrands(context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const result = await pool.query('SELECT * FROM dbo.brands ORDER BY brand_name');
        return { status: 200, jsonBody: result.rows };
    } catch (err) {
        context.log('Error in getAllBrands:', err);
        throw err;
    }
}

async function getBrandById(id: string, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const result = await pool.query('SELECT * FROM dbo.brands WHERE brand_id = $1', [id]);
        if (result.rows.length === 0) {
            return { status: 404, jsonBody: { error: `Brand with ID ${id} not found` } };
        }
        return { status: 200, jsonBody: result.rows[0] };
    } catch (err) {
        context.log('Error in getBrandById:', err);
        throw err;
    }
}

async function createBrand(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const brand = await request.json() as CreateBrandRequest;
        if (!brand.brand_name) {
            return { status: 400, jsonBody: { error: "brand_name is required" } };
        }

        const existingBrand = await pool.query(
            'SELECT brand_id FROM dbo.brands WHERE brand_name = $1',
            [brand.brand_name]
        );

        if (existingBrand.rows.length > 0) {
            return { status: 409, jsonBody: { error: "A brand with this name already exists" } };
        }

        const result = await pool.query(
            'INSERT INTO dbo.brands (brand_name) VALUES ($1) RETURNING *',
            [brand.brand_name]
        );

        return { status: 201, jsonBody: result.rows[0] };
    } catch (err) {
        context.log('Error in createBrand:', err);
        throw err;
    }
}

async function updateBrand(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const id = request.params.id;
        if (!id) {
            return { status: 400, jsonBody: { error: "Brand ID is required" } };
        }

        const brand = await request.json() as CreateBrandRequest;
        if (!brand.brand_name) {
            return { status: 400, jsonBody: { error: "brand_name is required" } };
        }

        const existingBrand = await pool.query(
            'SELECT brand_id FROM dbo.brands WHERE brand_name = $1 AND brand_id != $2',
            [brand.brand_name, id]
        );

        if (existingBrand.rows.length > 0) {
            return { status: 409, jsonBody: { error: "A brand with this name already exists" } };
        }

        const result = await pool.query(
            'UPDATE dbo.brands SET brand_name = $1 WHERE brand_id = $2 RETURNING *',
            [brand.brand_name, id]
        );

        if (result.rows.length === 0) {
            return { status: 404, jsonBody: { error: `Brand with ID ${id} not found` } };
        }

        return { status: 200, jsonBody: result.rows[0] };
    } catch (err) {
        context.log('Error in updateBrand:', err);
        throw err;
    }
}

async function deleteBrand(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const id = request.params.id;
        if (!id) {
            return { status: 400, jsonBody: { error: "Brand ID is required" } };
        }

        const result = await pool.query(
            'DELETE FROM dbo.brands WHERE brand_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return { status: 404, jsonBody: { error: `Brand with ID ${id} not found` } };
        }

        return {
            status: 200,
            jsonBody: {
                message: `Brand with ID ${id} successfully deleted`,
                brand: result.rows[0]
            }
        };
    } catch (err) {
        context.log('Error in deleteBrand:', err);
        throw err;
    }
} 