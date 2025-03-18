import { InvocationContext } from "@azure/functions";
import pool from "./postgresClient";

/**
 * Middleware to add database connection to the InvocationContext
 * @param context The function invocation context
 */
export function setupDbContext(context: InvocationContext): void {
    // Add db property to context
    (context as any).db = {
        query: async (text: string, params?: any[]) => {
            try {
                const result = await pool.query(text, params);
                return {
                    rows: result.rows,
                    rowCount: result.rowCount
                };
            } catch (error) {
                context.log('Database query error:', error);
                throw error;
            }
        }
    };
} 