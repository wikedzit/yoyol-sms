import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet';

import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import type { Form, LevelType } from '~/type/shools';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Partial<Form>) => void;
  form?: Form;
  levelType: LevelType;
  streamId: string;
  existingForms: number[];
}

export function AddFormModal({
  isOpen,
  onClose,
  onSave,
  form,
  levelType,
  streamId,
  existingForms,
}: FormModalProps) {
  const [number, setNumber] = useState<number | undefined>();

  const availableForms =
    levelType === 'o-level'
      ? [1, 2, 3, 4].filter(
          (n) => !existingForms.includes(n) || form?.number === n
        )
      : [5, 6].filter((n) => !existingForms.includes(n) || form?.number === n);

  useEffect(() => {
    if (form) {
      setNumber(form.number);
    } else {
      setNumber(availableForms[0]);
    }
  }, [form, isOpen]);

  const handleSave = () => {
    if (number) {
      onSave({
        id: form?.id,
        name: `Form ${number}`,
        number,
        streamId,
      });
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full              /* Mobile full-screen */
          sm:max-w-[90%]                 /* Tablet */
          md:max-w-[573px] md:w-[573px]  /* Desktop fixed width */
          p-6 md:p-10
          flex flex-col justify-between
        "
      >
        <SheetHeader>
          <SheetTitle>{form ? 'Edit Form' : 'Add New Form'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-number">Form</Label>
            <Select
              value={number?.toString()}
              onValueChange={(val) => setNumber(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {availableForms.map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    Form {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableForms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              All forms have been added to this stream.
            </p>
          )}
        </div>

        <SheetFooter>
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white">
            <Button
              variant="outline"
              onClick={onClose}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!number || availableForms.length === 0}
              className="bg-primary-gradient text-white py-2 px-10 rounded-[8px] w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              {form ? 'Save Changes' : 'Add Form'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
