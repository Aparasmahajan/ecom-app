-- =====================================================================
-- V3 — restrict user.role to the known set. SUPER_ADMIN is added here.
-- =====================================================================
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN'));

-- Enforce at most ONE super admin at the DB level as a hard guarantee —
-- the seeder is idempotent but this stops anyone (SQL, another dev, a bug)
-- from ever ending up with two SUPER_ADMIN rows.
CREATE UNIQUE INDEX one_super_admin ON users(role) WHERE role = 'SUPER_ADMIN';
