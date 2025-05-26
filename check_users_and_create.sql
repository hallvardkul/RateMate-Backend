-- First, let's see what users exist
SELECT usename, usesuper, usecreatedb FROM pg_user ORDER BY usename;

-- Check if hallvard user exists
SELECT EXISTS(SELECT 1 FROM pg_user WHERE usename = 'hallvard') as hallvard_exists;

-- If hallvard doesn't exist, create it (uncomment the line below if needed)
-- CREATE USER hallvard;

-- Alternative: Grant permissions to the actual MCP user
-- First let's see what the current user is from the MCP perspective
-- Then we can grant permissions to that user instead 