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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-red-500 hover:text-red-700 transition cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {entityName}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong className="font-semibold">{name}</strong>? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

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
              {fetcher.state === 'submitting' ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </fetcher.Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

