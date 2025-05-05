import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { CreateProductRequest } from "../models/product";
import { withGuards } from "../utils/corsMiddleware";

app.http("products", {
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    authLevel: "anonymous",
    route: "products/{id?}",
    handler: withGuards(async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const method = req.method;

            // GET (list or single)
            if (method === "GET") {
                const id = req.params.id;
                if (id) {
                    const text = `
                        SELECT p.*, b.brand_name, c.category_name
                        FROM products p
                        JOIN brands b   ON b.brand_id    = p.brand_id
                        JOIN product_categories c ON c.category_id = p.category_id
                        WHERE p.product_id = $1`;
                    const { rows } = await pool.query(text, [id]);
                    if (!rows.length) return { status: 404, jsonBody: { error: `Product ${id} not found` } };
                    return { status: 200, jsonBody: rows[0] };
                }
                const categoryId = req.query.get("categoryId") ? parseInt(req.query.get("categoryId")!, 10) : null;
                const brandId    = req.query.get("brandId")    ? parseInt(req.query.get("brandId")!, 10)    : null;
                const page       = parseInt(req.query.get("page")  || "1", 10);
                const limit      = parseInt(req.query.get("limit") || "20", 10);
                const offset     = (page - 1) * limit;
                const text = `
                    SELECT p.*, b.brand_name, c.category_name
                    FROM products p
                    JOIN brands b                ON b.brand_id    = p.brand_id
                    JOIN product_categories c    ON c.category_id = p.category_id
                    WHERE ($1::int IS NULL OR p.category_id = $1)
                      AND ($2::int IS NULL OR p.brand_id    = $2)
                    ORDER BY p.product_id
                    LIMIT $3 OFFSET $4`;
                const { rows } = await pool.query(text, [categoryId, brandId, limit, offset]);
                return { status: 200, jsonBody: rows };
            }

            // POST (create)
            if (method === "POST") {
                const { product_name, description, brand_id, category_id } = await req.json() as CreateProductRequest;
                if (!product_name || brand_id == null || category_id == null) {
                    return { status: 400, jsonBody: { error: "Missing required fields: product_name, brand_id, category_id" } };
                }
                const text = `
                    INSERT INTO products (product_name, description, brand_id, category_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;`;
                const { rows } = await pool.query(text, [product_name, description || null, brand_id, category_id]);
                return { status: 201, jsonBody: rows[0] };
            }

            // PUT (update)
            if (method === "PUT") {
                const id = req.params.id;
                if (!id) return { status: 400, jsonBody: { error: "Product ID is required" } };
                const { product_name, description, brand_id, category_id } = await req.json() as CreateProductRequest;
                if (!product_name || brand_id == null || category_id == null) {
                    return { status: 400, jsonBody: { error: "Missing required fields: product_name, brand_id, category_id" } };
                }
                const text = `
                    UPDATE products
                    SET product_name = $1,
                        description  = $2,
                        brand_id     = $3,
                        category_id  = $4
                    WHERE product_id = $5
                    RETURNING *;`;
                const { rows } = await pool.query(text, [product_name, description || null, brand_id, category_id, id]);
                if (!rows.length) return { status: 404, jsonBody: { error: `Product ${id} not found` } };
                return { status: 200, jsonBody: rows[0] };
            }

            // DELETE
            if (method === "DELETE") {
                const id = req.params.id;
                if (!id) return { status: 400, jsonBody: { error: "Product ID is required" } };
                const text = 'DELETE FROM products WHERE product_id = $1 RETURNING *';
                const { rows } = await pool.query(text, [id]);
                if (!rows.length) return { status: 404, jsonBody: { error: `Product ${id} not found` } };
                return { status: 200, jsonBody: { message: `Deleted product ${id}`, product: rows[0] } };
            }

            return { status: 405, jsonBody: { error: "Method not allowed" } };
        } catch (err: any) {
            ctx.log(`Products handler error: ${err}`);
            return { status: 500, jsonBody: { error: "Internal server error", details: err.message } };
        }
    })
}); 