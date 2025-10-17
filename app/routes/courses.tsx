import { Plus, Users, Clock, BookOpen } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

const courses = [
  {
    id: 1,
    name: 'Computer Science 101',
    instructor: 'Dr. Sarah Johnson',
    students: 45,
    duration: '12 weeks',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Advanced Mathematics',
    instructor: 'Prof. Michael Chen',
    students: 38,
    duration: '16 weeks',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Physics Fundamentals',
    instructor: 'Dr. Emily Brown',
    students: 42,
    duration: '14 weeks',
    status: 'Active',
  },
  {
    id: 4,
    name: 'Organic Chemistry',
    instructor: 'Prof. David Wilson',
    students: 35,
    duration: '12 weeks',
    status: 'Active',
  },
  {
    id: 5,
    name: 'Biology Advanced',
    instructor: 'Dr. Lisa Anderson',
    students: 40,
    duration: '16 weeks',
    status: 'Upcoming',
  },
  {
    id: 6,
    name: 'Data Structures',
    instructor: 'Prof. James Lee',
    students: 48,
    duration: '14 weeks',
    status: 'Active',
  },
];

export default function Courses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Manage course offerings and schedules
          </p>
        </div>
        <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.instructor}
                  </p>
                </div>
                <Badge
                  variant={course.status === 'Active' ? 'default' : 'secondary'}
                >
                  {course.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{course.students} students enrolled</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{course.duration}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
