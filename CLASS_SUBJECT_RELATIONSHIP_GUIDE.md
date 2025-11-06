# Class-Subject Many-to-Many Relationship Guide

## Overview

This guide explains the many-to-many relationship between **Classes** and **Subjects** in the Yoyol Student System. A class can have multiple subjects, and a subject can be taught in multiple classes.

---

## Database Architecture

### Join Table: `class_subjects`

The relationship is implemented using a join table with the following structure:

```sql
CREATE TABLE class_subjects (
  class_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  assigned_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY(class_id, subject_id),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
```

**Key Features:**
- **Composite Primary Key**: Prevents duplicate assignments
- **Cascade Deletion**: When a class or subject is deleted, all related assignments are automatically removed
- **Timestamp Tracking**: Records when each assignment was made

---

## Backend Implementation

### 1. Database Schema (`workers/database/class-subjects.ts`)

```typescript
export const classSubjects = sqliteTable(
  'class_subjects',
  {
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.classId, table.subjectId] }),
  })
);
```

### 2. Service Layer (`workers/services/class-subjects.ts`)

The `ClassSubjectService` provides methods to manage the relationship:

#### Key Methods:

**Assign a subject to a class:**
```typescript
await classSubject.assignSubjectToClass(classId, subjectId);
```

**Remove a subject from a class:**
```typescript
await classSubject.removeSubjectFromClass(classId, subjectId);
```

**Get all subjects for a class:**
```typescript
const subjects = await classSubject.getSubjectsByClass(classId);
```

**Get all classes teaching a subject:**
```typescript
const classes = await classSubject.getClassesBySubject(subjectId);
```

**Replace all subjects for a class:**
```typescript
// Removes old assignments and adds new ones
await classSubject.replaceClassSubjects(classId, [subjectId1, subjectId2]);
```

**Assign multiple subjects at once:**
```typescript
await classSubject.assignMultipleSubjects(classId, [subjectId1, subjectId2, subjectId3]);
```

---

## Frontend Implementation

### 1. Class Detail Page (`app/routes/classes.$classId.tsx`)

#### Features Added:

1. **Manage Subjects Button**: Opens a modal to assign/remove subjects
2. **Assigned Subjects Card**: Displays all subjects assigned to the class with badges
3. **Subject Count Badge**: Shows the number of assigned subjects in the button

#### UI Components:

**Button to manage subjects:**
```tsx
<Button
  variant="outline"
  className="border-primary text-primary"
  onClick={() => setAssignSubjectsModalOpen(true)}
>
  <BookOpen className="h-4 w-4 mr-2" />
  Manage Subjects ({assignedSubjects.length})
</Button>
```

**Display assigned subjects:**
```tsx
{assignedSubjects.length > 0 && (
  <Card>
    <CardHeader>
      <h3 className="text-lg font-semibold">Assigned Subjects</h3>
    </CardHeader>
    <CardContent>
      <div className="flex flex-wrap gap-2">
        {assignedSubjects.map((subject) => (
          <Badge key={subject.id} variant="secondary">
            {subject.subjectName} ({subject.code})
          </Badge>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

#### Action Handler:

```typescript
if (action === 'assign_subjects') {
  const classId = Number(form.get('classId'));
  const subjectIds = JSON.parse(String(form.get('subjectIds') || '[]'));
  
  await services.classSubject.replaceClassSubjects(classId, subjectIds);
  
  return { success: true, action: 'assign_subjects' };
}
```

### 2. Subject Management Page (`app/routes/subject.tsx`)

#### Features Added:

1. **Classes Column**: Shows which classes each subject is assigned to
2. **Class Badges**: Each class is displayed as a badge in the table

#### Display classes for a subject:

```tsx
<TableCell>
  <div className="flex items-center gap-2 flex-wrap">
    {subject.classes?.length > 0 ? (
      subject.classes.map((classItem) => (
        <Badge key={classItem.id} variant="outline" className="text-xs">
          {classItem.name}
        </Badge>
      ))
    ) : (
      <span className="text-xs text-muted-foreground">No classes</span>
    )}
  </div>
</TableCell>
```

### 3. Assignment Modal (`app/components/modal/AssignSubjectsToClassModal.tsx`)

A reusable modal component for assigning subjects to a class:

**Features:**
- Multi-select checkboxes for subjects
- Shows subject code, name, and department
- Status badges (Active/Inactive)
- Preserves existing assignments on load
- Real-time selection updates

**Usage:**
```tsx
<AssignSubjectsToClassModal
  open={isOpen}
  setOpen={setIsOpen}
  classData={{
    id: classInfo.id,
    name: classInfo.name,
    EducationalLevel: classInfo.EducationalLevel,
    section: classInfo.section,
  }}
  availableSubjects={allSubjects}
  assignedSubjects={assignedSubjects}
  fetcher={fetcher}
