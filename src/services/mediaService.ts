import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { Collection, ObjectId } from "mongodb";
import { getCollection } from "../database/cosmosClient";
import { MediaMetadata, MediaUploadRequest, MediaUploadResponse, MediaMetadataResponse, MediaUpdateRequest } from "../models/media";

export class MediaService {
    private blobServiceClient: BlobServiceClient;
    private containerName: string;

    constructor() {
        const blobStorageUrl = process.env.BLOB_STORAGE_URL;
        if (!blobStorageUrl) {
            throw new Error("BLOB_STORAGE_URL environment variable is not set");
        }
        
        this.containerName = process.env.BLOB_CONTAINER_NAME || "media";
    
        try {
            console.log('Initializing BlobServiceClient with managed identity...');
            console.log('Using storage URL:', blobStorageUrl);
            
            const credential = new DefaultAzureCredential({
                managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID
            });
            
            this.blobServiceClient = new BlobServiceClient(blobStorageUrl, credential);
            console.log(`BlobServiceClient initialized for container: ${this.containerName}`);
            
            // Test the credentials immediately
            this.testConnection();
        } catch (error) {
            console.error('Failed to initialize BlobServiceClient with managed identity:', error);
            if (error instanceof Error) {
                console.error('Authentication Details:', error.message);
                if (process.env.NODE_ENV === 'development') {
                    console.error('Hint: For local development:');
                    console.error('1. Run `az login`');
                    console.error('2. Run `az account set --subscription <subscription-id>`');
                    console.error('3. Ensure you have proper RBAC roles on the storage account');
                }
            }
            throw new Error('Failed to authenticate with Azure Blob Storage. Check credentials and permissions.');
        }
    }

