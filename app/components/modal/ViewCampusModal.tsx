import {Building2, Eye, Hash, Mail, MapPin, Phone,Users,
} from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';

import { Button } from '~/components/ui/button';

interface Campus {
  id: number;
  schoolId: number;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isMain?: boolean;
  totalStudents?: number;
}

interface ViewCampusModalProps {
  campus: Campus | null | undefined;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export default function ViewCampusModal({
  campus,
  open,
  onOpenChange,
  showTrigger = true,
}: ViewCampusModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;

  const dialogOpen = isControlled ? open : internalOpen;

  const setDialogOpen = isControlled
    ? onOpenChange ?? (() => {})
    : setInternalOpen;

  if (!campus) {
    return null;
  }

  const totalStudents = campus.totalStudents ?? 0;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="View campus"
            aria-label={`View ${campus.name}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="truncate text-xl">
                {campus.name}
              </DialogTitle>

              <DialogDescription>
                Campus information and details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Campus information */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Campus Name */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campus Name
              </p>

              <p className="font-medium">
                {campus.name || 'Not provided'}
              </p>
            </div>

            {/* Campus Code */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campus Code
              </p>

              <p className="font-medium">
                {campus.code || 'Not provided'}
              </p>
            </div>
          </div>

          {/* Contact information */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Phone */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Phone
                </p>
              </div>

              {campus.phone ? (
                <a
                  href={`tel:${campus.phone}`}
                  className="font-medium hover:underline"
                >
                  {campus.phone}
                </a>
              ) : (
                <p className="text-muted-foreground">
                  Not provided
                </p>
              )}
            </div>

            {/* Email */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
              </div>

              {campus.email ? (
                <a
                  href={`mailto:${campus.email}`}
                  className="break-all font-medium hover:underline"
                >
                  {campus.email}
                </a>
              ) : (
                <p className="text-muted-foreground">
                  Not provided
                </p>
              )}
            </div>
          </div>

          {/* Location and type */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Address */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Address
                </p>
              </div>

              <p className="font-medium">
                {campus.address || 'Not provided'}
              </p>
            </div>

            {/* Campus Type */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Campus Type
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {campus.isMain
                    ? 'Main Campus'
                    : 'Branch Campus'}
                </p>

                {campus.isMain && (
                  <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-semibold text-purple">
                    Main
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Campus statistics */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Campus ID */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Campus ID
                </p>
              </div>

              <p className="font-mono font-medium">
                {campus.id}
              </p>
            </div>

            {/* Total Students */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />

                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Students
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold">
                  {totalStudents}
                </p>

                <span className="text-sm text-muted-foreground">
                  {totalStudents === 1 ? 'student' : 'students'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
