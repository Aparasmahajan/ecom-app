-- =====================================================================
-- V5 — Combos: admin-curated bundles of products sold at a discount.
-- =====================================================================
CREATE TABLE combos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255)  NOT NULL,
    description TEXT          NOT NULL DEFAULT '',
    image       VARCHAR(500)  NOT NULL,
    combo_price NUMERIC(10,2) NOT NULL,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_combos_active ON combos(is_active) WHERE is_active = TRUE;

-- Join table — many products per combo, and a product can appear in many combos.
CREATE TABLE combo_products (
    combo_id   UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (combo_id, product_id)
);
CREATE INDEX idx_combo_products_combo ON combo_products(combo_id);

-- Auto-bump updated_at on write (mirrors the trigger for orders in V4).
CREATE TRIGGER trg_combos_updated_at
BEFORE UPDATE ON combos
FOR EACH ROW EXECUTE FUNCTION orders_touch_updated_at();

-- Seed three combos referencing existing products by name so the storefront
-- has something to display out of the box.
DO $$
DECLARE
    combo_id   UUID;
    p1 UUID; p2 UUID; p3 UUID;
BEGIN
    -- Streetwear Starter: Washed Oversized Tee + Baggy Jeans + Streetwear Hoodie
    SELECT id INTO p1 FROM products WHERE name = 'Washed Oversized Tee' LIMIT 1;
    SELECT id INTO p2 FROM products WHERE name = 'Baggy Jeans' LIMIT 1;
    SELECT id INTO p3 FROM products WHERE name = 'Streetwear Hoodie' LIMIT 1;
    IF p1 IS NOT NULL AND p2 IS NOT NULL AND p3 IS NOT NULL THEN
        INSERT INTO combos (name, description, image, combo_price)
        VALUES (
            'Streetwear Starter',
            'Oversized tee + baggy jeans + streetwear hoodie — the essentials.',
            'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80',
            3499
        ) RETURNING id INTO combo_id;
        INSERT INTO combo_products (combo_id, product_id, position) VALUES
            (combo_id, p1, 0), (combo_id, p2, 1), (combo_id, p3, 2);
    END IF;

    -- Formal Complete: Oversized Shirt + Slim Fit Jeans
    SELECT id INTO p1 FROM products WHERE name = 'Oversized Shirt' LIMIT 1;
    SELECT id INTO p2 FROM products WHERE name = 'Slim Fit Jeans' LIMIT 1;
    IF p1 IS NOT NULL AND p2 IS NOT NULL THEN
        INSERT INTO combos (name, description, image, combo_price)
        VALUES (
            'Formal Complete',
            'Oversized shirt + slim-fit jeans — a smart-casual set.',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80',
            1899
        ) RETURNING id INTO combo_id;
        INSERT INTO combo_products (combo_id, product_id, position) VALUES
            (combo_id, p1, 0), (combo_id, p2, 1);
    END IF;

    -- Weekend Chill: Classic White Tee + Classic Grey Hoodie
    SELECT id INTO p1 FROM products WHERE name = 'Classic White Tee' LIMIT 1;
    SELECT id INTO p2 FROM products WHERE name = 'Classic Grey Hoodie' LIMIT 1;
    IF p1 IS NOT NULL AND p2 IS NOT NULL THEN
        INSERT INTO combos (name, description, image, combo_price)
        VALUES (
            'Weekend Chill',
            'Classic white tee + grey hoodie — the go-to weekend combo.',
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
            1899
        ) RETURNING id INTO combo_id;
        INSERT INTO combo_products (combo_id, product_id, position) VALUES
            (combo_id, p1, 0), (combo_id, p2, 1);
    END IF;
END $$;
