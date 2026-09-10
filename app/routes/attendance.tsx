import { Calendar, Download } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useLanguage } from '~/lib/i18n';

const attendance = [
  {
    id: 1,
    student: 'Emma Wilson',
    course: 'Computer Science 101',
    present: 28,
    absent: 2,
    rate: 93.3,
  },
  {
    id: 2,
    student: 'James Smith',
    course: 'Advanced Mathematics',
    present: 26,
    absent: 4,
    rate: 86.7,
  },
  {
    id: 3,
    student: 'Sophia Brown',
    course: 'Physics Fundamentals',
    present: 29,
    absent: 1,
    rate: 96.7,
  },
  {
    id: 4,
    student: 'Oliver Davis',
    course: 'Organic Chemistry',
    present: 25,
    absent: 5,
    rate: 83.3,
  },
  {
    id: 5,
    student: 'Ava Johnson',
    course: 'Biology Advanced',
    present: 30,
    absent: 0,
    rate: 100,
  },
  {
    id: 6,
    student: 'William Martinez',
    course: 'Data Structures',
    present: 27,
    absent: 3,
    rate: 90.0,
  },
];

export default function Attendance() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('attendance')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('trackAttendance')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className=" hover:scale-110 hover:text-white-600 transition cursor-pointer">
            <Calendar className="h-4 w-4 mr-2" />
            {t('selectDate')}
          </Button>
          <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('attendanceRecords')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('student')}</TableHead>
                <TableHead>{t('course')}</TableHead>
                <TableHead className="text-center">{t('present')}</TableHead>
                <TableHead className="text-center">{t('absent')}</TableHead>
                <TableHead className="text-center">{t('rate')}</TableHead>
                <TableHead className="text-center">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.student}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.course}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.present}
                  </TableCell>
                  <TableCell className="text-center">{record.absent}</TableCell>
                  <TableCell className="text-center font-semibold">
                    {record.rate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        record.rate >= 90
                          ? 'default'
                          : record.rate >= 75
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {record.rate >= 90
                        ? t('excellent')
                        : record.rate >= 75
                        ? t('good')
                        : t('poor')}
                    </Badge>
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
