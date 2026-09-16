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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong className="font-semibold">{name}</strong>? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <fetcher.Form method="post">
            <input type="hidden" name="_method" value="DELETE" />
            <input type="hidden" name="id" value={id} />
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
