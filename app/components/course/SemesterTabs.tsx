import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  lecturer: string;
}

interface Semester {
  id: string;
  name: string;
  subjects: Subject[];
}

interface SemesterTabsProps {
  semesters: Semester[];
}

export function SemesterTabs({ semesters }: SemesterTabsProps) {
  return (
    <Tabs defaultValue={semesters[0]?.id} className="w-full">
      <TabsList className="w-full justify-start bg-muted/50">
        {semesters.map((semester) => (
          <TabsTrigger
            key={semester.id}
            value={semester.id}
            className="data-[state=active]:bg-card data-[state=active]:text-foreground"
          >
            {semester.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {semesters.map((semester) => (
        <TabsContent key={semester.id} value={semester.id} className="mt-4">
          <subject subjects={semester.subjects} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
