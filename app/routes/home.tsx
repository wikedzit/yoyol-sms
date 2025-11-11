import { GraduationCap, Users, Building2, BookOpen, Award } from 'lucide-react';
import { DepartmentInsights } from '~/Dahsboard/DepartmentInsights';
import { NoticesEvents } from '~/Dahsboard/NoticesEvents';
import { PerformanceChart } from '~/Dahsboard/PerformanceChart';
import StatCard from '~/Dahsboard/StatCard';
import { StudentActivity } from '~/Dahsboard/StudentActivity';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Students"
          value="1,332"
          icon={GraduationCap}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Teachers"
          value="87"
          icon={Users}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard title="Departments" value="12" icon={Building2} />
        <StatCard
          title="Total Courses"
          value="156"
          icon={BookOpen}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Average GPA"
          value="3.45"
          icon={Award}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div>
          <DepartmentInsights />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentActivity />
        <NoticesEvents />
      </div>
    </div>
  );
};

export default Dashboard;
