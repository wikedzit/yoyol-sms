import {
  GraduationCap,
  Users,
  Layers,
  ClipboardList,
  Award,
} from "lucide-react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router-dom";
import { StreamInsights } from "~/Dahsboard/StreamInsights";
import { NoticesEvents } from "~/Dahsboard/NoticesEvents";
import { PerformanceChart } from "~/Dahsboard/PerformanceChart";
import StatCard from "~/Dahsboard/StatCard";
import { StudentActivity } from "~/Dahsboard/StudentActivity";
import type StudentService from "workers/services/student";
import type TeacherService from "workers/services/teachers";
import type AcademicLevelService from "workers/services/academic-levels";
import type GradeService from "workers/services/grades";
import type NoticeService from "workers/services/notices";
import { useLanguage } from "~/lib/i18n";

// Loader function to fetch dashboard data
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    student: StudentService;
    teacher: TeacherService;
    academicLevel: AcademicLevelService;
    grade: GradeService;
    notice: NoticeService;
  };

  // Fetch all data in parallel
  const [students, teachers, streams, forms, allGrades, notices] =
    await Promise.all([
      services.student.getAll({
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      services.teacher.getAllTeachers({
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      services.academicLevel.getAllStreams(),
      services.academicLevel.getAllForms(),
      services.grade.getAll({
        limit: 100,
        offset: 0,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      services.notice.getActiveNotices(10),
    ]);

  // Calculate statistics
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalStreams = streams.length;
  const totalForms = forms.length;

  // Calculate average GPA (convert score 0-100 to GPA 0-4.0 scale)
  const validGrades = allGrades.filter((g) => g.score != null && g.score >= 0);
  const averageGPA =
    validGrades.length > 0
      ? (
          validGrades.reduce((sum, g) => sum + ((g.score || 0) / 100) * 4, 0) /
          validGrades.length
        ).toFixed(2)
      : "0.00";

  // Calculate performance chart data (grade distribution by month)
  const performanceData = calculatePerformanceData(allGrades);

  // Calculate stream insights (students per stream)
  const streamInsights = await calculateStreamInsights(
    services.academicLevel,
    streams,
  );

  // Get recent student activity
  const recentStudents = students
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10);

  // Calculate student activity stats
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = students.filter(
    (s) => (s.createdAt || 0) >= oneWeekAgo,
  ).length;
  const activeStudents = students.filter((s) => s.status === "Active").length;
  const inactiveStudents = students.filter(
    (s) => s.status === "Inactive",
  ).length;

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: number | null | undefined): string => {
    if (!timestamp) return "available";
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    return "available";
  };

  // Get most recent update time for each entity
  const lastStudentUpdate =
    students.length > 0
      ? Math.max(...students.map((s) => s.createdAt || 0))
      : null;
  const lastTeacherUpdate =
    teachers.length > 0
      ? Math.max(
          ...teachers.map((t) => {
            const ts =
              typeof t.createdAt === "string"
                ? new Date(t.createdAt).getTime()
                : t.createdAt || 0;
            return ts;
          }),
        )
      : null;
  const lastStreamUpdate =
    streams.length > 0
      ? Math.max(...streams.map((s) => s.createdAt || 0))
      : null;
  const lastFormUpdate =
    forms.length > 0 ? Math.max(...forms.map((f) => f.createdAt || 0)) : null;
  const lastGradeUpdate =
    allGrades.length > 0
      ? Math.max(...allGrades.map((g) => g.createdAt || 0))
      : null;

  return {
    stats: {
      totalStudents,
      totalTeachers,
      totalStreams,
      totalForms,
      averageGPA,
    },
    statuses: {
      students: formatTimeAgo(lastStudentUpdate),
      teachers: formatTimeAgo(lastTeacherUpdate),
      streams: formatTimeAgo(lastStreamUpdate),
      forms: formatTimeAgo(lastFormUpdate),
      gpa: formatTimeAgo(lastGradeUpdate),
    },
    performanceData,
    streamInsights,
    recentStudents,
    activityStats: {
      newThisWeek,
      activeStudents,
      inactiveStudents,
    },
    notices,
  };
}

// Helper function to calculate performance data by month
function calculatePerformanceData(grades: any[]) {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const data = monthNames.map((monthName, monthIndex) => {
    const monthGrades = grades.filter((g) => {
      if (!g.createdAt) return false;
      // Handle both timestamp (number) and date string
      const timestamp =
        typeof g.createdAt === "number"
          ? g.createdAt
          : new Date(g.createdAt).getTime();
      const gradeDate = new Date(timestamp);
      return gradeDate.getMonth() === monthIndex;
    });

    const total = monthGrades.length;
    const excellent = monthGrades.filter((g) => g.grade === "A").length;
    const good = monthGrades.filter((g) => g.grade === "B").length;
    const average = monthGrades.filter((g) => g.grade === "C").length;
    const poor = monthGrades.filter((g) => ["D", "F"].includes(g.grade)).length;

    // Calculate percentages
    return {
      month: monthName,
      excellent: total > 0 ? Math.round((excellent / total) * 100) : 0,
      good: total > 0 ? Math.round((good / total) * 100) : 0,
      average: total > 0 ? Math.round((average / total) * 100) : 0,
      poor: total > 0 ? Math.round((poor / total) * 100) : 0,
    };
  });

  return data;
}

// Helper function to calculate stream insights
async function calculateStreamInsights(
  academicService: AcademicLevelService,
  streams: any[],
) {
  // Get form classes for each stream to count students
  const streamInsights = await Promise.all(
    streams.map(async (stream) => {
      const formClasses = await academicService.getFormClassesByStreamId(
        stream.id,
      );
      const studentCount = formClasses.reduce(
        (sum, cls) => sum + (cls.studentCount || 0),
        0,
      );
      return {
        name: stream.name,
        students: studentCount,
        color: stream.color as "science" | "arts" | "business",
        levelType: stream.levelType as "o-level" | "a-level",
      };
    }),
  );

  // Calculate total students across all streams
  const totalStudentsCount = streamInsights.reduce(
    (sum, s) => sum + s.students,
    0,
  );

  // Add percentage and sort
  return streamInsights
    .map((stream) => ({
      ...stream,
      percentage:
        totalStudentsCount > 0
          ? Math.round((stream.students / totalStudentsCount) * 100)
          : 0,
    }))
    .sort((a, b) => b.students - a.students);
}

const Dashboard = () => {
  const { t } = useLanguage();
  const {
    stats,
    statuses,
    performanceData,
    streamInsights,
    recentStudents,
    activityStats,
    notices,
  } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t("dashboard")}
        </h1>
        <p className="text-foreground">{t("welcomeBack")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title={t("totalStudents")}
          value={stats.totalStudents.toLocaleString()}
          icon={GraduationCap}
          status={statuses.students}
        />
        <StatCard
          title={t("totalTeachers")}
          value={stats.totalTeachers.toLocaleString()}
          icon={Users}
          status={statuses.teachers}
        />
        <StatCard
          title={t("streams")}
          value={stats.totalStreams.toLocaleString()}
          icon={Layers}
          status={statuses.streams}
        />
        <StatCard
          title={t("forms")}
          value={stats.totalForms.toLocaleString()}
          icon={ClipboardList}
          status={statuses.forms}
        />
        <StatCard
          title={t("averageGpa")}
          value={stats.averageGPA}
          icon={Award}
          status={statuses.gpa}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart data={performanceData} />
        </div>
        <div>
          <StreamInsights data={streamInsights} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentActivity
          recentStudents={recentStudents}
          activityStats={activityStats}
        />
        <NoticesEvents notices={notices} />
      </div>
    </div>
  );
};

export default Dashboard;
