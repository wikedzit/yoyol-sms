import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import {
  useParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';

import type TeacherService from 'workers/services/teachers';
import type SubjectService from 'workers/services/subjects';
import { useLoaderData } from 'react-router-dom';
import DepartmentTeachers from './departments.$id.teacher';
import DepartmentSubjects from './departments.$id.subject';
import type ClassService from 'workers/services/class';
import DepartmentClassrooms from './departments.$id.classroom';

// --- Action handler for all CRUD operations ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const { id } = params; // departmentId
  const services = context.services as {
    teacher: TeacherService;
    subject: SubjectService;
    class: ClassService;
  };

  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const entity = form.get('_entity') as string; // 'teacher', 'subject', or 'class'

  try {
    // ==================== TEACHER OPERATIONS ====================
    if (entity === 'teacher') {
      if (method === 'POST') {
        const departmentId = id ? Number(id) : undefined;
        const rawExperience = form.get('experience');
        let parsedExperience: number | undefined = undefined;
        if (rawExperience != null) {
          const num = Number(String(rawExperience));
          parsedExperience = Number.isFinite(num) ? num : undefined;
        }

        const teacherData = {
          firstName: String(form.get('firstName') || ''),
          lastName: String(form.get('lastName') || ''),
          gender: String(form.get('gender') || 'Other'),
          subject: String(form.get('subject') || ''),
          email: form.get('email') ? String(form.get('email')) : undefined,
          phone: form.get('phone') ? String(form.get('phone')) : undefined,
          address: form.get('address')
            ? String(form.get('address'))
            : undefined,
          qualification: form.get('qualification')
            ? String(form.get('qualification'))
            : undefined,
          experience: parsedExperience,
          status:
            (String(form.get('status')) as 'Active' | 'Inactive') || 'Active',
          departmentId,
        };

        const created = await services.teacher.createTeacher(teacherData);
        return new Response(
          JSON.stringify({ success: true, teacher: created }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (method === 'PUT') {
        const idStr = form.get('id') as string;
        const updateData = Object.fromEntries(form.entries());
        const updated = await services.teacher.updateTeacherById(
          Number(idStr),
          {
            ...updateData,
            departmentId: Number(id),
          }
        );
        return new Response(
          JSON.stringify({ success: true, teacher: updated }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (method === 'DELETE') {
        const idStr = form.get('id') as string;
        const idNum = idStr ? Number(idStr) : NaN;
        if (!Number.isFinite(idNum)) {
          return new Response(JSON.stringify({ error: 'Invalid id' }), {
            status: 400,
          });
        }
        await services.teacher.deleteTeacherById(idNum);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (method === 'REMOVE') {
        const idStr = form.get('id') as string;
        await services.teacher.updateTeacherById(Number(idStr), {
          departmentId: undefined,
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ==================== SUBJECT OPERATIONS ====================
    if (entity === 'subject') {
      if (method === 'POST') {
        const departmentId = id ? Number(id) : undefined;
        const code = String(form.get('code') || '');

        // Check if subject code already exists
        const existingSubject = await services.subject.getSubjectByCode(code);
        if (existingSubject) {
          return new Response(
            JSON.stringify({
              error:
                'A subject with this code already exists. Please use a different code.',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        const subjectData = {
          subjectName: String(form.get('subjectName') || ''),
          code,
          departments: String(form.get('departments') || ''),
          instructor: String(form.get('instructor') || ''),
          description: form.get('description')
            ? String(form.get('description'))
            : undefined,
          enrolledStudents: form.get('enrolledStudents')
            ? Number(form.get('enrolledStudents'))
            : 0,
          status:
            (String(form.get('status')) as 'Active' | 'Inactive') || 'Active',
          departmentId,
        };

        const created = await services.subject.createSubject(subjectData);
        if (!created) {
          return new Response(
            JSON.stringify({
              error:
                'Failed to create subject. Please check all required fields.',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return new Response(
          JSON.stringify({ success: true, subject: created }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (method === 'PUT') {
        const idStr = form.get('id') as string;
        if (!idStr) {
          return new Response(JSON.stringify({ error: 'Missing subject id' }), {
            status: 400,
          });
        }

        const updateData = Object.fromEntries(form.entries());
        const idNum = Number(idStr);

        if (isNaN(idNum)) {
          return new Response(JSON.stringify({ error: 'Invalid subject id' }), {
            status: 400,
          });
        }

        // Check if code has changed and if the new code already exists
        const newCode = String(updateData.code || '');
        const currentSubject = await services.subject.getSubjectById(idNum);

        if (currentSubject && newCode !== currentSubject.code) {
          const existingSubject = await services.subject.getSubjectByCode(
            newCode
          );
          if (existingSubject) {
            return new Response(
              JSON.stringify({
                error:
                  'A subject with this code already exists. Please use a different code.',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        }

        const cleanData = {
          ...updateData,
          id: idNum,
          departmentId: Number(id),
          enrolledStudents: updateData.enrolledStudents
            ? Number(updateData.enrolledStudents)
            : undefined,
        };

        const updated = await services.subject.updateSubject(idNum, cleanData);
        return new Response(
          JSON.stringify({ success: true, subject: updated }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (method === 'DELETE') {
        const idStr = form.get('id') as string;
        const idNum = idStr ? Number(idStr) : NaN;
        if (!Number.isFinite(idNum)) {
          return new Response(JSON.stringify({ error: 'Invalid id' }), {
            status: 400,
          });
        }
        await services.subject.deleteSubject(idNum);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ==================== CLASS OPERATIONS ====================
    if (entity === 'class') {
      if (method === 'POST') {
        const departmentId = id ? Number(id) : undefined;

        const classroomData = {
          name: String(form.get('name') || ''),
          EducationalLevel: String(form.get('EducationalLevel') || ''),
          section: form.get('section')
            ? String(form.get('section'))
            : undefined,
          year: Number(form.get('year')) || new Date().getFullYear(),
          departmentId,
        };

        const created = await services.class.create(classroomData);
        return new Response(
          JSON.stringify({ success: true, classroom: created }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'PUT') {
        const idStr = form.get('id') as string;
        if (!idStr) {
          return new Response(JSON.stringify({ error: 'Missing class id' }), {
            status: 400,
          });
        }

        const idNum = Number(idStr);
        if (isNaN(idNum)) {
          return new Response(JSON.stringify({ error: 'Invalid class id' }), {
            status: 400,
          });
        }

        const classroomData = {
          name: String(form.get('name') || ''),
          EducationalLevel: String(form.get('EducationalLevel') || ''),
          section: form.get('section')
            ? String(form.get('section'))
            : undefined,
          year: Number(form.get('year')) || new Date().getFullYear(),
          departmentId: Number(id),
        };

        const updated = await services.class.update(idNum, classroomData);
        return new Response(
          JSON.stringify({ success: true, classroom: updated }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE') {
        const idStr = form.get('id') as string;
        const idNum = idStr ? Number(idStr) : NaN;
        if (!Number.isFinite(idNum)) {
          return new Response(
            JSON.stringify({ error: 'Invalid classroom id' }),
            {
              status: 400,
            }
          );
        }

        await services.class.delete(idNum);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown method or entity' }), {
      status: 400,
    });
  } catch (err: any) {
    console.error('DepartmentDetails.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500 }
    );
  }
}

export async function loader({ context, params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Department ID required', { status: 400 });

  const services = context.services as {
    teacher: TeacherService;
    subject: SubjectService;
    class: ClassService;
    department: any;
  };

  // teachers service
  const teachers = await services.teacher?.getTeachersByDepartmentId(
    Number(id)
  );
  // subjects service
  const subjects = await services.subject?.getSubjectsByDepartmentId(
    Number(id)
  );
  // classrooms service
  const classrooms = await services.class?.getClassesByDepartmentId(Number(id));
  // Get all departments for dropdowns
  const departments = await services.department?.getDepartments({
    limit: 100,
    offset: 0,
  });

  return { subjects, teachers, classrooms, departments };
}

export default function DepartmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { teachers, subjects, classrooms, departments } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="classrooms" className="w-full">
        <TabsList className="flex gap-4">
          <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="classrooms">
          <DepartmentClassrooms classrooms={classrooms} />
        </TabsContent>

        <TabsContent value="subjects">
          <DepartmentSubjects subjects={subjects} departments={departments} />
        </TabsContent>

        <TabsContent value="teachers">
          <DepartmentTeachers teachers={teachers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
