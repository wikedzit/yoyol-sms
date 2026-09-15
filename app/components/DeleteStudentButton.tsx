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
import { Button } from '~/components/ui/button';

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
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted transition-colors h-8 w-8"
          title={t('delete')}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500 transition-colors" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="w-[95vw] max-w-md p-4 sm:p-6 rounded-lg">
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