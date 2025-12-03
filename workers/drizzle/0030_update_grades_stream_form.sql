-- Migration: Update grades table to use stream_id and form_id instead of semester_id
-- This aligns grades with the O-Level/A-Level academic structure

-- Step 1: Create a new grades table with the updated schema
CREATE TABLE IF NOT EXISTS grades_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    stream_id INTEGER NOT NULL,
    form_id INTEGER NOT NULL,
    teacher_id INTEGER,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    remarks TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (stream_id) REFERENCES academic_streams(id) ON DELETE CASCADE,
    FOREIGN KEY (form_id) REFERENCES academic_forms(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- Step 2: Drop the old grades table
DROP TABLE IF EXISTS grades;

-- Step 3: Rename the new table to grades
ALTER TABLE grades_new RENAME TO grades;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_stream_id ON grades(stream_id);
CREATE INDEX IF NOT EXISTS idx_grades_form_id ON grades(form_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_id ON grades(teacher_id);

