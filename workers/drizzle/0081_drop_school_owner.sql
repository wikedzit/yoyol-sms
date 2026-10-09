-- The founding account is already an admin membership (0045).
-- A person can belong to more than one school, so the school row no longer names an owner.
DROP INDEX IF EXISTS school_owner_user_id_idx;
ALTER TABLE school DROP COLUMN owner_user_id;
