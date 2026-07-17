-- =====================================================================
-- V1 — initial schema for URBAN Clothing Co
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),
    name           VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    role           VARCHAR(16)  NOT NULL DEFAULT 'USER',
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- ---------------------------------------------------------------------
-- Addresses (1..N per user)
-- ---------------------------------------------------------------------
CREATE TABLE addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name   VARCHAR(255) NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    line1       VARCHAR(255) NOT NULL,
    line2       VARCHAR(255),
    city        VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    pincode     VARCHAR(10)  NOT NULL,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);
-- Enforce exactly-one default per user (partial unique index)
CREATE UNIQUE INDEX idx_one_default_addr ON addresses(user_id) WHERE is_default = TRUE;

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    gender      VARCHAR(16)  NOT NULL,      -- MEN | WOMEN | UNISEX
    age_group   VARCHAR(16)  NOT NULL,      -- KIDS | TEEN | ADULT
    emoji       VARCHAR(10),
    image_url   VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Products + search (full-text + fuzzy trigram)
-- ---------------------------------------------------------------------
CREATE TABLE products (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                   VARCHAR(255) NOT NULL,
    description            TEXT         NOT NULL DEFAULT '',
    category_id            VARCHAR(50)  NOT NULL REFERENCES categories(id),
    gender                 VARCHAR(16)  NOT NULL,
    age_group              VARCHAR(16)  NOT NULL,
    base_price             NUMERIC(10,2) NOT NULL,
    images                 TEXT[]       NOT NULL DEFAULT '{}',
    is_hot_seller          BOOLEAN      NOT NULL DEFAULT FALSE,
    admin_rating_override  NUMERIC(2,1),
    search_vector          TSVECTOR,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_hot       ON products(is_hot_seller) WHERE is_hot_seller = TRUE;
CREATE INDEX idx_products_search    ON products USING GIN(search_vector);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- Maintain search_vector automatically on write
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
BEFORE INSERT OR UPDATE OF name, description ON products
FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- ---------------------------------------------------------------------
-- Product variants (size + color + stock)
-- ---------------------------------------------------------------------
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size            VARCHAR(30) NOT NULL,
    color           VARCHAR(50) NOT NULL DEFAULT 'Default',
    stock           INTEGER     NOT NULL DEFAULT 0,
    price_modifier  NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color)
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ---------------------------------------------------------------------
-- Wishlist (userId × productId)
-- ---------------------------------------------------------------------
CREATE TABLE wishlist_items (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
CREATE INDEX idx_wishlist_user ON wishlist_items(user_id);

-- ---------------------------------------------------------------------
-- Cart items
-- ---------------------------------------------------------------------
CREATE TABLE cart_items (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    note       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cart_user ON cart_items(user_id);

-- ---------------------------------------------------------------------
-- Orders + snapshot items
-- ---------------------------------------------------------------------
CREATE TABLE orders (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES users(id),
    address_id            UUID REFERENCES addresses(id),
    status                VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    payment_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    subtotal              NUMERIC(10,2) NOT NULL,
    total                 NUMERIC(10,2) NOT NULL,
    razorpay_order_id     VARCHAR(120),
    razorpay_payment_id   VARCHAR(120),
    razorpay_signature    VARCHAR(200),
    -- flattened address snapshot for historical accuracy
    ship_full_name        VARCHAR(255),
    ship_phone            VARCHAR(20),
    ship_line1            VARCHAR(255),
    ship_line2            VARCHAR(255),
    ship_city             VARCHAR(100),
    ship_state            VARCHAR(100),
    ship_pincode          VARCHAR(10),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user   ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id              UUID NOT NULL REFERENCES products(id),
    variant_id              UUID NOT NULL REFERENCES product_variants(id),
    product_name_snapshot   VARCHAR(255) NOT NULL,
    size                    VARCHAR(30) NOT NULL,
    quantity                INTEGER NOT NULL,
    unit_price              NUMERIC(10,2) NOT NULL,
    note                    TEXT NOT NULL DEFAULT '',
    image                   VARCHAR(500)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ---------------------------------------------------------------------
-- Reviews (unique per user × product)
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stars               INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment             TEXT NOT NULL DEFAULT '',
    admin_override_stars INTEGER CHECK (admin_override_stars BETWEEN 1 AND 5),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- ---------------------------------------------------------------------
-- OTP tokens (email-based one-time passcodes)
-- ---------------------------------------------------------------------
CREATE TABLE otp_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      VARCHAR(255) NOT NULL,
    otp_hash   VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_email ON otp_tokens(email, created_at DESC);
