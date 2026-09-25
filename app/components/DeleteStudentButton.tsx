// app/components/DeleteStudentButton.tsx
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
import { Trash2 } from 'lucide-react';
import { useFetcher } from 'react-router-dom';
import { useLanguage } from '~/lib/i18n';

export const DeleteStudentButton = ({
  id,
  name,
  fetcher: externalFetcher,
  open,
  onOpenChange,
  showTrigger = true,
}: {
  id: string;
  name: string;
  fetcher?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) => {
  const fetcher = externalFetcher || useFetcher();
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </AlertDialogTrigger>
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmation')}{' '}
            <strong className="font-semibold">{name}</strong>? This action
            cannot be undone and it will delete all its related data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>

          <fetcher.Form method="post">
            <input type="hidden" name="_method" value="DELETE" />
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction
              type="submit"
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {fetcher.state === 'submitting' ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </fetcher.Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
