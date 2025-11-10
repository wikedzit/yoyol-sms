import { Button } from '~/components/ui/button';
import { Plus } from 'lucide-react';
import { CourseHeader } from '~/components/course/CourseHeader';
import { YearCard } from '~/components/course/YearCard';

// Mock data
const mockCourseData = {
  name: 'Bachelor of Computer Science',
  code: 'CS-101',
  duration: '4 Years',
  department: 'Computer Science',
  status: 'Active' as const,
  years: [
    {
      year: 1,
      semesters: [
        {
          id: 'sem1-1',
          name: 'Semester 1',
          subjects: [
            {
              id: '1',
              name: 'Introduction to Programming',
              code: 'CS1001',
              credits: 4,
              lecturer: 'Dr. Sarah Johnson',
            },
            {
              id: '2',
              name: 'Discrete Mathematics',
              code: 'MATH1001',
              credits: 3,
              lecturer: 'Prof. Michael Chen',
            },
            {
              id: '3',
              name: 'Computer Organization',
              code: 'CS1002',
              credits: 4,
              lecturer: 'Dr. Emily Rodriguez',
            },
          ],
        },
        {
          id: 'sem1-2',
          name: 'Semester 2',
          subjects: [
            {
              id: '4',
              name: 'Data Structures',
              code: 'CS1003',
              credits: 4,
              lecturer: 'Dr. James Wilson',
            },
            {
              id: '5',
              name: 'Linear Algebra',
              code: 'MATH1002',
              credits: 3,
              lecturer: 'Prof. Michael Chen',
            },
          ],
        },
      ],
    },
    {
      year: 2,
      semesters: [
        {
          id: 'sem2-1',
          name: 'Semester 1',
          subjects: [
            {
              id: '6',
              name: 'Algorithms',
              code: 'CS2001',
              credits: 4,
              lecturer: 'Dr. Sarah Johnson',
            },
            {
              id: '7',
              name: 'Database Systems',
              code: 'CS2002',
              credits: 4,
              lecturer: 'Dr. Robert Lee',
            },
          ],
        },
        {
          id: 'sem2-2',
          name: 'Semester 2',
          subjects: [
            {
              id: '8',
              name: 'Software Engineering',
              code: 'CS2003',
              credits: 4,
              lecturer: 'Dr. Emily Rodriguez',
            },
          ],
        },
      ],
    },
  ],
};

export default function CoursePageDetails() {
  return (
    <div>
      {/* <Breadcrumbs
      {/* <Breadcrumbs
        items={[
          { label: 'Courses', href: '/' },
          { label: mockCourseData.name },
        ]}
      /> */}

      <CourseHeader
        name={mockCourseData.name}
        code={mockCourseData.code}
        duration={mockCourseData.duration}
        department={mockCourseData.department}
        status={mockCourseData.status}
      />

      {/* search filter */}
      {/* <SearchFilter /> */}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Course Structure
        </h2>
        <Button
          variant="default"
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Year
        </Button>
      </div>

      <div className="space-y-4">
        {mockCourseData.years.map((yearData) => (
          <YearCard
            key={yearData.year}
            year={yearData.year}
            semesters={yearData.semesters}
          />
        ))}
      </div>
    </div>
  );
}
