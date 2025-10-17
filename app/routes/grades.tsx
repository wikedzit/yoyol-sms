import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
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
import { Download, Filter } from 'lucide-react';

const grades = [
  {
    id: 1,
    student: 'Emma Wilson',
    course: 'Computer Science 101',
    midterm: 92,
    final: 88,
    overall: 'A',
    gpa: 4.0,
  },
  {
    id: 2,
    student: 'James Smith',
    course: 'Advanced Mathematics',
    midterm: 85,
    final: 87,
    overall: 'B+',
    gpa: 3.3,
  },
  {
    id: 3,
    student: 'Sophia Brown',
    course: 'Physics Fundamentals',
    midterm: 90,
    final: 89,
    overall: 'A-',
    gpa: 3.7,
  },
  {
    id: 4,
    student: 'Oliver Davis',
    course: 'Organic Chemistry',
    midterm: 82,
    final: 84,
    overall: 'B',
    gpa: 3.0,
  },
  {
    id: 5,
    student: 'Ava Johnson',
    course: 'Biology Advanced',
    midterm: 95,
    final: 93,
    overall: 'A',
    gpa: 4.0,
  },
  {
    id: 6,
    student: 'William Martinez',
    course: 'Data Structures',
    midterm: 88,
    final: 86,
    overall: 'B+',
    gpa: 3.3,
  },
];

export default function Grades() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grades</h1>
          <p className="text-muted-foreground mt-1">
            View and manage student grades
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-center">Midterm</TableHead>
                <TableHead className="text-center">Final</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center">GPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.student}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {grade.course}
                  </TableCell>
                  <TableCell className="text-center">
                    {grade.midterm}%
                  </TableCell>
                  <TableCell className="text-center">{grade.final}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{grade.overall}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {grade.gpa.toFixed(1)}
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
