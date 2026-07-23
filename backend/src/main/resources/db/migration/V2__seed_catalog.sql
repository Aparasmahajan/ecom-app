-- =====================================================================
-- V2 — seed categories + products so the app boots with a working catalog.
-- Admin account is seeded programmatically in ShopAppApplication.CommandLineRunner
-- (so the password is BCrypt-hashed with the currently-configured secret).
-- =====================================================================
INSERT INTO categories (id, name, gender, age_group, emoji) VALUES
    ('shirts',  'Shirts',      'UNISEX', 'ADULT', '👔'),
    ('tshirts', 'T-Shirts',    'UNISEX', 'ADULT', '👕'),
    ('jeans',   'Jeans',       'UNISEX', 'ADULT', '👖'),
    ('hoodies', 'Hoodies',     'UNISEX', 'ADULT', '🧥'),
    ('coords',  'Co-ord Sets', 'UNISEX', 'ADULT', '🕴️')
ON CONFLICT (id) DO NOTHING;

-- Products with rotating image pools (matches static/lib/images.ts)
WITH new_products (name, description, category_id, base_price, hot, imgs) AS (
    VALUES
    ('Oversized Shirt',      'Premium oversized shirt with a relaxed fit and tailored finish.', 'shirts',  999.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1622519407650-3df9883f76a5?auto=format&fit=crop&w=800&q=80']),
    ('Denim Overshirt',      'Rugged denim overshirt — layer over anything.',                   'shirts', 1199.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1622519407650-3df9883f76a5?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80']),
    ('Linen Casual Shirt',   'Breathable linen shirt in a modern relaxed cut.',                 'shirts', 1099.00, FALSE,  ARRAY['https://images.unsplash.com/photo-1622519407650-3df9883f76a5?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80']),
    ('Classic White Tee',    'Everyday essential — soft cotton white tee.',                     'tshirts', 599.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80']),
    ('Minimal Printed Tee',  'Minimal printed t-shirt in super-soft cotton.',                   'tshirts', 749.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80']),
    ('Dark Graphic Tee',     'Premium graphic tee, back-print statement piece.',                'tshirts', 799.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80']),
    ('Washed Oversized Tee', 'Washed finish, oversized silhouette, ultra-comfort.',             'tshirts', 849.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80']),
    ('Baggy Jeans',          'Trending baggy fit denim with a clean wash.',                     'jeans',  1299.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80']),
    ('Slim Fit Jeans',       'Classic slim-fit jeans in stretch denim.',                        'jeans',  1099.00, FALSE,  ARRAY['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=800&q=80']),
    ('Distressed Denim',     'Rugged distressed denim, statement piece.',                       'jeans',  1499.00, FALSE,  ARRAY['https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80']),
    ('Classic Grey Hoodie',  'Heavy-weight hoodie with brushed fleece lining.',                 'hoodies',1599.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800&q=80']),
    ('Streetwear Hoodie',    'Oversized streetwear hoodie with statement print.',               'hoodies',1699.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1512327428889-607dbcda2093?auto=format&fit=crop&w=800&q=80']),
    ('Zip-up Hoodie',        'Everyday zip-up hoodie in ultra-soft cotton.',                    'hoodies',1799.00, FALSE,  ARRAY['https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1512327428889-607dbcda2093?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80']),
    ('Beige Co-ord Set',     'Premium coordinated set — shirt + trousers in beige.',            'coords', 2499.00,  TRUE,  ARRAY['https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80']),
    ('Neutral Co-ord Set',   'Neutral-tone co-ord set with tailored finish.',                   'coords', 2699.00, FALSE,  ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=80'])
)
INSERT INTO products (name, description, category_id, gender, age_group, base_price, is_hot_seller, images)
SELECT name, description, category_id, 'UNISEX', 'ADULT', base_price, hot, imgs
FROM new_products;

-- Give every product a small default variant set. Split by category to keep
-- realistic size ranges.
INSERT INTO product_variants (product_id, size, color, stock)
SELECT p.id, s.size, 'Black', 20
FROM products p
CROSS JOIN LATERAL (
    SELECT unnest(
        CASE p.category_id
            WHEN 'jeans'   THEN ARRAY['30','32','34','36']
            WHEN 'coords'  THEN ARRAY['S','M','L','XL']
            ELSE ARRAY['S','M','L','XL','XXL']
        END
    ) AS size
) s;
