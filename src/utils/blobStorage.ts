import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const connectionString = process.env.BLOB_STORAGE_CONNECTION_STRING as string;
const containerName = process.env.BLOB_CONTAINER_NAME || "media";

if (!connectionString) {
  throw new Error("BLOB_STORAGE_CONNECTION_STRING env var not set");
}

// Singleton blob service
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

export async function uploadBuffer(buffer: Buffer, blobName: string, contentType: string): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  if (!(await containerClient.exists())) {
    await containerClient.create({ access: "blob" });
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  // Return public URL
  return `${process.env.BLOB_STORAGE_URL}/${containerName}/${blobName}`;
} 