# Teacher-Subject Many-to-Many Relationship Guide

## Overview

This guide explains the implementation of a many-to-many relationship between teachers and subjects in the YoYol Student System. This allows:
- **Teachers** to teach multiple subjects
- **Subjects** to be taught by multiple teachers

## Database Schema

### Join Table: `teacher_subjects`

```sql
CREATE TABLE teacher_subjects (
  teacher_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  assigned_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (teacher_id, subject_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
```

**Key Features:**
- Composite primary key ensures no duplicate assignments
- Cascade delete: when a teacher or subject is deleted, their assignments are automatically removed
- `assigned_at` timestamp tracks when the assignment was made

## File Structure

### 1. Database Layer
- **`workers/database/teacher-subjects.ts`**: Schema definition for the join table
- **`workers/drizzle/0014_teacher_subjects_join_table.sql`**: Migration file

### 2. Service Layer
- **`workers/services/teacher-subjects.ts`**: Business logic for managing teacher-subject relationships

### 3. UI Components
- **`app/components/modal/AssignSubjectsModal.tsx`**: Modal for assigning subjects to a teacher
- **`app/components/modal/AssignTeachersModal.tsx`**: Modal for assigning teachers to a subject
- **`app/components/ui/checkbox.tsx`**: Checkbox component for selections

### 4. Routes
- **`app/routes/teachers.tsx`**: Updated to show and manage subject assignments
- **`app/routes/subject.tsx`**: Updated to show and manage teacher assignments

## Service Methods

### TeacherSubjectService Methods

```typescript
// Assign a single subject to a teacher
assignSubjectToTeacher(teacherId: number, subjectId: number): Promise<boolean>

// Remove a subject assignment from a teacher
removeSubjectFromTeacher(teacherId: number, subjectId: number): Promise<boolean>

// Get all subjects assigned to a teacher
getSubjectsByTeacher(teacherId: number): Promise<SelectSubject[]>

// Get all teachers assigned to a subject
getTeachersBySubject(subjectId: number): Promise<SelectTeacher[]>

// Assign multiple subjects to a teacher at once
assignMultipleSubjects(teacherId: number, subjectIds: number[]): Promise<boolean>

// Replace all subject assignments for a teacher
replaceTeacherSubjects(teacherId: number, subjectIds: number[]): Promise<boolean>

// Get teachers with subject counts
getTeachersWithSubjectCount(): Promise<Array<SelectTeacher & { subjectCount: number }>>

// Get subjects with teacher counts
getSubjectsWithTeacherCount(): Promise<Array<SelectSubject & { teacherCount: number }>>
```

## UI Features

### Teachers Page (`/teachers`)

**New Features:**
1. **Assigned Subjects Column**: Shows badges with subject codes for each teacher
2. **Assign Subjects Button** (📚 icon): Opens modal to manage subject assignments
3. **Real-time Updates**: When assignments change, the UI updates immediately

**How to Use:**
1. Navigate to the Teachers page
2. Click the book icon (📚) next to any teacher
3. Select/deselect subjects using checkboxes
4. Click "Assign Subjects" to save
5. The teacher's row will update to show the new subjects

### Subjects Page (`/subjects`)

**New Features:**
1. **Assigned Teachers Column**: Shows badges with teacher names for each subject
2. **Assign Teachers Button** (👤 icon): Opens modal to manage teacher assignments
3. **Real-time Updates**: When assignments change, the UI updates immediately

**How to Use:**
1. Navigate to the Subjects page
2. Click the user icon (👤) next to any subject
3. Select/deselect teachers using checkboxes
4. Click "Assign Teachers" to save
5. The subject's row will update to show the new teachers

## API Endpoints

### Assign Subjects to Teacher
```typescript
// POST /teachers
FormData: {
  _method: 'POST',
  action: 'assign_subjects',
  teacherId: number,
  subjectIds: JSON.stringify(number[])
}
```

### Assign Teachers to Subject
```typescript
// POST /subjects
FormData: {
  _method: 'POST',
  action: 'assign_teachers',
  subjectId: number,
  teacherIds: JSON.stringify(number[])
}
```

## Example Usage

### Example 1: Assign Multiple Subjects to a Teacher

```typescript
// In your component
const handleAssignSubjects = () => {
  const formData = new FormData();
  formData.append('_method', 'POST');
  formData.append('action', 'assign_subjects');
  formData.append('teacherId', '5');
  formData.append('subjectIds', JSON.stringify([1, 2, 3])); // Math, Physics, Chemistry

  fetcher.submit(formData, { method: 'post' });
};
```

