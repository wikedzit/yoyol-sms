-- The live school table is already nullable on color columns (0034),
-- and 0041 already added students.admission_number plus its indexes.
-- Rebuilding school fails on D1: foreign_keys=OFF is ignored inside the
-- migration transaction, so DROP TABLE school hits campus and students.
SELECT 1;
