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
import { useLanguage } from "~/lib/i18n";

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
  const { t } = useLanguage();
  const isLoggingOut =
    navigation.state === "submitting" &&
    Boolean(navigation.formAction?.includes("/logout"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('logOutQuestion')}</DialogTitle>
          <DialogDescription>
            {t('logoutDescription')}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="cursor-pointer">
              {t('cancel')}
            </Button>
          </DialogClose>
          <Form method="post" action="/logout">
            <Button
              type="submit"
              variant="destructive"
              className="cursor-pointer"
            >
              {isLoggingOut ? t('loggingOut') : t('logOut')}
            </Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
