import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
import AddSemesterModal from '~/components/modal/AddSemesterModal';
import EditSemesterModal from '~/components/modal/EditSemesterModal';
import { toast } from 'sonner';

interface Semester {
  id: number;
  name: string;
  semesterNumber: number;
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
  allSubjects?: any[];
}

export function YearCard({
  year,
  yearId,
  yearName,
  yearData,
  semesters: initialSemesters,
  fetcher,
  onEdit,
  allSubjects = [],
}: YearCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [semesters, setSemesters] = useState(initialSemesters);
  const [isAddSemesterModalOpen, setIsAddSemesterModalOpen] = useState(false);
  const [isEditSemesterModalOpen, setIsEditSemesterModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<any>(null);
  const lastMethod = useRef<string | null>(null);

  // Update semesters when initialSemesters change
  useEffect(() => {
    setSemesters(initialSemesters);
  }, [initialSemesters]);

  // Handle fetcher updates for semester operations
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      const entity = fetcher.formData.get('_entity') as string | null;
      if (entity === 'semester') {
        lastMethod.current = method ?? fetcher.formMethod;
      }
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Show toast on completion (handled by parent component now)
  // This effect is kept for local state updates if needed, but parent handles revalidation
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;
      const entity = fetcher.formData?.get('_entity') as string | null;

      // Only handle local state updates for immediate UI feedback
      // The parent component will handle revalidation
      if (entity === 'semester' && data.success) {
        // Update local state optimistically
        switch (lastMethod.current) {
          case 'POST':
            if (data.semester) {
              setSemesters((prev) => [
                ...prev,
                { ...data.semester, subjects: [] },
              ]);
            }
            break;
          case 'PUT':
            if (data.semester) {
              setSemesters((prev) =>
                prev.map((s) =>
                  s.id === data.semester.id
                    ? { ...data.semester, subjects: s.subjects || [] }
                    : s
                )
              );
            }
            break;
          case 'DELETE':
            setSemesters((prev) => prev.filter((s) => s.id !== data.id));
            break;
        }
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data, fetcher.formData]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit && yearData) {
      onEdit(yearData);
    }
  };

  const handleAddSemester = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddSemesterModalOpen(true);
  };

  const handleEditSemester = (semester: any) => {
    setSelectedSemester(semester);
    setIsEditSemesterModalOpen(true);
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
              onClick={handleAddSemester}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Semester
            </Button>
          </div>
          {semesters.length > 0 ? (
            <SemesterTabs
              semesters={semesters}
              fetcher={fetcher}
              onEdit={handleEditSemester}
              allSubjects={allSubjects}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No semesters yet. Add a semester to get started.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Semester Modals */}
      {isAddSemesterModalOpen && (
        <AddSemesterModal
          open={isAddSemesterModalOpen}
          setOpen={setIsAddSemesterModalOpen}
          fetcher={fetcher}
          yearId={yearId}
          existingSemesters={semesters}
        />
      )}

      {isEditSemesterModalOpen && selectedSemester && (
        <EditSemesterModal
          open={isEditSemesterModalOpen}
          setOpen={setIsEditSemesterModalOpen}
          fetcher={fetcher}
          semester={selectedSemester}
        />
      )}
    </Card>
  );
}
