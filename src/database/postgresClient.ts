import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Required for Azure Database for PostgreSQL
  }
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

export default pool; 