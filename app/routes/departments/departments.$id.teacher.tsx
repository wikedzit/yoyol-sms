import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '~/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from '~/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import { useFetcher, useLoaderData, useParams } from 'react-router';
import { TeacherProfileModal } from '~/components/modal/TeacherProfileModal';
import { DeleteButton } from '~/components/DeleteButton';
import AddTeacherModal from '~/components/modal/AddTeacherModal';
import EditTeacherModal from '~/components/modal/EditTeacherModal';
import { toast } from 'sonner';

export default function DepartmentTeachers({ teachers }: { teachers: any[] }) {
  const { id } = useParams();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listFetcher = useFetcher();
  const [teacher, setTeacher] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const { teachers: initialTeachers } = useLoaderData() as { teachers: any[] };

  const filteredTeachers = initialTeachers?.filter((teacher) => {
    const matchesSearch =
      teacher.firstName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' || teacher.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Capture the method when form is submitted
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
      fetcher.load(window.location.pathname); // Refresh data

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        lastMethod.current = null;
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Teacher added successfully!');
            setTeacher((prev) => [...prev, data.teacher]);
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Teacher updated successfully!');
            setTeacher((prev) =>
              prev.map((s) => (s.id === data.teacher.id ? data.teacher : s))
            );
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.error('Teacher deleted successfully!');
            setTeacher((prev) => prev.filter((teach) => teach.id !== data.id));
            listFetcher.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
            listFetcher.load(window.location.pathname);
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // if listFetcher has fresh loader data, sync local state (keeps counts, nested info up-to-date)
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data?.teachers) {
      setTeacher(listFetcher.data.teachers);
    }
  }, [listFetcher.state, listFetcher.data]);

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between my-4">
        {/* TODO: show the selected department name just this name */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Department Teachers
        </h1>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Add Teachers
        </Button>
      </div>

      <Card className="p-6 border-none shadow-none">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subjects..."
              className="pl-10 bg-muted/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select onValueChange={(value) => setStatusFilter(value)}>
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">SN</TableHead>
                <TableHead className="font-semibold">First name</TableHead>
                <TableHead className="font-semibold">Last name</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No subjects found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers?.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.id}</TableCell>
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
                      <DeleteButton
                        id={teacher.id}
                        name={`${teacher.firstName} ${teacher.lastName}`}
                        fetcher={fetcher}
                        action={`/departments/${id}`}
                        entityName="teacher"
                        entityType="teacher"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Modal */}
      {addModalOpen && (
        <AddTeacherModal
          open={addModalOpen}
          setOpen={setAddModalOpen}
          fetcher={fetcher}
          id={id}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedTeacher && (
        <EditTeacherModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          teacher={selectedTeacher}
          fetcher={fetcher}
          id={id}
        />
      )}
    </>
  );
}
