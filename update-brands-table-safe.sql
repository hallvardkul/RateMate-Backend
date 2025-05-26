-- Update Brands Table for Verification System (Safe Version)
-- Add verification-related columns to the brands table

-- Add verification_status column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='verification_status' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN verification_status VARCHAR(20) DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add verification_submitted_at column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='verification_submitted_at' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN verification_submitted_at TIMESTAMP;
    END IF;
END $$;

-- Add verification_approved_at column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='verification_approved_at' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN verification_approved_at TIMESTAMP;
    END IF;
END $$;

-- Add business_registration column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='business_registration' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN business_registration VARCHAR(500);
    END IF;
END $$;

-- Add website column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='website' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN website VARCHAR(500);
    END IF;
END $$;

-- Add social_media column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='social_media' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN social_media TEXT;
    END IF;
END $$;

-- Add additional_verification_info column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='additional_verification_info' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN additional_verification_info TEXT;
    END IF;
END $$;

-- Add verification_notes column only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='verification_notes' AND table_schema='dbo') THEN
        ALTER TABLE dbo.brands ADD COLUMN verification_notes TEXT;
    END IF;
END $$;

-- Create indexes for verification queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_brands_verification_status ON dbo.brands(verification_status);
CREATE INDEX IF NOT EXISTS idx_brands_verification_submitted_at ON dbo.brands(verification_submitted_at);

-- Update existing brands to have default verification status
UPDATE dbo.brands SET verification_status = 'not_submitted' WHERE verification_status IS NULL; 