/>
```

---

## How to Use in the UI

### Assigning Subjects to a Class

1. **Navigate to the class detail page:**
   - Go to `/classes`
   - Click on any class card

2. **Open the assignment modal:**
   - Click the "Manage Subjects" button in the header
   - The button shows the current count of assigned subjects

3. **Select subjects:**
   - Check/uncheck subjects from the list
   - Each subject shows its code, name, and department
   - Active/Inactive status is visible

4. **Save changes:**
   - Click "Assign Subjects"
   - The modal closes and updates are applied
   - Assigned subjects appear in the card below the header

### Viewing Subject Assignments

#### From Class View:
- **Class Detail Page**: Shows all assigned subjects as badges
- **Quick Count**: Button badge shows total assigned subjects

#### From Subject View:
- **Subject Management Page** (`/subject`):
  - New "Classes" column shows all classes using each subject
  - Each class is displayed as a badge
  - Empty state shows "No classes" for unassigned subjects

---

## Use Cases

### 1. Academic Planning
**Scenario**: A high school class needs Math, Science, and English subjects.

**Steps:**
1. Navigate to the class (e.g., "Grade 10-A")
2. Click "Manage Subjects"
3. Select: Mathematics, Physics, Chemistry, English Literature
4. Click "Assign Subjects"

**Result**: The class now shows 4 assigned subjects, and each subject's page shows "Grade 10-A" in its classes list.

### 2. Subject Reuse Across Classes
**Scenario**: "Introduction to Programming" is taught in multiple classes.

**View from Subject Page:**
- Subject: "Introduction to Programming (CS101)"
- Classes: `Grade 11-A`, `Grade 11-B`, `Grade 12-A`

Each class independently manages its subject assignments.

### 3. Curriculum Changes
**Scenario**: Remove outdated subjects and add new ones.

**Steps:**
1. Open "Manage Subjects" for a class
2. Uncheck old subjects (e.g., "Basic Computing")
3. Check new subjects (e.g., "AI Fundamentals")
4. Save changes

**Result**: Old subjects are removed, new ones are added—all in one action.

---

## Data Flow Diagram

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│    Classes      │         │   class_subjects    │         │    Subjects     │
│                 │         │   (Join Table)      │         │                 │
│  id (PK)        │◄────────│  class_id (FK)      │         │  id (PK)        │
│  name           │         │  subject_id (FK) ───┼────────►│  subjectName    │
│  EducationalLevel│         │  assigned_at        │         │  code           │
│  section        │         └─────────────────────┘         │  status         │
│  year           │                                          │  departments    │
└─────────────────┘                                          └─────────────────┘
       │                                                              │
       │                                                              │
       └──────────────► Many-to-Many Relationship ◄──────────────────┘
```

---

## Benefits

### 1. **Flexibility**
- Classes can have any number of subjects
- Subjects can be taught in multiple classes
- Easy to add/remove relationships

### 2. **Data Integrity**
- Composite primary key prevents duplicate assignments
- Cascade deletion maintains referential integrity
- Foreign key constraints ensure valid relationships

### 3. **Performance**
- Join table enables efficient queries
- Index on composite primary key speeds up lookups
- Batch operations for multiple assignments

### 4. **User Experience**
- Visual badge display for easy identification
- Real-time count updates
- Intuitive modal interface
- Clear empty states

---

## Advanced Queries

### Get all classes with their subjects (with counts):
```typescript
const classesWithCounts = await services.classSubject.getClassesWithSubjectCount();
// Returns: [{ ...classData, subjectCount: 5 }, ...]
```

### Get all subjects with their classes (with counts):
```typescript
const subjectsWithCounts = await services.classSubject.getSubjectsWithClassCount();
// Returns: [{ ...subjectData, classCount: 3 }, ...]
```

---

## Migration

The migration file has already been applied:

```bash
npx wrangler d1 execute yoyo-student-system --local \
  --file=workers/drizzle/0015_class_subjects_join_table.sql
```

For remote database:
```bash
npx wrangler d1 execute yoyo-student-system --remote \
  --file=workers/drizzle/0015_class_subjects_join_table.sql
```

---

## Related Relationships

### Teacher-Subject Relationship
Similar many-to-many pattern exists for teachers and subjects:
- A teacher can teach multiple subjects
- A subject can have multiple teachers
- Implementation: `teacher_subjects` join table
- See: `TEACHER_SUBJECT_RELATIONSHIP_GUIDE.md`

### Complete Academic Flow
```
Department ──► Class ──► Subjects ◄── Teachers
                  │
                  └────► Students
```

---

## Troubleshooting

### Issue: Subjects not showing in class detail page
**Solution**: Ensure the loader includes `classSubject.getSubjectsByClass(classId)`

### Issue: Modal not opening
**Solution**: Check that `assignSubjectsModalOpen` state is properly managed

### Issue: Assignments not saving
**Solution**: Verify the action handler includes the `assign_subjects` action case

### Issue: Duplicate assignments
**Solution**: The composite primary key prevents this at the database level—check for errors in the console

---

## Future Enhancements

Potential additions to consider:
1. **Subject scheduling**: Add time/day information to assignments
2. **Subject prerequisites**: Track subject dependencies
3. **Grade weights**: Assign different weights to subjects per class
4. **Teacher assignment from class view**: Assign teachers to class-subject combinations
5. **Bulk operations**: Assign subjects to multiple classes at once
6. **Subject analytics**: Track popular subjects across classes

---

## Summary

The many-to-many relationship between classes and subjects provides:
- ✅ Flexible curriculum management
- ✅ Easy subject assignment/removal
- ✅ Visual representation in the UI
- ✅ Data integrity through foreign keys
- ✅ Efficient queries with join table
- ✅ Scalable architecture

This implementation follows the same proven pattern as the teacher-subject relationship and integrates seamlessly with the existing student management system.

