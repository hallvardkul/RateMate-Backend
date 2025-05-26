-- Fix Users Table Schema (Safe Version - Checks if columns exist first)
-- Add missing columns that the authentication system expects

-- Add user_type column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_type' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN user_type VARCHAR(10) DEFAULT 'user' CHECK (user_type IN ('user', 'brand'));
    END IF;
END $$;

-- Add is_verified column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add bio column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Add avatar_url column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN avatar_url VARCHAR(500);
    END IF;
END $$;

-- Add phone column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;

-- Add website column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='website' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN website VARCHAR(500);
    END IF;
END $$;

-- Add updated_at column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at' AND table_schema='dbo') THEN
        ALTER TABLE dbo.users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing users to have default user_type
UPDATE dbo.users SET user_type = 'user' WHERE user_type IS NULL;

-- Make user_type NOT NULL (only if the column exists and isn't already NOT NULL)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_type' AND table_schema='dbo' AND is_nullable='YES') THEN
        ALTER TABLE dbo.users ALTER COLUMN user_type SET NOT NULL;
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_user_type ON dbo.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON dbo.users(is_verified); 