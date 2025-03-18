-- First, alter the reviews table to change the rating constraint from 1-5 to 1-10
ALTER TABLE dbo.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE dbo.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 10);

-- Create the rating_categories table
CREATE TABLE IF NOT EXISTS dbo.rating_categories
(
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create the category_ratings table
CREATE TABLE IF NOT EXISTS dbo.category_ratings
(
    rating_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES dbo.reviews(review_id) ON DELETE CASCADE,
    UNIQUE (review_id, category)
);

-- Create an index on review_id for better performance
CREATE INDEX IF NOT EXISTS idx_category_ratings_review_id ON dbo.category_ratings(review_id);

-- Insert predefined rating categories
INSERT INTO dbo.rating_categories (category_name, description, is_active)
VALUES 
    ('value_for_money', 'Rating for the value received relative to the price paid', true),
    ('build_quality', 'Rating for the quality of materials and construction', true),
    ('functionality', 'Rating for how well the product performs its intended functions', true),
    ('durability', 'Rating for how well the product withstands wear and tear', true),
    ('ease_of_use', 'Rating for how intuitive and simple the product is to use', true),
    ('aesthetics', 'Rating for the visual appeal and design of the product', true),
    ('compatibility', 'Rating for how well the product works with other devices/systems', true)
ON CONFLICT (category_name) DO NOTHING;

-- Grant permissions
GRANT ALL ON TABLE dbo.rating_categories TO "Ratematepostgres";
GRANT ALL ON TABLE dbo.rating_categories TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.rating_categories_category_id_seq TO "Ratematepostgres";
GRANT USAGE, SELECT ON SEQUENCE dbo.rating_categories_category_id_seq TO ratemate_appuser;

GRANT ALL ON TABLE dbo.category_ratings TO "Ratematepostgres";
GRANT ALL ON TABLE dbo.category_ratings TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.category_ratings_rating_id_seq TO "Ratematepostgres";
GRANT USAGE, SELECT ON SEQUENCE dbo.category_ratings_rating_id_seq TO ratemate_appuser; 