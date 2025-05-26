-- Migration: Enhance User and Brand System
-- This migration adds user types, brand profiles, and enhanced relationships

-- 1. Add new columns to users table
ALTER TABLE dbo.users 
ADD COLUMN user_type VARCHAR(10) DEFAULT 'user' CHECK (user_type IN ('user', 'brand')),
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN bio TEXT,
ADD COLUMN avatar_url VARCHAR(500),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN website VARCHAR(500),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Update existing users to have default user_type
UPDATE dbo.users SET user_type = 'user' WHERE user_type IS NULL;

-- 3. Enhance brands table
ALTER TABLE dbo.brands 
ADD COLUMN user_id INTEGER REFERENCES dbo.users(user_id) ON DELETE CASCADE,
ADD COLUMN brand_description TEXT,
ADD COLUMN logo_url VARCHAR(500),
ADD COLUMN website VARCHAR(500),
ADD COLUMN contact_email VARCHAR(255),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN address TEXT,
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Create brand_followers table
CREATE TABLE IF NOT EXISTS dbo.brand_followers (
    follow_id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES dbo.brands(brand_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, user_id)
);

-- 5. Enhance products table
ALTER TABLE dbo.products 
ADD COLUMN product_description TEXT,
ADD COLUMN brand_id INTEGER REFERENCES dbo.brands(brand_id) ON DELETE SET NULL,
ADD COLUMN price DECIMAL(10,2),
ADD COLUMN image_url VARCHAR(500),
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_type ON dbo.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON dbo.users(is_verified);
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON dbo.brands(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_verification_status ON dbo.brands(verification_status);
CREATE INDEX IF NOT EXISTS idx_brand_followers_brand_id ON dbo.brand_followers(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_followers_user_id ON dbo.brand_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON dbo.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON dbo.products(is_active);

-- 7. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON dbo.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON dbo.brands 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON dbo.products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Add constraints and defaults
ALTER TABLE dbo.users ALTER COLUMN user_type SET NOT NULL;
ALTER TABLE dbo.users ALTER COLUMN is_verified SET NOT NULL;
ALTER TABLE dbo.brands ALTER COLUMN verification_status SET NOT NULL;
ALTER TABLE dbo.products ALTER COLUMN is_active SET NOT NULL; 