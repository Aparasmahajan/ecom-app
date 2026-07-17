-- =====================================================================
-- V4 — order fields the admin panel needs to fully manage fulfilment:
--   tracking_number  : courier's tracking id (populated after SHIPPED)
--   admin_notes      : private notes visible only to admins
--   cancel_reason    : short reason surfaced back to the customer
-- =====================================================================
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(120);
ALTER TABLE orders ADD COLUMN admin_notes     TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN cancel_reason   VARCHAR(500);

-- Bump updated_at automatically on any UPDATE (no more relying on the app
-- to remember). Cheap trigger, fires only on write.
CREATE OR REPLACE FUNCTION orders_touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION orders_touch_updated_at();
