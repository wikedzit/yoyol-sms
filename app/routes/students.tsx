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
import { Plus, Search, Filter } from 'lucide-react';

const students = [
  {
    id: 1,
    name: 'Emma Wilson',
    email: 'emma.w@email.com',
    course: 'Computer Science',
    grade: 'A',
    status: 'Active',
  },
  {
    id: 2,
    name: 'James Smith',
    email: 'james.s@email.com',
    course: 'Mathematics',
    grade: 'B+',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Sophia Brown',
    email: 'sophia.b@email.com',
    course: 'Physics',
    grade: 'A-',
    status: 'Pending',
  },
  {
    id: 4,
    name: 'Oliver Davis',
    email: 'oliver.d@email.com',
    course: 'Chemistry',
    grade: 'B',
    status: 'Active',
  },
  {
    id: 5,
    name: 'Ava Johnson',
    email: 'ava.j@email.com',
    course: 'Biology',
    grade: 'A',
    status: 'Active',
  },
  {
    id: 6,
    name: 'William Martinez',
    email: 'william.m@email.com',
    course: 'Computer Science',
    grade: 'B+',
    status: 'Active',
  },
  {
    id: 7,
    name: 'Isabella Garcia',
    email: 'isabella.g@email.com',
    course: 'Mathematics',
    grade: 'A-',
    status: 'Active',
  },
  {
    id: 8,
    name: 'Lucas Anderson',
    email: 'lucas.a@email.com',
    course: 'Physics',
    grade: 'B',
    status: 'Inactive',
  },
];

export default function Students() {
  return (
    <div className="space-y-6 h-screen overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all student records
          </p>
        </div>
        <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email}
                  </TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.grade}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.status === 'Active'
                          ? 'default'
                          : student.status === 'Pending'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