    private async testConnection() {
        try {
            console.log('Testing blob storage connection...');
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const exists = await containerClient.exists();
            console.log(`Container '${this.containerName}' exists: ${exists}`);
            if (exists) {
                // Try to list a single blob to test permissions
                const blobsIterator = containerClient.listBlobsFlat();
                const response = await blobsIterator.next();
                console.log('Successfully tested blob listing permissions');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            // Don't throw - just log the error
        }
    }

    private async getCosmosCollection(): Promise<Collection<MediaMetadata>> {
        return await getCollection();
    }

    private async ensureContainer() {
        try {
            console.log('Getting container client...');
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            
            console.log('Checking if container exists...');
            const exists = await containerClient.exists();
            if (!exists) {
                console.log(`Creating container ${this.containerName}`);
                try {
                    await containerClient.create({
                        access: undefined  // Use undefined for private access
                    });
                    console.log('Container created successfully');
                } catch (createError) {
                    console.error('Failed to create container:', createError);
                    if (createError instanceof Error) {
                        console.error('Create container error details:', createError.message);
                    }
                    throw createError;
                }
            } else {
                console.log('Container already exists, verifying permissions...');
                try {
                    // Verify we can get container properties
                    await containerClient.getProperties();
                    console.log('Successfully verified container permissions');
                } catch (permError) {
                    console.error('Permission verification failed:', permError);
                    throw new Error('Insufficient permissions on container');
                }
            }
            
            return containerClient;
        } catch (error) {
            console.error('Error in ensureContainer:', error);
            throw new Error(`Failed to ensure container exists: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private generateBlobName(fileName: string): string {
        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
        return extension ? `${timestamp}-${randomString}.${extension}` : `${timestamp}-${randomString}`;
    }

    async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
        try {
            console.log('Starting media upload process...');
            console.log('Container name:', this.containerName);
            
            // 1. Prepare blob storage using admin credentials
            console.log('Getting container client...');
            const containerClient = await this.ensureContainer();
            
            console.log('Generating blob name...');
            const blobName = this.generateBlobName(request.fileName);
            console.log(`Generated blob name: ${blobName}`);
            
            console.log('Getting block blob client...');
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            console.log(`Got block blob client for URL: ${blockBlobClient.url}`);

            // 2. Upload to blob storage using admin credentials
            console.log('Starting file upload...');
            console.log('File details:', {
                contentType: request.contentType,
                size: request.file.length
            });
            
            try {
                const uploadResult = await blockBlobClient.uploadData(request.file, {
                    blobHTTPHeaders: {
                        blobContentType: request.contentType,
                        blobCacheControl: 'public, max-age=31536000'
                    }
                });
                console.log('Upload successful, result:', uploadResult);
            } catch (uploadError) {
                console.error('Error during upload:', uploadError);
                if (uploadError instanceof Error) {
                    console.error('Upload error details:', uploadError.message);
                    console.error('Upload error stack:', uploadError.stack);
                }
                throw uploadError;
            }

            console.log('File uploaded successfully to blob storage');
            const blobUrl = blockBlobClient.url;
            console.log('Using blob URL:', blobUrl);

            // 3. Create metadata object
            console.log('Creating metadata object...');
            const metadata: Omit<MediaMetadata, '_id'> = {
                file_url: blobUrl,
                file_name: request.fileName,
                content_type: request.contentType,
                size: request.file.length,
                user_id: request.userId,
                product_id: request.productId,
                uploaded_at: new Date(),
                tags: request.tags
            };

            // 4. Store metadata in Cosmos DB
            console.log('Storing metadata in Cosmos DB...');
            const collection = await this.getCosmosCollection();
            const result = await collection.insertOne(metadata);
            console.log('Metadata stored successfully');

            const responseMetadata: MediaMetadataResponse = {
                ...metadata,
                _id: result.insertedId.toHexString()
            };

            return {
                metadata: responseMetadata,
                url: blobUrl
            };
        } catch (error) {
            console.error('Error in uploadMedia:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    }

    async getMediaByProductId(productId: number): Promise<MediaMetadataResponse[]> {
        const collection = await this.getCosmosCollection();
        const results = await collection.find({ product_id: productId }).toArray();
        return results.map(doc => ({
            ...doc,
            _id: doc._id.toHexString()
        }));
    }

    async deleteMedia(mediaId: string): Promise<boolean> {
        try {
            const objectId = new ObjectId(mediaId);
            
            // 1. Get metadata from Cosmos DB
            const collection = await this.getCosmosCollection();
            const metadata = await collection.findOne({ _id: objectId });

            if (!metadata) {
                return false;
            }

            // 2. Delete from Blob Storage using admin credentials
            const blobUrl = metadata.file_url.split('?')[0];  // Remove SAS token from URL
            const blobName = blobUrl.split('/').pop();
            if (blobName) {
                const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.delete();
            }

            // 3. Delete from Cosmos DB
            await collection.deleteOne({ _id: objectId });
            return true;
        } catch (error) {
            console.error('Error in deleteMedia:', error);
            throw error;
        }
    }

    async updateMedia(mediaId: string, updates: MediaUpdateRequest): Promise<MediaMetadataResponse | null> {
        try {
            console.log('Attempting to update media with ID:', mediaId);
            const objectId = new ObjectId(mediaId);
            console.log('Created ObjectId:', objectId.toString());
            
            const collection = await this.getCosmosCollection();
            console.log('Got collection, searching for document...');
            
            // Get the current media metadata
            const currentMedia = await collection.findOne({ _id: objectId });
            console.log('Search result:', currentMedia ? 'Document found' : 'Document not found');
            
            if (!currentMedia) {
                console.log('No document found with ID:', mediaId);
                return null;
            }

            // Prepare update object with only provided fields
            const updateObj: { $set: Partial<MediaMetadata> } = { $set: {} };
            if (updates.fileName !== undefined) {
                updateObj.$set.file_name = updates.fileName;
            }
            if (updates.tags !== undefined) {
                updateObj.$set.tags = updates.tags;
            }

            // Update the document
            const result = await collection.findOneAndUpdate(
                { _id: objectId },
                updateObj,
                { returnDocument: 'after' }
            );

            if (!result) {
                return null;
            }

            // Convert ObjectId to string for response
            return {
                ...result,
                _id: result._id.toHexString()
            };
        } catch (error) {
            console.error('Error in updateMedia:', error);
            throw error;
        }
    }
} 