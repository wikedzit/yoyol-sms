import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { SemesterTabs } from '~/components/course/SemesterTabs';
interface Semester {
  id: string;
  name: string;
  subjects: Subject[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  lecturer: string;
}

interface YearCardProps {
  year: number;
  semesters: Semester[];
}

export function YearCard({ year, semesters }: YearCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-none shadow-none mb-6">
      <div
        className=" p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-foreground">
              Year {year}
            </h3>
            <span className="text-sm text-muted-foreground">
              ({semesters.length} Semester{semesters.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border">
          <div className="my-3 flex justify-end">
            <Button
              variant="outline"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle add semester
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Semester
            </Button>
          </div>
          <SemesterTabs semesters={semesters} />
        </div>
      )}
    </Card>
  );
}
