import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
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
import { useFetcher, useLoaderData, useParams } from 'react-router';
import { Badge } from '~/components/ui/badge';
import { DeleteButton } from '~/components/DeleteButton';
import { useState } from 'react';
import AddSubjectModal from '~/components/modal/AddSubjectModal';
import EditSubjectModal from '~/components/modal/EditSubjectModal';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { usePagination } from '~/hooks/usePagination';

export default function DepartmentSubjects({
  subjects,
  departments,
}: {
  subjects: any[];
  departments: any[];
}) {
  const loaderData = useLoaderData() as { subjects: any[]; departments: any[] };
  const { subjects: initialSubjects, departments: loaderDepartments } =
    loaderData;
  const fetcher = useFetcher();
  const { id } = useParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Use departments from props first, fallback to loader data
  const departmentsList = departments || loaderDepartments;

  // Debug log
  console.log('DepartmentSubjects - departments:', {
    fromProps: departments?.length,
    fromLoader: loaderDepartments?.length,
    final: departmentsList?.length,
    id,
  });

  // --- Filtering Logic ---
  const filteredSubjects = initialSubjects?.filter((subject) => {
    const matchesSearch =
      subject.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      subject.code.toLowerCase().includes(search.toLowerCase()) ||
      subject.departments.toLowerCase().includes(search.toLowerCase()) ||
      subject.instructor.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' || subject.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  // --- Pagination Logic ---
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudentsList,
    startIndex,
    goToPage,
  } = usePagination(filteredSubjects, 10);
  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between my-4">
        {/* TODO: show the selected department name just this name */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Department Subjects
        </h1>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          onClick={handleOpenAddModal}
        >
          <Plus className="h-4 w-4" /> Add Subject
        </Button>
      </div>

      <Card className="p-6 border-none shadow-none">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Subject Name</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Instructor</TableHead>
                <TableHead className="font-semibold">
                  Enrolled Students
                </TableHead>
                {/* <TableHead className="font-semibold">Description</TableHead> */}
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudentsList?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No subjects found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudentsList?.map((subject, index) => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.code}</TableCell>
                    <TableCell>{subject.subjectName}</TableCell>
                    <TableCell>{subject.departments}</TableCell>
                    <TableCell>{subject.instructor}</TableCell>
                    <TableCell>{subject.enrolledStudents || 0}</TableCell>
                    {/* <TableCell>{subject.description || '—'}</TableCell> */}
                    <TableCell>
                      <Badge
                        variant={
                          subject.status === 'Active' ? 'default' : 'outline'
                        }
                      >
                        {subject.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSubject(subject);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteButton
                        id={subject.id}
                        name={subject.subjectName}
                        fetcher={fetcher}
                        action={`/departments/${id}`}
                        entityName="Subject"
                        entityType="subject"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      {isAddModalOpen && (
        <AddSubjectModal
          open={isAddModalOpen}
          setOpen={setIsAddModalOpen}
          fetcher={fetcher}
          id={id}
          departments={departmentsList}
        />
      )}

      {isEditModalOpen && selectedSubject && (
        <EditSubjectModal
          open={isEditModalOpen}
          setOpen={setIsEditModalOpen}
          fetcher={fetcher}
          subject={selectedSubject}
          id={id}
        />
      )}
    </>
  );
}
