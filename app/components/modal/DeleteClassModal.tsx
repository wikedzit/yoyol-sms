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
import { X } from 'lucide-react';
import { useFetcher } from 'react-router';

export const DeleteClassButton = ({
  id,
  name,
  fetcher: externalFetcher,
}: {
  id: string;
  name: string;
  fetcher?: any;
}) => {
  const fetcher = externalFetcher || useFetcher(); // use parent's fetcher if passed in

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="absolute top-3 right-3 text-white bg-red-500 rounded-full p-1 hover:scale-110 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This action
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
