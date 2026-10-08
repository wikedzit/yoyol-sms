ALTER TABLE subjects ADD COLUMN level_id integer REFERENCES academic_levels(id);

UPDATE subjects
SET level_id = (
  SELECT academic_streams.level_id
  FROM academic_streams
  WHERE academic_streams.id = subjects.stream_id
)
WHERE level_id IS NULL;
