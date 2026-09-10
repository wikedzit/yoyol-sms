import { useState, useEffect } from "react";
import {
  useLoaderData,
  useFetcher,
  useSearchParams,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Plus, Download, Edit } from "lucide-react";
import { toast } from "sonner";
import { GradeBadge } from "~/components/grade/GradeBadge";
import { GradeForm } from "~/components/grade/GradeFormModal";
import type GradeService from "workers/services/grades";
import type { GradeWithRelations } from "workers/services/grades";
import type SubjectService from "workers/services/subjects";
import type StudentService from "workers/services/student";
import type TeacherService from "workers/services/teachers";
import { useLanguage } from "~/lib/i18n";
import type AcademicLevelService from "workers/services/academic-levels";
import { DeleteButton } from "~/components/DeleteButton";

// Validation Schemas
const GradeCreateSchema = z.object({
  studentId: z.coerce.number().int().positive("Student is required"),
  subjectId: z.coerce.number().int().positive("Subject is required"),
  streamId: z.coerce.number().int().positive("Stream is required"),
  formId: z.coerce.number().int().positive("Form is required"),
  teacherId: z.coerce.number().int().positive().optional(),
  score: z.coerce.number().min(0).max(100, "Score must be between 0 and 100"),
  remarks: z.string().optional(),
});

const GradeUpdateSchema = GradeCreateSchema.partial().extend({
  id: z.string().min(1, "Grade ID is required"),
});

// Loader: fetch grades and all related options
export async function loader({ context, request }: LoaderFunctionArgs) {
  const services = context.services as {
    grade: GradeService;
    subject: SubjectService;
    student: StudentService;
    teacher: TeacherService;
    academicLevel: AcademicLevelService;
  };

  const url = new URL(request.url);
  const streamId = url.searchParams.get("streamId");
  const formId = url.searchParams.get("formId");
  const subjectId = url.searchParams.get("subjectId");
  const studentId = url.searchParams.get("studentId");
  const teacherId = url.searchParams.get("teacherId");

  const grades = await services.grade.getAll({
    limit: 100,
    offset: 0,
    sortBy: "createdAt",
    sortOrder: "desc",
    streamId: streamId ? parseInt(streamId, 10) : undefined,
    formId: formId ? parseInt(formId, 10) : undefined,
    subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
    studentId: studentId ? parseInt(studentId, 10) : undefined,
    teacherId: teacherId ? parseInt(teacherId, 10) : undefined,
  });

  const [streams, forms, subjects, students, teachers] = await Promise.all([
    services.academicLevel.getAllStreams(),
    services.academicLevel.getAllForms(),
    services.subject.getAllSubjects({
      limit: 100,
      sortBy: "subjectName",
      sortOrder: "asc",
    }),
    services.student.getAll({
      limit: 100,
      offset: 0,
      sortBy: "firstName",
      sortOrder: "asc",
    }),
    services.teacher.getAllTeachers({
      limit: 100,
      sortBy: "firstName",
      sortOrder: "asc",
    }),
  ]);

  return Response.json({
    grades: grades.filter((g): g is GradeWithRelations => g !== null),
    streams,
    forms,
    subjects,
    students,
    teachers,
  });
}

