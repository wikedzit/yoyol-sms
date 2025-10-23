// app/routes/admin+/departments.tsx
import { useEffect, useRef, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useFetcher, useLoaderData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  GraduationCap,
} from 'lucide-react';
import type DepartmentService from 'workers/services/departments';
import EditDepartmentModal from '~/components/modal/EditDepartmentModal';
import AddDepartmentModal from '~/components/modal/AddDeparmentModal';
import { toast } from 'sonner';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { Select } from '@radix-ui/react-select';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

// --- Loader: fetch departments ---
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as { department: DepartmentService };
  const departments = await services.department.getDepartments({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  return { departments };
}

// --- Action: handle create, update, delete ---
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { department: DepartmentService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // CREATE
    if (method === 'POST') {
      const data = {
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? ''),
        headOfDepartment: String(form.get('headOfDepartment') ?? ''),
        totalStudent: Number(form.get('totalStudent') ?? 0),
        totalFaculty: Number(form.get('totalFaculty') ?? 0),
        establishedDate: String(form.get('establishedDate') ?? ''),
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };
      const created = await services.department.createDepartment(data);
      console.log('Created department:', created);
      return { success: true, department: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'Department ID is required' };
      const data = {
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? ''),
        headOfDepartment: String(form.get('headOfDepartment') ?? ''),
        totalStudent: Number(form.get('totalStudent') ?? 0),
        totalFaculty: Number(form.get('totalFaculty') ?? 0),
        establishedDate: String(form.get('establishedDate') ?? ''),
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };
      const updated = await services.department.updateDepartment(
        String(id),
        data
      );
      return { success: true, department: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'Department ID is required' };
      await services.department.deleteDepartment(String(id));
      return { success: true, id }; // return deleted id
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('departments action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// --- Department Page Component ---
export default function DepartmentsPage() {
  const { departments: initialDepartments } = useLoaderData<{
    departments: any[];
  }>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);

  const [departments, setDepartments] = useState(initialDepartments);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] =
    useState(false);
  const [isEditDepartmentModalOpen, setIsEditDepartmentModalOpen] =
    useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    headOfDepartment: '',
    totalStudent: 0,
    totalFaculty: 0,
    establishedDate: '',
    description: '',
    status: 'Active',
  });

  // Update local state after successful fetcher submission
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  //Show toast on completion
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Department added successfully!');
            setDepartments((prev) => [...prev, data.department]);
            break;
          case 'PUT':
            toast.success('Department updated successfully!');
            setDepartments((prev) =>
              prev.map((d) =>
                d.id === data.department.id ? data.department : d
              )
            );
            break;
          case 'DELETE':
            toast.success('Department deleted successfully!');
            // ✅ Remove deleted department immediately
            setDepartments((prev) => prev.filter((d) => d.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.headOfDepartment || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ? true : d.status.toLowerCase() === filter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const handleOpenAddDialog = () => {
    setIsAddDepartmentModalOpen(true);
    console.log('Add Department Modal Opened');
  };

  const handleEditModalOpen = (department: any) => {
    setSelectedDepartment(department);
    setIsEditDepartmentModalOpen(true);
    console.log('Edit Department Modal Opened for:', department);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Department Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and organize academic departments
            </p>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Departments
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {departments.length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {departments.reduce(
                    (sum, dept) => sum + (dept.totalStudent || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Faculty
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {departments.reduce(
                    (sum, dept) => sum + (dept.totalFaculty || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Table */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
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

          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Faculty</TableHead>
                  <TableHead>Established</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <p className="text-muted-foreground">
                        No departments found.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell>{department.code}</TableCell>
                      <TableCell>{department.name}</TableCell>
                      <TableCell>{department.headOfDepartment}</TableCell>
                      <TableCell className="text-center">
                        {department.totalStudent}
                      </TableCell>
                      <TableCell className="text-center">
                        {department.totalFaculty}
                      </TableCell>
                      <TableCell>{department.establishedDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            department.status === 'Active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {department.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditModalOpen(department)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteStudentButton
                          id={department.id}
                          name={department.name}
                          fetcher={fetcher}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Add/Edit Department Dialogs would go here */}
      {isAddDepartmentModalOpen && (
        <AddDepartmentModal
          open={isAddDepartmentModalOpen}
          setOpen={setIsAddDepartmentModalOpen}
          fetcher={fetcher}
        />
      )}

      {isEditDepartmentModalOpen && selectedDepartment && (
        <EditDepartmentModal
          open={isEditDepartmentModalOpen}
          setOpen={setIsEditDepartmentModalOpen}
          fetcher={fetcher}
          department={selectedDepartment}
        />
      )}
    </div>
  );
}
