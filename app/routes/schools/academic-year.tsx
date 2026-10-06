import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import {
  CalendarRange,
  Plus,
  Pencil,
  ListTree,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { DeleteStudentButton } from "~/components/DeleteStudentButton";
import { PaginationControls } from "~/components/shared/PaginationControls";
import { usePagination } from "~/hooks/usePagination";
import { requireSchoolPermission } from "~/lib/require-school-permission";
import AddAcademicYearModal from "~/components/modal/AddAcademicYearModal";
import EditAcademicYearModal from "~/components/modal/EditAcademicYearModal";
import ManageTermsModal from "~/components/modal/ManageTermsModal";

import type AcademicYearService from "workers/services/academic-years";

// --- Loader ---
export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, "school.profile.read");
  const services = context.services as { academicYear: AcademicYearService };
  const currentTerm = await services.academicYear.getCurrentTerm();
  const years = await services.academicYear.getAllYearsWithTerms();
  return { years, currentTerm };
}

// --- Action ---
export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, "school.profile.update");
  const services = context.services as { academicYear: AcademicYearService };
  const form = await request.formData();
  const method = (form.get("_method") as string) || request.method;
  const actionType = form.get("action") as string | null;

  try {
    // ---- ACADEMIC YEAR ----
    if (actionType === "year_create") {
      const data = {
        name: String(form.get("name") ?? ""),
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        status: String(form.get("status") ?? "upcoming") as
          | "upcoming"
          | "active"
          | "archived",
      };
      const created = await services.academicYear.createYear(data);
      if (!created) {
        return {
          error: "Failed to create academic year. Check the name and dates.",
        };
      }
      return { success: true, action: "year_create", year: created };
    }

    if (actionType === "year_update") {
      const id = Number(form.get("id"));
      if (!id) return { error: "Academic year ID is required" };
      const data = {
        name: form.get("name") ? String(form.get("name")) : undefined,
        startDate: form.get("startDate")
          ? String(form.get("startDate"))
          : undefined,
        endDate: form.get("endDate") ? String(form.get("endDate")) : undefined,
        status: form.get("status")
          ? (String(form.get("status")) as "upcoming" | "active" | "archived")
          : undefined,
      };
      const updated = await services.academicYear.updateYear(id, data);
      if (!updated) return { error: "Failed to update academic year." };
      return { success: true, action: "year_update", year: updated };
    }

    if (actionType === "year_set_active") {
      const id = Number(form.get("id"));
      if (!id) return { error: "Academic year ID is required" };
      const result = await services.academicYear.setActiveYear(id);
      if (!result) return { error: "Failed to set the active academic year." };
      return { success: true, action: "year_set_active", year: result };
    }

    if (actionType === "year_delete" || (method === "DELETE" && !actionType)) {
      const id = Number(form.get("id"));
      if (!id) return { error: "Academic year ID is required" };
      const ok = await services.academicYear.deleteYear(id);
      if (!ok) return { error: "Failed to delete academic year." };
      return { success: true, action: "year_delete", id };
    }

    // ---- TERMS ----
    if (actionType === "term_create") {
      const data = {
        academicYearId: Number(form.get("academicYearId")),
        name: String(form.get("name") ?? ""),
        termNumber: Number(form.get("termNumber") ?? 1),
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        isCurrent: false,
      };
      const created = await services.academicYear.createTerm(data);
      if (!created) return { error: "Failed to create term." };
      if ("error" in created) return { error: created.error };
      return { success: true, action: "term_create", term: created };
    }

    if (actionType === "term_update") {
      const id = Number(form.get("id"));
      if (!id) return { error: "Term ID is required" };
      const data = {
        name: form.get("name") ? String(form.get("name")) : undefined,
        termNumber: form.get("termNumber")
          ? Number(form.get("termNumber"))
          : undefined,
        startDate: form.get("startDate")
          ? String(form.get("startDate"))
          : undefined,
        endDate: form.get("endDate") ? String(form.get("endDate")) : undefined,
      };
      const updated = await services.academicYear.updateTerm(id, data);
      if (!updated) return { error: "Failed to update term." };
      if ("error" in updated) return { error: updated.error };
      return { success: true, action: "term_update", term: updated };
    }

    if (actionType === "term_set_current") {
      const id = Number(form.get("id"));
      if (!id) return { error: "Term ID is required" };
      const result = await services.academicYear.setCurrentTerm(id);
      if (!result) return { error: "Failed to set the current term." };
      if ("error" in result) return { error: result.error };
      return { success: true, action: "term_set_current", term: result };
    }

    if (actionType === "term_delete") {
      const id = Number(form.get("id"));
      if (!id) return { error: "Term ID is required" };
      const ok = await services.academicYear.deleteTerm(id);
      if (!ok) return { error: "Failed to delete term." };
      return { success: true, action: "term_delete", id };
    }

    return { error: "Unknown action" };
  } catch (err: any) {
    console.error("academic-year action error:", err);
    return { error: err?.message || "Server error" };
  }
}

