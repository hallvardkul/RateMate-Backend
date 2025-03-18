import { app } from "@azure/functions";
import { BrandsFunction } from "../services/brandsService";

// Register the brands function
export const brands = app.http('brands', {
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    route: "brands/{id?}",
    handler: BrandsFunction
}); 