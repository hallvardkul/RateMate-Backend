/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import Busboy from "busboy";
import pool from "../database/postgresClient";
import { uploadBuffer } from "../utils/blobStorage";
import { requireBrandAuth } from "../utils/brandAuthMiddleware";

interface MultipartFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimeType: string;
  buffer: Buffer;
}

app.http("uploadProductMedia", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "brands/products/{productId}/media",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const { productId } = request.params as { productId: string };

    let brandId: number;
    try {
      const auth = await requireBrandAuth(request, context);
      brandId = auth.brandId;
    } catch (err) {
      return { status: 401, jsonBody: { error: (err as Error).message } };
    }

    // Check product exists and belongs to brand
    const prodRes = await pool.query("SELECT product_id FROM dbo.products WHERE product_id = $1 AND brand_id = $2", [productId, brandId]);
    if (prodRes.rows.length === 0) {
      return { status: 404, jsonBody: { error: "Product not found or not owned by brand" } };
    }

    // Parse multipart
    // @ts-ignore – busboy types provided via custom declaration
    const busboy = Busboy({ headers: request.headers });
    const files: MultipartFile[] = [];

    const filePromises: Promise<void>[] = [];

    busboy.on("file", (fieldname: any, file: any, info: any) => {
      const { filename, mimeType, encoding } = info;
      const chunks: Buffer[] = [];
      file.on("data", (data: Buffer) => chunks.push(data));
      file.on("limit", () => {
        // handle limits – ignore for now
      });
      file.on("end", () => {
        const buffer = Buffer.concat(chunks);
        files.push({ fieldname, filename, mimeType, encoding, buffer });
      });
    });

    const parsePromise = new Promise<void>((resolve, reject) => {
      busboy.on("finish", () => resolve());
      busboy.on("error", (err: any) => reject(err));
    });

    // @ts-ignore azure functions request.body is a Node readable
    (request as any).body?.pipe(busboy);

    try {
      await parsePromise;
    } catch (err) {
      context.error("Busboy error", err);
      return { status: 400, jsonBody: { error: "Invalid multipart data" } };
    }

    if (files.length === 0) {
      return { status: 400, jsonBody: { error: "No media files uploaded" } };
    }

    const uploaded: { file_url: string; file_type: string }[] = [];
    for (const f of files) {
      // Validate size ( < 10MB )
      if (f.buffer.length > 10 * 1024 * 1024) {
        return { status: 400, jsonBody: { error: "File too large (10MB max)" } };
      }

      // Upload to blob storage
      const ext = f.filename.split(".").pop();
      const blobName = `product_${productId}_${uuidv4()}.${ext}`;
      const url = await uploadBuffer(f.buffer, blobName, f.mimeType);

      // Insert DB row
      await pool.query(
        `INSERT INTO dbo.products_media (product_id, file_url, file_type) VALUES ($1, $2, $3)`,
        [productId, url, f.mimeType]
      );

      uploaded.push({ file_url: url, file_type: f.mimeType });
    }

    return { status: 201, jsonBody: { uploaded } };
  },
}); 