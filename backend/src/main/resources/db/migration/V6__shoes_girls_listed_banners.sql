-- =====================================================================
-- V6 — Shoes + Girls Outfit sections, product listing fields, banners,
--       and storefront settings (home banner count).
-- =====================================================================

-- ---------- New categories ----------
INSERT INTO categories (id, name, gender, age_group, emoji) VALUES
    ('shoes', 'Shoes',        'UNISEX', 'ADULT', '👟'),
    ('girls', 'Girls Outfit', 'WOMEN',  'KIDS',  '👗')
ON CONFLICT (id) DO NOTHING;

-- ---------- New products for the two sections ----------
WITH new_products (name, description, category_id, gender, age_group, base_price, hot, imgs) AS (
    VALUES
    ('Classic Sneakers',   'Everyday low-top sneakers with cushioned sole.',            'shoes', 'UNISEX', 'ADULT', 1999.00, TRUE,  ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80']),
    ('Retro Runners',      'Retro-styled running shoes with a breathable knit upper.',  'shoes', 'UNISEX', 'ADULT', 2299.00, TRUE,  ARRAY['https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80']),
    ('White Court Shoes',  'Minimal white court shoes — pairs with everything.',        'shoes', 'UNISEX', 'ADULT', 2499.00, FALSE, ARRAY['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80']),
    ('High-Top Kicks',     'Street-ready high-top sneakers with ankle support.',        'shoes', 'UNISEX', 'ADULT', 2699.00, FALSE, ARRAY['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80']),
    ('Floral Summer Dress','Breezy floral dress for girls — soft cotton, easy fit.',    'girls', 'WOMEN',  'KIDS',  899.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=80']),
    ('Denim Pinafore',     'Cute denim pinafore dress, adjustable straps.',             'girls', 'WOMEN',  'KIDS',  1099.00, TRUE,  ARRAY['https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=800&q=80']),
    ('Party Frock',        'Layered party frock with a satin bow.',                     'girls', 'WOMEN',  'KIDS',  1399.00, FALSE, ARRAY['https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80']),
    ('Coord Top & Skirt',  'Matching top-and-skirt set in pastel tones.',              'girls', 'WOMEN',  'KIDS',  1199.00, FALSE, ARRAY['https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80'])
)
INSERT INTO products (name, description, category_id, gender, age_group, base_price, is_hot_seller, images)
SELECT name, description, category_id, gender, age_group, base_price, hot, imgs
FROM new_products;

-- Variants for the new products only (existing products keep their V2 variants).
INSERT INTO product_variants (product_id, size, color, stock)
SELECT p.id, s.size, 'Black', 15
FROM products p
CROSS JOIN LATERAL (
    SELECT unnest(
        CASE p.category_id
            WHEN 'shoes' THEN ARRAY['6','7','8','9','10']
            WHEN 'girls' THEN ARRAY['2-3Y','4-5Y','6-7Y','8-9Y']
        END
    ) AS size
) s
WHERE p.category_id IN ('shoes', 'girls');

-- ---------- Product listing fields (storefront visibility, separate from stock) ----------
ALTER TABLE products ADD COLUMN IF NOT EXISTS listed        BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS list_quantity INTEGER NOT NULL DEFAULT 0;

-- Seed list_quantity from the sum of each product's real stock as a sensible start.
UPDATE products p
SET list_quantity = COALESCE((
    SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id
), 0)
WHERE p.list_quantity = 0;

-- ---------- Banners (landing-page banner manager) ----------
CREATE TABLE banners (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template   VARCHAR(32)  NOT NULL DEFAULT 'hero',
    title      VARCHAR(255) NOT NULL,
    subtitle   VARCHAR(500) NOT NULL DEFAULT '',
    image_url  VARCHAR(500) NOT NULL DEFAULT '',
    price      VARCHAR(64)  NOT NULL DEFAULT '',
    cta_text   VARCHAR(64)  NOT NULL DEFAULT 'Shop Now',
    cta_href   VARCHAR(255) NOT NULL DEFAULT '/products',
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    position   INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_banners_active ON banners(active) WHERE active = TRUE;

CREATE TRIGGER trg_banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION orders_touch_updated_at();

INSERT INTO banners (template, title, subtitle, image_url, price, cta_text, cta_href, position) VALUES
    ('hero',  'NEW SEASON DROP',    'Fresh fits for every day',              'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80', '',       'Shop Now',    '/products',                  0),
    ('sale',  'END OF SEASON SALE', 'Up to 50% off on hoodies & co-ords',    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80',  '₹999',   'Grab Deals',  '/products?categoryId=hoodies', 1),
    ('split', 'STEP INTO STYLE',    'New sneakers just landed',              'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',  '₹1999',  'Shop Shoes',  '/products?categoryId=shoes',   2);

-- ---------- Storefront settings (key/value) ----------
CREATE TABLE app_settings (
    key   VARCHAR(64) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);
INSERT INTO app_settings (key, value) VALUES ('home_banner_count', '3')
ON CONFLICT (key) DO NOTHING;