// Action: handle create, update, delete with Zod validation
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { grade: GradeService };
  const form = await request.formData();
  const method = (form.get("_method") as string) || request.method;
  const rawData = Object.fromEntries(form.entries());

  try {
    if (method === "POST") {
      const parsed = GradeCreateSchema.safeParse(rawData);
      if (!parsed.success) {
        const error = parsed.error.issues[0]?.message || "Invalid input data";
        return Response.json({ error }, { status: 400 });
      }

      const created = await services.grade.create(parsed.data);
      if (!created) {
        return Response.json(
          { error: "Failed to create grade" },
          { status: 400 },
        );
      }
      return Response.json({ success: true, method: "POST" });
    }

    if (method === "PUT") {
      const parsed = GradeUpdateSchema.safeParse(rawData);
      if (!parsed.success) {
        const error = parsed.error.issues[0]?.message || "Invalid input data";
        return Response.json({ error }, { status: 400 });
      }

      const { id, ...data } = parsed.data;
      const updated = await services.grade.update(id, data);
      if (!updated) {
        return Response.json(
          { error: "Failed to update grade" },
          { status: 400 },
        );
      }
      return Response.json({ success: true, method: "PUT" });
    }

    if (method === "DELETE") {
      const id = String(form.get("id") ?? "");
      if (!id)
        return Response.json(
          { error: "Grade ID is required" },
          { status: 400 },
        );

      const deleted = await services.grade.delete(id);
      if (!deleted) {
        return Response.json(
          { error: "Failed to delete grade" },
          { status: 400 },
        );
      }
      return Response.json({ success: true, method: "DELETE" });
    }

    return Response.json({ error: "Unknown method" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("grades action error:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

// Utility to escape fields and prevent CSV Injection attacks
function sanitizeCsvCell(cell: string): string {
  let escaped = cell.replace(/"/g, '""');
  if (/^[=+@-].*/.test(escaped)) {
    escaped = `'${escaped}`;
  }
  return `"${escaped}"`;
}

export default function Grades() {
  const { t } = useLanguage();
  const { grades, streams, forms, subjects, students, teachers } =
    useLoaderData() as {
      grades: GradeWithRelations[];
      streams: any[];
      forms: any[];
      subjects: any[];
      students: any[];
      teachers: any[];
    };

  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<GradeWithRelations | null>(null);

  // Filter local state
  const [selectedStream, setSelectedStream] = useState<string>(
    searchParams.get("streamId") || "",
  );
  const [selectedForm, setSelectedForm] = useState<string>(
    searchParams.get("formId") || "",
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    searchParams.get("subjectId") || "",
  );
  const [selectedStudent, setSelectedStudent] = useState<string>(
    searchParams.get("studentId") || "",
  );
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    searchParams.get("teacherId") || "",
  );

  // Handle toast notifications & modal close on action resolution
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const data = fetcher.data as {
      error?: string;
      success?: boolean;
      method?: string;
    };

    if (data.error) {
      toast.error(data.error);
      return;
    }

    if (data.success) {
      switch (data.method) {
        case "POST":
          toast.success("Grade added successfully!");
          setFormOpen(false);
          break;
        case "PUT":
          toast.success("Grade updated successfully!");
          setFormOpen(false);
          break;
        case "DELETE":
          toast.success("Grade deleted successfully!");
          break;
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleEdit = (grade: GradeWithRelations) => {
    setEditData(grade);
    setFormOpen(true);
  };

  const handleExport = () => {
    try {
      const headers = [
        "Student Name",
        "Subject",
        "Score",
        "Grade",
        "Remarks",
        "Teacher",
        "Stream",
        "Form",
      ];

      const rows = grades.map((grade) => [
        sanitizeCsvCell(
          grade.student
            ? `${grade.student.firstName} ${grade.student.lastName}`
            : "",
        ),
        sanitizeCsvCell(grade.subject ? grade.subject.subjectName : ""),
        sanitizeCsvCell(grade.score.toString()),
        sanitizeCsvCell(grade.grade || ""),
        sanitizeCsvCell(grade.remarks || ""),
        sanitizeCsvCell(
          grade.teacher
            ? `${grade.teacher.firstName} ${grade.teacher.lastName}`
            : "",
        ),
        sanitizeCsvCell(grade.stream?.name || ""),
        sanitizeCsvCell(grade.form?.name || ""),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `grades_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Grades exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export grades");
    }
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams();
    if (selectedStream) params.set("streamId", selectedStream);
    if (selectedForm) params.set("formId", selectedForm);
    if (selectedSubject) params.set("subjectId", selectedSubject);
    if (selectedStudent) params.set("studentId", selectedStudent);
    if (selectedTeacher) params.set("teacherId", selectedTeacher);

    setSearchParams(params);
  };

  const filteredForms = selectedStream
    ? forms.filter((f) => f.streamId === parseInt(selectedStream, 10))
    : forms;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("gradesManagement")}
        </h1>
        <p className="text-foreground mt-2">{t("manageGrades")}</p>
      </div>

      {/* Filters and Actions */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                value={selectedStream}
                onValueChange={(value) => {
                  setSelectedStream(value);
                  setSelectedForm("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stream" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((stream) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedForm}
                onValueChange={setSelectedForm}
                disabled={!selectedStream}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      selectedStream ? "Form" : "Select stream first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredForms.map((form) => (
                    <SelectItem key={form.id} value={String(form.id)}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedTeacher}
                onValueChange={setSelectedTeacher}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                onClick={handleFilterChange}
                size="sm"
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer transition hover:scale-105"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grades Table */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("studentGrades")}</CardTitle>
              <CardDescription>{t("gradesDescription")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-105 transition cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("exportGrades")}
              </Button>
              <Button
                onClick={() => {
                  setEditData(null);
                  setFormOpen(true);
                }}
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-105 transition cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("addGrade")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead>
                    {t("student")} {t("name")}
                  </TableHead>
                  <TableHead>{t("subjects")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("grade")}</TableHead>
                  <TableHead>{t("remarks")}</TableHead>
                  <TableHead>{t("teachers")}</TableHead>
                  <TableHead>{t("streams")}</TableHead>
                  <TableHead>{t("forms")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {t("noGrades")}
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">
                        {grade.student
                          ? `${grade.student.firstName} ${grade.student.lastName}`
                          : "—"}
                      </TableCell>

                      <TableCell>
                        {grade.subject ? grade.subject.subjectName : "—"}
                      </TableCell>

                      <TableCell>{grade.score}</TableCell>

                      <TableCell>
                        <GradeBadge
                          grade={grade.grade as "A" | "B" | "C" | "D" | "F"}
                        />
                      </TableCell>

                      <TableCell className="max-w-xs truncate">
                        {grade.remarks || "—"}
                      </TableCell>

                      <TableCell>
                        {grade.teacher
                          ? `${grade.teacher.firstName} ${grade.teacher.lastName}`
                          : "—"}
                      </TableCell>

                      <TableCell>{grade.stream?.name || "—"}</TableCell>

                      <TableCell>{grade.form?.name || "—"}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            className="hover:scale-105 transition cursor-pointer"
                            size="icon"
                            onClick={() => handleEdit(grade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteButton
                            id={grade.id}
                            name={
                              grade.student
                                ? `${grade.student.firstName} ${grade.student.lastName}`
                                : "Grade"
                            }
                            fetcher={fetcher}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GradeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        students={students}
        subjects={subjects}
        streams={streams}
        forms={forms}
        teachers={teachers}
        fetcher={fetcher}
      />
    </div>
  );
}
