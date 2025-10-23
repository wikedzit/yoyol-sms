import { useEffect, useState } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Plus, Search, Pencil } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type TeacherService from 'workers/services/teachers';
import AddTeacherModal from '~/components/modal/AddTeacherModal';
import EditTeacherModal from '~/components/modal/EditTeacherModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { TeacherProfileModal } from '~/components/modal/TeacherProfileModal';
import { toast } from 'sonner';

// 🧠 Loader – fetch teachers
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as { teacher: TeacherService };

  const teachers = await services.teacher?.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  return { teachers };
}

// ⚙️ Action – handle create, update, delete
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { teacher: TeacherService };
  const form = await request.formData();

  const method = (form.get('_method') as string) || request.method;

  try {
    // --- CREATE TEACHER ---
    if (method === 'POST') {
      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        subject: String(form.get('subject') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        qualification: form.get('qualification')
          ? String(form.get('qualification'))
          : undefined,
        gender: String(form.get('gender') ?? 'Male') as 'Male' | 'Female',
        experience: form.get('experience')
          ? Number(form.get('experience'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };

      const created = await services.teacher.createTeacher(data);
      console.log('Created teacher:', created);
      return new Response(JSON.stringify({ success: true, teacher: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- UPDATE TEACHER ---
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        subject: String(form.get('subject') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        qualification: form.get('qualification')
          ? String(form.get('qualification'))
          : undefined,
        gender: String(form.get('gender') ?? 'Male') as 'Male' | 'Female',
        experience: form.get('experience')
          ? Number(form.get('experience'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };

      const updated = await services.teacher.updateTeacherById(
        Number(id),
        data
      );
      return { success: true, teacher: updated };
    }

    // --- DELETE TEACHER ---
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await services.teacher.deleteTeacherById(Number(id));
      return { success: true };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('teachers.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 🧑‍🏫 UI – Teachers Table & Modals
export default function Teachers() {
  const { teachers: initialTeachers } = useLoaderData() as { teachers: any[] };
  const fetcher = useFetcher();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const filteredTeachers = initialTeachers?.filter((teacher) => {
    const matchesSearch =
      teacher.firstName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' || teacher.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  //use useEffect to show sonner form shardcn as a toast on successful add, edit, delete
  useEffect(() => {
    if (fetcher.data?.success) {
      const method = fetcher.formData?.get('_method');
      let message = '';

      switch (method) {
        case 'POST':
          message = 'Teacher added successfully!';
          toast.success(message);
          break;
        case 'PUT':
          message = 'Teacher updated successfully!';
          toast.success(message);
          break;
        case 'DELETE':
          message = 'Teacher deleted successfully!';
          toast.error(message);
          break;
        default:
          toast.success('Action completed successfully.');
      }
    }

    if (fetcher.data?.error) {
      toast.error(fetcher.data.error || 'An unexpected error occurred.');
    }
  }, [fetcher.data]);

  return (
    <div className="space-y-6 h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all teacher records
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search teachers..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN</TableHead>
                <TableHead>First name</TableHead>
                <TableHead>Last name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredTeachers?.map((teacher, index) => (
                <TableRow key={teacher.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{teacher.firstName}</TableCell>
                  <TableCell>{teacher.lastName}</TableCell>
                  <TableCell>{teacher.subject}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        teacher.status === 'Active' ? 'default' : 'outline'
                      }
                    >
                      {teacher.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <TeacherProfileModal teacher={teacher} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setEditModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteStudentButton
                      id={teacher.id}
                      name={`${teacher.firstName} ${teacher.lastName}`}
                      fetcher={fetcher}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {addModalOpen && (
        <AddTeacherModal
          open={addModalOpen}
          setOpen={setAddModalOpen}
          fetcher={fetcher}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedTeacher && (
        <EditTeacherModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          teacher={selectedTeacher}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