// --- Page ---
export default function AcademicYearPage() {
  const { years: initialYears, currentTerm: initialCurrentTerm } =
    useLoaderData<{
      years: any[];
      currentTerm: any;
    }>();

  const fetcher = useFetcher<any>();
  const listMethod = useFetcher<any>();
  const lastAction = useRef<string | null>(null);

  const [years, setYears] = useState(initialYears);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<any>(null);

  // Track which action is in flight so we know how to react on completion.
  useEffect(() => {
    if (fetcher.state === "submitting" && fetcher.formData) {
      lastAction.current = (fetcher.formData.get("action") as string) || null;
    }
  }, [fetcher.state, fetcher.formData]);

  // React to top-level (year) mutations. Term mutations are handled inside
  // ManageTermsModal itself, since it owns the terms list for one year.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        // Only surface as a page-level toast for year actions; term errors
        // are shown inline inside ManageTermsModal.
        if (lastAction.current?.startsWith("year_")) {
          toast.error(data.error);
        }
        return;
      }

      if (data.success) {
        switch (data.action) {
          case "year_create":
            toast.success("Academic year added.");
            listMethod.load(window.location.pathname);
            break;
          case "year_update":
            toast.success("Academic year updated.");
            listMethod.load(window.location.pathname);
            break;
          case "year_set_active":
            toast.success(`${data.year.name} is now the active academic year.`);
            listMethod.load(window.location.pathname);
            break;
          case "year_delete":
            toast.success("Academic year deleted.");
            setYears((prev) => prev.filter((y) => y.id !== data.id));
            break;
          default:
            // term_* actions: keep the years list in sync silently.
            if (data.action?.startsWith("term_")) {
              listMethod.load(window.location.pathname);
            }
        }
        lastAction.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Refresh local state whenever we reload the list.
  useEffect(() => {
    if (listMethod.state === "idle" && listMethod.data?.years) {
      setYears(listMethod.data.years);
      if (selectedYear) {
        const refreshed = listMethod.data.years.find(
          (y: any) => y.id === selectedYear.id,
        );
        if (refreshed) setSelectedYear(refreshed);
      }
    }
  }, [listMethod.state, listMethod.data]);

  const currentTerm = listMethod.data?.currentTerm ?? initialCurrentTerm;
  const activeYear = years.find((y) => y.status === "active");
  const totalTerms = years.reduce((sum, y) => sum + (y.terms?.length || 0), 0);

  const handleEdit = (year: any) => {
    setSelectedYear(year);
    setIsEditOpen(true);
  };

  const handleManageTerms = (year: any) => {
    setSelectedYear(year);
    setIsTermsOpen(true);
  };

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedYears,
    goToPage,
  } = usePagination(years, 10);

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    active: "default",
    upcoming: "secondary",
    archived: "outline",
  };

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <PageHeader
          title="Academic Year"
          description="Configure academic years, terms, and active periods"
          actions={
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Academic Year
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CalendarRange className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Year
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {activeYear ? activeYear.name : "None set"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Current Term
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {currentTerm?.status === "in_term"
                    ? currentTerm.term.name
                    : currentTerm?.status === "break"
                      ? "Holiday Break"
                      : "None set"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ListTree className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Years / Terms
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {years.length} / {totalTerms}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="p-6 border-none shadow-none">
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Start Date</TableHead>
                    <TableHead className="font-semibold">End Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Terms</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <p className="text-muted-foreground">
                          No academic years yet. Add one to get started.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedYears.map((year: any) => (
                      <TableRow key={year.id}>
                        <TableCell className="font-medium">
                          {year.name}
                        </TableCell>
                        <TableCell>{year.startDate}</TableCell>
                        <TableCell>{year.endDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariant[year.status] || "outline"}
                          >
                            {year.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{year.terms?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg bg-transparent transition-transform duration-200 hover:scale-105"
                              size="icon"
                              title="Manage terms"
                              onClick={() => handleManageTerms(year)}
                            >
                              <ListTree className="h-4 w-4" />
                            </Button>
                            <Button
                              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg bg-transparent transition-transform duration-200 hover:scale-105"
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => handleEdit(year)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteStudentButton
                              id={year.id}
                              name={year.name}
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
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </Card>
      </div>

      {isAddOpen && (
        <AddAcademicYearModal
          open={isAddOpen}
          setOpen={setIsAddOpen}
          fetcher={fetcher}
        />
      )}

      {isEditOpen && selectedYear && (
        <EditAcademicYearModal
          open={isEditOpen}
          setOpen={setIsEditOpen}
          fetcher={fetcher}
          year={selectedYear}
        />
      )}

      {isTermsOpen && selectedYear && (
        <ManageTermsModal
          open={isTermsOpen}
          setOpen={setIsTermsOpen}
          fetcher={fetcher}
          year={selectedYear}
        />
      )}
    </div>
  );
}
