import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import AssignSubjectsToSemesterModal from '~/components/modal/AssignSubjectsToSemesterModal';
import { DeleteButton } from '../DeleteButton';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  lecturer: string;
}

interface Semester {
  id: number;
  name: string;
  semesterNumber: number;
  subjects: Subject[];
}

interface SemesterTabsProps {
  semesters: Semester[];
  fetcher: any;
  onEdit?: (semester: Semester) => void;
  allSubjects?: any[];
}

export function SemesterTabs({
  semesters,
  fetcher,
  onEdit,
  allSubjects = [],
}: SemesterTabsProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(
    null
  );

  const handleAssignSubjects = (semester: Semester) => {
    setSelectedSemester(semester);
    setIsAssignModalOpen(true);
  };

  const handleEditSemester = (semester: Semester, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(semester);
    }
  };

  // Reset selected semester when modal closes
  useEffect(() => {
    if (!isAssignModalOpen && selectedSemester) {
      setSelectedSemester(null);
    }
  }, [isAssignModalOpen, selectedSemester]);

  if (semesters.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No semesters available.
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue={String(semesters[0]?.id)} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50">
          {semesters.map((semester) => (
            <TabsTrigger
              key={semester.id}
              value={String(semester.id)}
              className="data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              {semester.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {semesters.map((semester) => (
          <TabsContent
            key={semester.id}
            value={String(semester.id)}
            className="mt-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">
                  Subjects ({semester.subjects.length})
                </h4>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      className="cursor-pointer p-1"
                      title="Edit Semester"
                      onClick={(e) => handleEditSemester(semester, e)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block"
                  >
                    <DeleteButton
                      id={String(semester.id)}
                      name={semester.name}
                      fetcher={fetcher}
                      entityType="semester"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignSubjects(semester)}
                    className="bg-primary-gradient text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Subjects
                  </Button>
                </div>
              </div>

              {semester.subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {semester.subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h5 className="font-semibold text-foreground">
                        {subject.name}
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        Code: {subject.code}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lecturer: {subject.lecturer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No subjects assigned yet. Click "Assign Subjects" to add
                  subjects to this semester.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {isAssignModalOpen && selectedSemester && (
        <AssignSubjectsToSemesterModal
          open={isAssignModalOpen}
          setOpen={setIsAssignModalOpen}
          semesterData={selectedSemester}
          availableSubjects={allSubjects}
          assignedSubjects={selectedSemester.subjects}
          fetcher={fetcher}
        />
      )}
    </>
  );
}
