// app/components/DeleteSchoolButton.tsx
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
import { Button } from '~/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useFetcher } from 'react-router-dom';

export const DeleteSchoolButton = ({
  id,
  name,
  fetcher: externalFetcher,
}: {
  id: number;
  name: string;
  fetcher?: any;
}) => {
  const fetcher = externalFetcher || useFetcher();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete School</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong className="font-semibold">{name}</strong>? This action
            cannot be undone and it will delete all its related data.
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