-- Fix Users Table Schema
-- Add missing columns that the authentication system expects

-- Add user_type column (user or brand)
ALTER TABLE dbo.users 
ADD COLUMN user_type VARCHAR(10) DEFAULT 'user' CHECK (user_type IN ('user', 'brand'));

-- Add is_verified column 
ALTER TABLE dbo.users 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Add bio column
ALTER TABLE dbo.users 
ADD COLUMN bio TEXT;

-- Add avatar_url column
ALTER TABLE dbo.users 
ADD COLUMN avatar_url VARCHAR(500);

-- Add phone column
ALTER TABLE dbo.users 
ADD COLUMN phone VARCHAR(20);

-- Add website column
ALTER TABLE dbo.users 
ADD COLUMN website VARCHAR(500);

-- Add updated_at column
ALTER TABLE dbo.users 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing users to have default user_type
UPDATE dbo.users SET user_type = 'user' WHERE user_type IS NULL;

-- Make user_type NOT NULL
ALTER TABLE dbo.users ALTER COLUMN user_type SET NOT NULL;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON dbo.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_users_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON dbo.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON dbo.users(is_verified); 