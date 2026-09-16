import type { ReactNode } from "react";
import { Form, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type LogoutConfirmDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LogoutConfirmDialog({
  trigger,
  open,
  onOpenChange,
}: LogoutConfirmDialogProps) {
  const navigation = useNavigation();
  const isLoggingOut =
    navigation.state === "submitting" &&
    Boolean(navigation.formAction?.includes("/logout"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Log out?</DialogTitle>
          <DialogDescription>
            You will need to sign in again to access the dashboard.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <Form method="post" action="/logout">
            <Button
              type="submit"
              variant="destructive"
              className="cursor-pointer"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
