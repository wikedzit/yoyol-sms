// app/components/DeleteButton.tsx
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

export const DeleteButton = ({
  id,
  name,
  fetcher: externalFetcher,
  action,
  entityName = 'item',
  entityType,
}: {
  id: string | number;
  name: string;
  fetcher?: any;
  action?: string;
  entityName?: string;
  entityType?: string;
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
          <AlertDialogTitle>{t('delete')} {entityName}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteConfirmation')}{' '}
            <strong className="font-semibold">{name}</strong>? This action
            {t('cannotUndo')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>

          <fetcher.Form method="post" action={action}>
            <input type="hidden" name="_method" value="DELETE" />
            <input type="hidden" name="id" value={id} />
            {entityType && (
              <input type="hidden" name="_entity" value={entityType} />
            )}
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
