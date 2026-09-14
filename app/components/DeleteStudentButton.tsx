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
}: {
  id: string;
  name: string;
  fetcher?: any;
}) => {
  const fetcher = externalFetcher || useFetcher();
  const { t } = useLanguage();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
          title={t('delete')}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmation')}{' '}
            <strong className="font-semibold">{name}</strong>?{' '}
            {t('cannotUndo')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>

          <fetcher.Form method="post" className="w-full">
            <input type="hidden" name="_method" value="DELETE" />
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction
              type="submit"
              className="w-full bg-red-500 text-white hover:bg-red-600"
            >
              {fetcher.state === 'submitting' ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </fetcher.Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};