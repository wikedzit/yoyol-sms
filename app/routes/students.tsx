import { useEffect, useRef, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import {
  BookOpen,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import type CampusService from "workers/services/campus";
import type StudentService from "workers/services/student";
import type SubjectService from "workers/services/subjects";
import type StudentSubjectService from "workers/services/student-subjects";
import type SchoolService from "workers/services/school";
import type AcademicLevelService from "workers/services/academic-levels";

import { toTitleCase } from "~/utils/strings";
import { usePagination } from "~/hooks/usePagination";

import { PaginationControls } from "~/components/shared/PaginationControls";
import AddStudentModal from "~/components/modal/AddStudentModal";
import EditStudentModal from "~/components/modal/EditStudentModal";
import { DeleteStudentButton } from "~/components/DeleteStudentButton";
import { StudentProfilesModal } from "~/components/modal/StudentProfileModal";
import AssignSubjectsToStudentModal from "~/components/modal/AssignSubjectsToStudentModal";

type Services = {
  student: StudentService;
  subject: SubjectService;
  studentSubjects: StudentSubjectService;
  school: SchoolService;
  campus: CampusService;
  academicLevel: AcademicLevelService;
};

type Student = {
  id: number | string;
  firstName: string;
  lastName: string;
  gender?: "Male" | "Female";
  dob?: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  photoUrl?: string;
  course?: string;
  grade?: string;
  admissionNumber?: string;
  enrollmentDate?: string;
  status?: "Active" | "Pending" | "Inactive";
  classId?: number | string;
  formClassId?: number | string;
  schoolId?: number | string;
  campusId?: number | string;
  subjects?: any[];
  schoolName?: string;
  campusName?: string;
};

type Campus = {
  id: number;
  name: string;
  schoolId: number;
};

type School = {
  id: number;
  name: string;
};

type Stream = {
  id: number;
  name: string;
};

type AcademicForm = {
  id: number;
  name: string;
  streamId: number;
};

async function findSingleClassIdForForm(
  academicLevel: AcademicLevelService,
  formId: number,
): Promise<number | undefined> {
  const classes = await academicLevel.getFormClassesByFormId(formId);

  if (classes.length !== 1) {
    return undefined;
  }

  return classes[0].id;
}

// ======================================================
// LOADER
// ======================================================

export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as Services;

  const students = await services.student.getAll({
    limit: 100,
    offset: 0,
    sortBy: "createdAt",
    sortOrder: "asc",
  });

  const subjects =
    (await services.subject.getAllSubjects({
      limit: 100,
      offset: 0,
      sortBy: "subjectName",
      sortOrder: "asc",
    })) || [];

  const schools = (await services.school.getAll()) || [];

  const campuses = (
    await Promise.all(
      schools.map(async (school) => {
        const schoolCampuses =
          (await services.campus.getBySchoolId(school.id)) || [];

        return schoolCampuses.map((campus) => ({
          ...campus,
          schoolName: school.name,
        }));
      }),
    )
  ).flat();

  const studentsWithSubjects = await Promise.all(
    students.map(async (student: any) => {
      const assignedSubjects =
        (await services.studentSubjects.getSubjectsByStudent(student.id)) ||
        [];

      const school = schools.find(
        (item) => String(item.id) === String(student.schoolId),
      );

      const campus = campuses.find(
        (item) => String(item.id) === String(student.campusId),
      );

      return {
        ...student,
        subjects: assignedSubjects,
        schoolName: school?.name || "Not assigned",
        campusName: campus?.name || "Not assigned",
      };
    }),
  );

  const streams = await services.academicLevel.getAllStreams();

  const forms = await services.academicLevel.getAllForms();

  return {
    students: studentsWithSubjects,
    allSubjects: subjects,
    schools,
    campuses,
    streams,
    forms,
  };
}

// ======================================================
// ACTION
// ======================================================

export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as Services;

  const form = await request.formData();

  const method = String(form.get("_method") || request.method).toUpperCase();

  const actionName = form.get("action");

  try {
    // ==================================================
    // ASSIGN SUBJECTS
    // ==================================================

    if (actionName === "assign_subjects") {
      const studentId = Number(form.get("studentId"));

      const subjectIds = JSON.parse(String(form.get("subjectIds") || "[]"));

      if (!studentId) {
        return {
          error: "Student ID is required.",
        };
      }

      await services.studentSubjects.replaceStudentSubjects(
        studentId,
        subjectIds,
      );

      return {
        success: true,
        action: "assign_subjects",
      };
    }

    // ==================================================
    // CREATE STUDENT
    // ==================================================

    if (method === "POST") {
      const campusIdValue = form.get("campusId");

      if (!campusIdValue) {
        return {
          error: "Please select a campus.",
        };
      }

      const campusId = Number(campusIdValue);

      if (!Number.isFinite(campusId)) {
        return {
          error: "Invalid campus.",
        };
      }

      const selectedCampus = await services.campus.getById(campusId);

      if (!selectedCampus) {
        return {
          error: "Selected campus was not found.",
        };
      }

      const schoolId = selectedCampus.schoolId;

      if (!schoolId) {
        return {
          error: "The selected campus is not associated with a school.",
        };
      }

      const admissionNumber = String(form.get("admissionNumber") ?? "").trim();
      const streamId = form.get("streamId")
        ? Number(form.get("streamId"))
        : undefined;

      const formId = form.get("formId")
        ? Number(form.get("formId"))
        : undefined;

      if (!streamId || !formId) {
        return {
          error: "Please select a stream and form.",
        };
      }

      const selectedForm =
        await services.academicLevel.getFormById(formId);

      if (!selectedForm || selectedForm.streamId !== streamId) {
        return {
          error: "Please select a valid stream and form.",
        };
      }

      const formClassId = await findSingleClassIdForForm(
        services.academicLevel,
        formId,
      );

      const data = {
        firstName: toTitleCase(String(form.get("firstName") ?? "")),
        lastName: toTitleCase(String(form.get("lastName") ?? "")),
        gender: String(form.get("gender") ?? "Select gender") as
          "Male" | "Female",
        dob: String(form.get("dob") ?? ""),
        email: form.get("email") ? String(form.get("email")) : undefined,
        phone: form.get("phone") ? String(form.get("phone")) : undefined,
        address: form.get("address") ? String(form.get("address")) : undefined,
        guardianName: form.get("guardianName")
          ? toTitleCase(String(form.get("guardianName")))
          : undefined,

        phone: form.get("phone")
          ? String(form.get("phone")).trim()
          : undefined,

        address: form.get("address")
          ? String(form.get("address")).trim()
          : undefined,

        guardianName: form.get("guardianName")
          ? toTitleCase(String(form.get("guardianName")).trim())
          : undefined,

        guardianPhone: form.get("guardianPhone")
          ? String(form.get("guardianPhone")).trim()
          : undefined,

        photoUrl: form.get("photoUrl")
          ? String(form.get("photoUrl"))
          : undefined,

        course: form.get("course")
          ? String(form.get("course"))
          : undefined,

        admissionNumber,

        classId: form.get("classId")
          ? Number(form.get("classId"))
          : undefined,

        formClassId,

        schoolId,
        campusId: Number(selectedCampus.id),
        status: String(form.get("status") ?? "Active") as
          "Active" | "Pending" | "Inactive",
      };

      const created = await services.student.create(data as any);

      if (!created) {
        return {
          error:
            "Failed to add student. Please make sure all required fields are valid.",
        };
      }

      if (formClassId) {
        const currentClass =
          await services.academicLevel.getFormClassById(formClassId);

        if (currentClass) {
          await services.academicLevel.updateFormClass(formClassId, {
            studentCount: (currentClass.studentCount || 0) + 1,
          });
        }
      }

      return {
        success: true,
        student: created,
      };
    }

    // ==================================================
    // UPDATE STUDENT
    // ==================================================

    if (method === "PUT") {
      const id = form.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({
            error: "Student ID is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const campusIdValue = form.get("campusId");

      let schoolId: number | undefined;
      let campusId: string | undefined;

      if (campusIdValue) {
        const campusIdRaw = Number(campusIdValue);

        if (!Number.isFinite(campusIdRaw)) {
          return new Response(
            JSON.stringify({
              error: "Invalid campus.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        const selectedCampus = await services.campus.getById(campusIdRaw);

        if (!selectedCampus) {
          return new Response(
            JSON.stringify({
              error: "Selected campus was not found.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        schoolId = selectedCampus.schoolId;
        campusId = String(selectedCampus.id);
      }

      if (!schoolId && form.get("schoolId")) {
        schoolId = Number(form.get("schoolId"));
      }

      const data = {
        firstName: toTitleCase(String(form.get("firstName") ?? "")),
        lastName: toTitleCase(String(form.get("lastName") ?? "")),
        gender: String(form.get("gender") ?? "Select gender") as
          "Male" | "Female",
        dob: String(form.get("dob") ?? ""),
        email: form.get("email") ? String(form.get("email")) : undefined,
        phone: form.get("phone") ? String(form.get("phone")) : undefined,
        address: form.get("address") ? String(form.get("address")) : undefined,
        guardianName: form.get("guardianName")
          ? toTitleCase(String(form.get("guardianName")))
          : undefined,

        phone: form.get("phone")
          ? String(form.get("phone")).trim()
          : undefined,

        address: form.get("address")
          ? String(form.get("address")).trim()
          : undefined,

        guardianName: form.get("guardianName")
          ? toTitleCase(String(form.get("guardianName")).trim())
          : undefined,

        guardianPhone: form.get("guardianPhone")
          ? String(form.get("guardianPhone")).trim()
          : undefined,

        photoUrl: form.get("photoUrl")
          ? String(form.get("photoUrl"))
          : undefined,

        course: form.get("course")
          ? String(form.get("course"))
          : undefined,

        grade: form.get("grade")
          ? String(form.get("grade"))
          : undefined,

        enrollmentDate: form.get("enrollmentDate")
          ? String(form.get("enrollmentDate"))
          : undefined,

        classId: form.get("classId")
          ? String(form.get("classId"))
          : undefined,

        formClassId: form.get("formClassId")
          ? String(form.get("formClassId"))
          : undefined,

        schoolId,
        campusId,
        status: String(form.get("status") ?? "Active") as
          "Active" | "Pending" | "Inactive",
      };

      const updated = await services.student.update(
        String(id),
        data as any,
      );

      return new Response(
        JSON.stringify({
          success: true,
          student: updated,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ==================================================
    // DELETE STUDENT
    // ==================================================

    if (method === "DELETE") {
      const id = form.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({
            error: "Student ID is required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      await services.student.delete(String(id));

      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Unknown method.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("students.action error:", error);

    return {
      error: error?.message || "Server error.",
    };
  }
}

// ======================================================
// COMPONENT
// ======================================================

export default function Students() {
  const {
    students: initialStudents,
    allSubjects,
    schools,
    campuses,
    streams,
    forms,
  } = useLoaderData() as {
    students: Student[];
    allSubjects: any[];
    schools: School[];
    campuses: Campus[];
    streams: Stream[];
    forms: AcademicForm[];
  };

  const fetcher = useFetcher();
  const listFetcher = useFetcher();

  const lastMethod = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);

  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);

  const [assignSubjectsModalOpen, setAssignSubjectsModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [newStudent, setNewStudent] = useState<Student | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // ==================================================
  // FILTER
  // ==================================================

  const filteredStudents =
    initialStudents?.filter((student) => {
      const searchValue = search.toLowerCase().trim();

      const firstName = String(student.firstName || "").toLowerCase();

      const lastName = String(student.lastName || "").toLowerCase();

      const email = String(student.email || "").toLowerCase();

      const admissionNumber = String(
        student.admissionNumber || "",
      ).toLowerCase();

      const matchesSearch =
        !searchValue ||
        firstName.includes(searchValue) ||
        lastName.includes(searchValue) ||
        email.includes(searchValue) ||
        admissionNumber.includes(searchValue);

      const matchesFilter =
        filter === "all" ||
        student.course === filter ||
        student.grade === filter;

      return matchesSearch && matchesFilter;
    }) || [];

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudentsList,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  // ==================================================
  // TRACK METHOD
  // ==================================================

  useEffect(() => {
    if (fetcher.state === "submitting" && fetcher.formData) {
      const method = fetcher.formData.get("_method");

      lastMethod.current = String(
        method || fetcher.formMethod,
      ).toUpperCase();
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // ==================================================
  // ACTION RESPONSE
  // ==================================================

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }

    const data = fetcher.data as any;

    if (data.error) {
      toast.error(data.error);
      return;
    }

    if (!data.success) {
      return;
    }

    if (data.action === "assign_subjects") {
      toast.success("Subjects assigned successfully!");

      listFetcher.load(window.location.pathname);

      lastMethod.current = null;

      return;
    }

    switch (lastMethod.current) {
      case "POST": {
        toast.success("Student added successfully!");

        listFetcher.load(window.location.pathname);

        const createdStudent = data.student;

        const selectedSchool = schools.find(
          (school) => String(school.id) === String(createdStudent?.schoolId),
        );

        const selectedCampus = campuses.find(
          (campus) => String(campus.id) === String(createdStudent?.campusId),
        );

        setNewStudent({
          ...createdStudent,
          schoolName: selectedSchool?.name || "Not assigned",
          campusName: selectedCampus?.name || "Not assigned",
        });

        setAddStudentModalOpen(false);
        setProfileModalOpen(true);

        break;
      }

      case "PUT": {
        toast.success("Student updated successfully!");

        listFetcher.load(window.location.pathname);

        setEditStudentModalOpen(false);
        setSelectedStudent(null);

        break;
      }

      case "DELETE": {
        toast.success("Student deleted successfully!");

        listFetcher.load(window.location.pathname);

        setDeleteTarget(null);

        break;
      }

      default:
        toast.success("Action completed successfully.");
    }

    lastMethod.current = null;
  }, [fetcher.state, fetcher.data, schools, campuses]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="space-y-2 min-h-screen">
      {/* HEADER */}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>

          <p className="text-muted-foreground mt-1">
            Manage and view all student records
          </p>
        </div>

        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
          onClick={() => setAddStudentModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* SEARCH / FILTER */}

      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by course/grade" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All</SelectItem>

                <SelectItem value="A">Grade A</SelectItem>

                <SelectItem value="B+">Grade B+</SelectItem>

                <SelectItem value="B">Grade B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* DESKTOP TABLE */}

          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">SN</TableHead>

                  <TableHead className="font-semibold">
                    First name
                  </TableHead>

                  <TableHead className="font-semibold">
                    Last name
                  </TableHead>

                  <TableHead className="font-semibold">
                    Admission No.
                  </TableHead>

                  <TableHead className="font-semibold">Email</TableHead>

                  <TableHead className="font-semibold">
                    Assigned Subjects
                  </TableHead>

                  <TableHead className="font-semibold">Enrolled</TableHead>

                  <TableHead className="font-semibold">Status</TableHead>

                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudentsList?.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>{student.firstName}</TableCell>
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell>
                      {student.admissionNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email || "—"}
                    </TableCell>
                    <TableCell>
                      {student.subjects?.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {student.subjects.length}{" "}
                          {student.subjects.length === 1
                            ? "Subject"
                            : "Subjects"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No subjects
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{student.enrollmentDate}</TableCell>
                    <TableCell className="border-none">
                      <Badge
                        variant={
                          student.status === "Active"
                            ? "default"
                            : student.status === "Pending"
                              ? "secondary"
                              : "outline"
                        }
                        className="border-none"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <StudentProfilesModal student={student} />
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Assign Subjects"
                        className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setAssignSubjectsModalOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setEditStudentModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteStudentButton
                        id={student.id}
                        name={`${student.firstName} ${student.lastName}`}
                        fetcher={fetcher}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE */}

          <div className="lg:hidden">
            <div className="mb-2 text-xs text-muted-foreground">
              Showing {paginatedStudentsList.length} of{" "}
              {filteredStudents.length} students
            </div>

            <div className="grid grid-cols-[1.5rem_1fr_4rem_2rem] md:grid-cols-[1.5rem_1fr_5rem_6rem_2rem] items-center px-2 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground rounded-t-md">
              <span>SN</span>

              <span className="pl-1">Student</span>

              <span className="text-center">Status</span>

              <span className="hidden md:block text-center">
                Enrolled
              </span>

              <span />
            </div>

            <div className="flex flex-col divide-y border border-t-0 rounded-b-md">
              {paginatedStudentsList.length > 0 ? (
                paginatedStudentsList.map((student, index) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[1.5rem_1fr_4rem_2rem] md:grid-cols-[1.5rem_1fr_5rem_6rem_2rem] items-center px-2 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {startIndex + index + 1}
                    </span>

                    <div className="flex flex-col min-w-0 pl-1">
                      <span className="font-semibold text-[14px] md:text-[16px] leading-tight truncate">
                        {student.firstName} {student.lastName}
                      </span>

                      <span className="text-[10px] md:text-[13px] text-muted-foreground truncate mt-0.5">
                        {student.admissionNumber ||
                          student.email ||
                          "No admission number"}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <Badge
                        variant={
                          student.status === "Active"
                            ? "default"
                            : student.status === "Pending"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {student.status || "Active"}
                      </Badge>
                    </div>

                    <div className="hidden md:flex w-24 justify-center text-xs text-muted-foreground whitespace-nowrap">
                      {student.enrollmentDate || "—"}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-44"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={() => {
                            setNewStudent(student);

                            setProfileModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={() => {
                            setSelectedStudent(student);

                            setAssignSubjectsModalOpen(true);
                          }}
                        >
                          <BookOpen className="h-4 w-4" />
                          Assign Subjects
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={() => {
                            setSelectedStudent(student);

                            setEditStudentModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No students found.
                </div>
              )}
            </div>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </CardContent>
      </Card>

      {/* ADD STUDENT */}

      {addStudentModalOpen && (
        <AddStudentModal
          open={addStudentModalOpen}
          setOpen={setAddStudentModalOpen}
          fetcher={fetcher}
          schools={schools}
          campuses={campuses}
          streams={streams}
          forms={forms}
        />
      )}

      {/* EDIT STUDENT */}

      {editStudentModalOpen && selectedStudent && (
        <EditStudentModal
          open={editStudentModalOpen}
          setOpen={setEditStudentModalOpen}
          student={selectedStudent}
          fetcher={fetcher}
        />
      )}

      {/* ASSIGN SUBJECTS */}

      {assignSubjectsModalOpen && selectedStudent && (
        <AssignSubjectsToStudentModal
          open={assignSubjectsModalOpen}
          setOpen={setAssignSubjectsModalOpen}
          student={selectedStudent as any}
          availableSubjects={allSubjects}
          assignedSubjects={selectedStudent.subjects || []}
          fetcher={fetcher}
        />
      )}

      {/* NEW STUDENT PROFILE */}

      <StudentProfilesModal
        student={newStudent}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        showTrigger={false}
      />

      {/* MOBILE DELETE */}

      {deleteTarget && (
        <DeleteStudentButton
          id={String(deleteTarget.id)}
          name={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          fetcher={fetcher}
          open={Boolean(deleteTarget)}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDeleteTarget(null);
            }
          }}
          showTrigger={false}
        />
      )}
    </div>
  );
}