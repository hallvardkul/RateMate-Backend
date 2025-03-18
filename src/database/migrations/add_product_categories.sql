-- Create the product_categories table for main categories
CREATE TABLE IF NOT EXISTS dbo.product_categories
(
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the product_subcategories table
CREATE TABLE IF NOT EXISTS dbo.product_subcategories
(
    subcategory_id SERIAL PRIMARY KEY,
    parent_category_id INTEGER NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES dbo.product_categories(category_id) ON DELETE CASCADE,
    UNIQUE(parent_category_id, subcategory_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_subcategories_parent ON dbo.product_subcategories(parent_category_id);

-- Modify the products table to reference the subcategory instead of storing category as a string
-- First, add the new column
ALTER TABLE dbo.products ADD COLUMN IF NOT EXISTS subcategory_id INTEGER;

-- Create an index on the new column
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON dbo.products(subcategory_id);

-- Add the foreign key constraint (but don't enforce it yet for existing data)
ALTER TABLE dbo.products 
ADD CONSTRAINT fk_products_subcategory 
FOREIGN KEY (subcategory_id) REFERENCES dbo.product_subcategories(subcategory_id) 
NOT VALID;  -- NOT VALID means it won't check existing data

-- Insert some example main categories
INSERT INTO dbo.product_categories (category_name, description)
VALUES 
    ('Electronics', 'Electronic devices and accessories'),
    ('Clothing', 'Apparel and fashion items'),
    ('Home & Kitchen', 'Home appliances and kitchen products'),
    ('Sports & Outdoors', 'Sporting goods and outdoor equipment'),
    ('Beauty & Personal Care', 'Beauty products and personal care items')
ON CONFLICT (category_name) DO NOTHING;

-- Insert some example subcategories
-- Electronics subcategories
INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Smartphones', 'Mobile phones and accessories'
FROM dbo.product_categories WHERE category_name = 'Electronics'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Laptops', 'Notebook computers and accessories'
FROM dbo.product_categories WHERE category_name = 'Electronics'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Audio', 'Headphones, speakers, and audio equipment'
FROM dbo.product_categories WHERE category_name = 'Electronics'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

-- Clothing subcategories
INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Men''s Clothing', 'Clothing items for men'
FROM dbo.product_categories WHERE category_name = 'Clothing'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Women''s Clothing', 'Clothing items for women'
FROM dbo.product_categories WHERE category_name = 'Clothing'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Shoes', 'Footwear for all ages'
FROM dbo.product_categories WHERE category_name = 'Clothing'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

-- Home & Kitchen subcategories
INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Kitchen Appliances', 'Appliances for kitchen use'
FROM dbo.product_categories WHERE category_name = 'Home & Kitchen'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

INSERT INTO dbo.product_subcategories (parent_category_id, subcategory_name, description)
SELECT category_id, 'Furniture', 'Home and office furniture'
FROM dbo.product_categories WHERE category_name = 'Home & Kitchen'
ON CONFLICT (parent_category_id, subcategory_name) DO NOTHING;

-- Grant permissions
GRANT ALL ON TABLE dbo.product_categories TO "Ratematepostgres";
GRANT ALL ON TABLE dbo.product_categories TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.product_categories_category_id_seq TO "Ratematepostgres";
GRANT USAGE, SELECT ON SEQUENCE dbo.product_categories_category_id_seq TO ratemate_appuser;

GRANT ALL ON TABLE dbo.product_subcategories TO "Ratematepostgres";
GRANT ALL ON TABLE dbo.product_subcategories TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.product_subcategories_subcategory_id_seq TO "Ratematepostgres";
GRANT USAGE, SELECT ON SEQUENCE dbo.product_subcategories_subcategory_id_seq TO ratemate_appuser;

-- Migration helper function to move existing products to the new category system
-- This is a placeholder - you'll need to run this manually after populating categories
/*
CREATE OR REPLACE FUNCTION dbo.migrate_product_categories() RETURNS void AS $$
DECLARE
    product_record RECORD;
    subcategory_id_val INTEGER;
BEGIN
    FOR product_record IN SELECT product_id, product_category FROM dbo.products LOOP
        -- Find or create appropriate subcategory
        SELECT sc.subcategory_id INTO subcategory_id_val
        FROM dbo.product_subcategories sc
        JOIN dbo.product_categories pc ON sc.parent_category_id = pc.category_id
        WHERE sc.subcategory_name = product_record.product_category
        OR pc.category_name = product_record.product_category
        LIMIT 1;
        
        -- Update the product with the subcategory_id if found
        IF subcategory_id_val IS NOT NULL THEN
            UPDATE dbo.products
            SET subcategory_id = subcategory_id_val
            WHERE product_id = product_record.product_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
-- SELECT dbo.migrate_product_categories();
*/

-- Note: After running this migration and populating categories,
-- you may want to make subcategory_id NOT NULL and drop the product_category column
-- ALTER TABLE dbo.products ALTER COLUMN subcategory_id SET NOT NULL;
-- ALTER TABLE dbo.products DROP COLUMN product_category; 