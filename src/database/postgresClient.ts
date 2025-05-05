import { Pool } from 'pg';

// Configure for PostgreSQL connection
const DB_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'RateMate_dev_db',
  user: process.env.POSTGRES_USER || 'ratemate_appuser',
  password: process.env.POSTGRES_PASSWORD || 'Achivegreatness',
  port: 5432,
  ssl: {
    rejectUnauthorized: false  // Required for Azure Database for PostgreSQL as per documentation
  }
};

// Log connection details for debugging
console.log('PostgreSQL connection details:', {
  host: DB_CONFIG.host,
  database: DB_CONFIG.database,
  user: DB_CONFIG.user,
  password: '****' // Don't log the actual password
});

// Configure pool
const pool = new Pool(DB_CONFIG);

// Add event listeners
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL pool');
  // Set default schema to dbo so unqualified table names resolve correctly
  client.query('SET search_path TO dbo')
    .then(() => console.log('search_path set to dbo'))
    .catch(err => console.error('Error setting search_path:', err.message));
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export default pool; 