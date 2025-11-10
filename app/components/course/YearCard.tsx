import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { SemesterTabs } from '~/components/course/SemesterTabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { DeleteButton } from '../DeleteButton';

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
  yearId: number;
  yearName: string;
  yearData?: any;
  semesters: Semester[];
  fetcher: any;
  onEdit?: (year: any) => void;
}

export function YearCard({
  year,
  yearId,
  yearName,
  yearData,
  semesters,
  fetcher,
  onEdit,
}: YearCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit && yearData) {
      onEdit(yearData);
    }
  };

  return (
    <Card className="border-none shadow-none mb-6">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-foreground">
              {yearName || `Year ${year}`}
            </h3>
            <span className="text-sm text-muted-foreground">
              ({semesters.length} Semester{semesters.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                className="cursor-pointer p-1"
                title="Edit Year"
                onClick={handleEdit}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <div onClick={(e) => e.stopPropagation()} className="inline-block">
              <DeleteButton id={String(yearId)} name={yearName} />
            </div>

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
                // Handle add semester - leave for now
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Semester
            </Button>
          </div>
          {semesters.length > 0 ? (
            <SemesterTabs semesters={semesters} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No semesters yet. Add a semester to get started.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