### Example 2: Get All Subjects for a Teacher

```typescript
// In your loader
const teacherId = 5;
const subjects = await services.teacherSubject.getSubjectsByTeacher(teacherId);
console.log(subjects); // Array of subject objects
```

### Example 3: Get All Teachers for a Subject

```typescript
// In your loader
const subjectId = 10;
const teachers = await services.teacherSubject.getTeachersBySubject(subjectId);
console.log(teachers); // Array of teacher objects
```

## Benefits of This Implementation

### 1. **Flexibility**
- Teachers can teach multiple subjects
- Subjects can have multiple instructors
- Easy to handle substitutes or team teaching

### 2. **Data Integrity**
- Composite primary key prevents duplicate assignments
- Cascade deletes maintain referential integrity
- Foreign key constraints ensure valid relationships

### 3. **Scalability**
- Efficient queries using SQL joins
- Supports large numbers of teachers and subjects
- Minimal database overhead

### 4. **User Experience**
- Intuitive UI with checkboxes
- Real-time updates after changes
- Clear visual feedback with badges
- Toast notifications for success/error states

### 5. **Maintainability**
- Clean separation of concerns (database → service → UI)
- Reusable modal components
- Type-safe with TypeScript
- Consistent with existing codebase patterns

## Use Cases

### Academic Scenarios

1. **Multi-Subject Teachers**
   - A math teacher who also teaches physics
   - A language teacher covering multiple languages

2. **Team Teaching**
   - Two teachers collaborating on a single subject
   - Main instructor with teaching assistants

3. **Substitute Teachers**
   - Easily reassign subjects when teachers are unavailable
   - Track which teachers can cover which subjects

4. **Department Flexibility**
   - Teachers teaching across departments
   - Interdisciplinary courses with multiple instructors

### Administrative Benefits

1. **Scheduling**
   - See which teachers are available for which subjects
   - Identify overloaded or underutilized teachers

2. **Reporting**
   - Generate reports on teacher workload
   - Analyze subject coverage across the institution

3. **Resource Planning**
   - Identify subjects that need more teachers
   - Balance teaching loads across departments

## Migration & Deployment

### Running the Migration

**Local Development:**
```bash
npx wrangler d1 execute DB --local --file=./workers/drizzle/0014_teacher_subjects_join_table.sql
```

**Production:**
```bash
npx wrangler d1 execute DB --remote --file=./workers/drizzle/0014_teacher_subjects_join_table.sql
```

### Verification

After migration, verify the table was created:
```bash
npx wrangler d1 execute DB --local --command="SELECT * FROM teacher_subjects;"
```

## Troubleshooting

### Issue: "Table already exists"
**Solution:** The migration has already run. Check existing data:
```bash
npx wrangler d1 execute DB --local --command="SELECT COUNT(*) FROM teacher_subjects;"
```

### Issue: "Foreign key constraint failed"
**Solution:** Ensure the teacher and subject IDs exist before creating assignments.

### Issue: Subjects not showing after assignment
**Solution:** 
1. Check browser console for errors
2. Verify the fetcher is in idle state
3. Ensure the loader is fetching subjects for each teacher
4. Check that the action is returning success: true

### Issue: Modal not opening
**Solution:**
1. Verify state management (isModalOpen)
2. Check that allSubjects/allTeachers are loaded
3. Ensure the modal component is imported correctly

## Future Enhancements

### Potential Additions

1. **Assignment Dates**
   - Track start and end dates for assignments
   - Handle semester-based assignments

2. **Primary Instructor**
   - Designate one teacher as the primary instructor
   - Others as assistants or co-instructors

3. **Assignment Notes**
   - Add notes or reasons for assignments
   - Track assignment history

4. **Workload Tracking**
   - Calculate teaching hours per teacher
   - Balance workloads automatically

5. **Bulk Operations**
   - Assign all subjects from a department to a teacher
   - Copy assignments from one teacher to another

## Best Practices

1. **Always validate data** before creating assignments
2. **Use transactions** for bulk operations
3. **Provide clear feedback** to users via toasts
4. **Handle errors gracefully** with try-catch blocks
5. **Keep the UI responsive** with loading states
6. **Document changes** to the database schema
7. **Test thoroughly** before deploying to production

## Support

For questions or issues with this implementation:
1. Check this guide first
2. Review the code comments in the service files
3. Test in local development before production
4. Contact the development team for assistance

---

**Implementation Date:** November 6, 2025  
**Author:** Development Team  
**Version:** 1.0

