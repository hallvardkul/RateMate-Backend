import { MongoClient, Collection } from 'mongodb';

let client: MongoClient | null = null;

export async function getCollection(): Promise<Collection> {
  if (!client) {
    if (!process.env.COSMOS_CONNECTION_STRING) {
      throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
    }
    client = new MongoClient(process.env.COSMOS_CONNECTION_STRING);
    await client.connect();
    console.log('Connected to Cosmos DB');
  }

  const db = client.db(process.env.COSMOS_DB_NAME);
  return db.collection(process.env.COSMOS_COLLECTION_NAME || 'media');
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    console.log('Closed Cosmos DB connection');
  }
} 