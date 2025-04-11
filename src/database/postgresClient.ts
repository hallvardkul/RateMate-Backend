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

// Test the connection immediately
console.log('Testing PostgreSQL connection...');
pool.connect()
  .then(client => {
    console.log('✓ Successfully connected to PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('✗ PostgreSQL connection test failed:', err.message);
    console.error('Make sure PostgreSQL is running and your connection details are correct.');
    
    // Log some helpful troubleshooting tips
    console.log('Troubleshooting tips:');
    console.log('1. Verify the POSTGRES_PASSWORD environment variable is set correctly');
    console.log('2. Check that ratemate_appuser has proper permissions in Azure PostgreSQL');
    console.log('3. Ensure your IP address is allowed in Azure PostgreSQL firewall rules');
    console.log('4. Verify the user has USAGE permission on the dbo schema');
  });

// Add event listeners
pool.on('connect', () => {
  console.log('Connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export default pool; 