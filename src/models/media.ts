import { ObjectId } from "mongodb";

export interface MediaMetadata {
    _id?: ObjectId;        // MongoDB's ObjectId
    file_url: string;      // Azure Blob Storage URL
    file_name: string;     // Original file name
    content_type: string;  // MIME type
    size: number;         // File size in bytes
    user_id: number;      // Reference to PostgreSQL user
    product_id: number;   // Reference to PostgreSQL product
    uploaded_at: Date;
    tags?: string[];      // Optional metadata
}

export interface MediaUploadRequest {
    file: Buffer;
    fileName: string;
    contentType: string;
    userId: number;
    productId: number;
    tags?: string[];
}

export interface MediaUpdateRequest {
    fileName?: string;     // Optional new file name
    tags?: string[];      // Optional updated tags
}

// Response type with string _id for API responses
export interface MediaMetadataResponse extends Omit<MediaMetadata, '_id'> {
    _id: string;
}

export interface MediaUploadResponse {
    metadata: MediaMetadataResponse;
    url: string;
} 