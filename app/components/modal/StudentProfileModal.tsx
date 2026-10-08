import { Form } from 'react-router';
import { useState } from 'react'; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Eye } from "lucide-react";
import { ViewDocumentView } from "~/components/ViewDocumentView";
import { useLanguage } from "~/lib/i18n";
import type { ViewDocument } from "workers/kernel/view-document";

interface ProfileTab {
  extensionKey: string;
  label: string | null;
  document: ViewDocument;
  catalog: { en: Record<string, string>; sw: Record<string, string> };
}

interface StudentProfilesModalProps {
  student: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  profileTabs?: ProfileTab[];
}

export function StudentProfilesModal({
  student,
  open,
  onOpenChange,
  showTrigger = true,
  profileTabs = [],
}: StudentProfilesModalProps) {
  const { t, language } = useLanguage();
  // new
  const [internalOpen, setInternalOpen] = useState(false);

  // new
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  // 
  if (!student) return null;

  const subjects: any[] = student.subjects ?? [];
  const isMale = student.gender?.toLowerCase() === "male";
  // show a dash instead of leaving empty fields blank
  const show = (value?: string | null) =>
    value && String(value).trim() ? value : "—";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && ( 
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student.name}</DialogTitle>
          <DialogDescription>Student Profile Details</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={
                student.photoUrl ||
                (isMale
                  ? "/assets/male-avatar.png"
                  : "/assets/female-avatar.png")
              }
              alt={student.photoUrl ? 'Student Photo' : 'Default Avatar'}
              className="w-16 h-16 rounded-full object-cover border"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mt-4">
            <p>
              <strong>Name:</strong> {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')}
            </p>
            <p>
              <strong>Gender:</strong> {student.gender}
            </p>
            <p>
              <strong>DOB:</strong> {show(student.dob)}
            </p>
            <p>
              <strong>Course:</strong> {show(student.course)}
            </p>
            <p>
              <strong>Email:</strong> {show(student.email)}
            </p>
            <p>
              <strong>Phone:</strong> {show(student.phone)}
            </p>
            <p>
              <strong>Address:</strong> {show(student.address)}
            </p>
            <p>
              <strong>Campus:</strong> {show(student.campusName)}
            </p>
          </div>

          {/* Assigned subjects (plain list, always visible) */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold">
              Assigned Subjects ({subjects.length})
            </p>

            {subjects.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {subjects.map((subject: any) => (
                  <li
                    key={subject.id}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {subject.code}
                    </Badge>
                    <span>{subject.subjectName ?? subject.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No subjects assigned
              </p>
            )}
          </div>

          {profileTabs.map((tab) => {
            const catalog = tab.catalog[language === "sw" ? "sw" : "en"];
            const title = tab.label ? catalog[tab.label] ?? tab.catalog.en[tab.label] ?? tab.label : "";
            return (
              <div key={tab.extensionKey} className="border-t pt-3">
                {title ? <p className="text-sm font-semibold">{title}</p> : null}
                <ViewDocumentView
                  document={tab.document}
                  catalog={tab.catalog}
                  language={language === "sw" ? "sw" : "en"}
                />
              </div>
            );
          })}

          {student.id ? (
            <div className="space-y-2 border-t pt-3">
              <a className="text-sm underline" href={`/students/${student.id}/data.json`}>
                {t('exportPersonData')}
              </a>
              <p className="text-xs text-muted-foreground">{t('erasePersonHelp')}</p>
              <Form method="post" action={`/students/${student.id}/data.json`} className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirm" value="yes" required />
                  <span>{t('erasePersonConfirm')}</span>
                </label>
                <Button type="submit" variant="outline">{t('erasePersonData')}</Button>
              </Form>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}