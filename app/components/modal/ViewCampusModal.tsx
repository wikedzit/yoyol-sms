import { Eye, MapPin, Hash, Building2 } from 'lucide-react';
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

interface ViewCampusModalProps {
  campus: any;
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
    ? onOpenChange!
    : setInternalOpen;

  if (!campus) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="View campus"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{campus.name}</DialogTitle>
          <DialogDescription>
            Campus details
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="grid gap-4 text-sm">
            <div>
              <p className="font-medium">Campus Name</p>
              <p className="text-muted-foreground">
                {campus.name || 'Not provided'}
              </p>
            </div>

            <div>
              <p className="font-medium">Campus Code</p>
              <p className="text-muted-foreground">
                {campus.code || 'Not provided'}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="font-medium">Address</p>
                <p className="text-muted-foreground">
                  {campus.address || 'Not provided'}
                </p>
              </div>
            </div>

            <div>
              <p className="font-medium">Campus Type</p>
              <p className="text-muted-foreground">
                {campus.isMain ? 'Main Campus' : 'Branch Campus'}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="font-medium">Campus ID</p>
                <p className="text-muted-foreground">
                  {campus.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}