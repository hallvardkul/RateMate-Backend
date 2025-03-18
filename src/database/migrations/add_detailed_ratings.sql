-- Add detailed ratings functionality to the reviews system

-- 1. First, ensure the reviews table exists (this is just a check, should already exist)
CREATE TABLE IF NOT EXISTS dbo.reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES dbo.products(product_id),
    FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);

-- 2. Create a new table for detailed category ratings
CREATE TABLE dbo.category_ratings (
    rating_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES dbo.reviews(review_id) ON DELETE CASCADE,
    UNIQUE (review_id, category)
);

-- 3. Create an index for faster lookups
CREATE INDEX idx_category_ratings_review_id ON dbo.category_ratings(review_id);

-- 4. Add predefined categories (for reference and validation)
CREATE TABLE dbo.rating_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Insert predefined categories
INSERT INTO dbo.rating_categories (category_name, description) VALUES
('value_for_money', 'Rating for the value received relative to the price paid'),
('build_quality', 'Rating for the quality of materials and construction'),
('functionality', 'Rating for how well the product performs its intended functions'),
('durability', 'Rating for how well the product withstands wear and tear over time'),
('ease_of_use', 'Rating for how intuitive and simple the product is to use'),
('aesthetics', 'Rating for the visual appeal and design of the product'),
('compatibility', 'Rating for how well the product works with other devices or systems');

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA dbo TO ratemate_appuser;
GRANT ALL PRIVILEGES ON TABLE dbo.category_ratings TO ratemate_appuser;
GRANT ALL PRIVILEGES ON TABLE dbo.rating_categories TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.category_ratings_rating_id_seq TO ratemate_appuser;
GRANT USAGE, SELECT ON SEQUENCE dbo.rating_categories_category_id_seq TO ratemate_appuser; 