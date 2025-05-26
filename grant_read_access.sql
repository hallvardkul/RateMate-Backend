-- Grant read access to hallvard user for dbo schema and all tables
-- Run this script as a user with admin privileges (like ratemate_testuser or postgres admin)

-- Create hallvard user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'hallvard') THEN
        CREATE USER hallvard;
        RAISE NOTICE 'User hallvard created';
    ELSE
        RAISE NOTICE 'User hallvard already exists';
    END IF;
END
$$;

-- Grant usage on the dbo schema
GRANT USAGE ON SCHEMA dbo TO hallvard;

-- Grant select on all existing tables in dbo schema
GRANT SELECT ON ALL TABLES IN SCHEMA dbo TO hallvard;

-- Grant select on all future tables in dbo schema (so you don't need to run this again)
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo GRANT SELECT ON TABLES TO hallvard;

-- Optional: Grant select on all sequences in dbo schema (for auto-increment columns)
GRANT SELECT ON ALL SEQUENCES IN SCHEMA dbo TO hallvard;
ALTER DEFAULT PRIVILEGES IN SCHEMA dbo GRANT SELECT ON SEQUENCES TO hallvard;

-- Verify the grants were applied
SELECT 
    schemaname,
    tablename,
    has_table_privilege('hallvard', schemaname||'.'||tablename, 'SELECT') as can_select
FROM pg_tables 
WHERE schemaname = 'dbo'
ORDER BY tablename; 