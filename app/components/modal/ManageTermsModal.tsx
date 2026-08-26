import { X, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';

type Term = {
  id: number;
  academicYearId: number;
  name: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export default function ManageTermsModal({
  open,
  setOpen,
  fetcher,
  year,
}: any) {
  const [terms, setTerms] = useState<Term[]>(year?.terms || []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    termNumber: 1,
    startDate: '',
    endDate: '',
  });
  const [newTerm, setNewTerm] = useState({
    name: '',
    termNumber: (year?.terms?.length || 0) + 1,
    startDate: '',
    endDate: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAction = useState<{ current: string | null }>({ current: null })[0];

  useEffect(() => {
    setTerms(year?.terms || []);
    setNewTerm((prev) => ({ ...prev, termNumber: (year?.terms?.length || 0) + 1 }));
  }, [year]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.success) {
        setError(null);
        if (data.action === 'term_create' && data.term) {
          setTerms((prev) => [...prev, data.term]);
          setShowAddForm(false);
          setNewTerm({ name: '', termNumber: terms.length + 2, startDate: '', endDate: '' });
        }
        if (data.action === 'term_update' && data.term) {
          setTerms((prev) => prev.map((t) => (t.id === data.term.id ? data.term : t)));
          setEditingId(null);
        }
        if (data.action === 'term_set_current' && data.term) {
          setTerms((prev) =>
            prev.map((t) => ({ ...t, isCurrent: t.id === data.term.id }))
          );
        }
        if (data.action === 'term_delete') {
          setTerms((prev) => prev.filter((t) => t.id !== data.id));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  if (!year) return null;

  const isActiveYear = year.status === 'active';

  const submitCreate = () => {
    if (!newTerm.name || !newTerm.startDate || !newTerm.endDate) {
      setError('Please fill in the term name and dates.');
      return;
    }
    const fd = new FormData();
    fd.set('_method', 'POST');
    fd.set('action', 'term_create');
    fd.set('academicYearId', String(year.id));
    fd.set('name', newTerm.name);
    fd.set('termNumber', String(newTerm.termNumber));
    fd.set('startDate', newTerm.startDate);
    fd.set('endDate', newTerm.endDate);
    fetcher.submit(fd, { method: 'post', action: '/schools/academic-year' });
  };

  const startEdit = (term: Term) => {
    setEditingId(term.id);
    setEditForm({
      name: term.name,
      termNumber: term.termNumber,
      startDate: term.startDate,
      endDate: term.endDate,
    });
  };

  const submitEdit = (id: number) => {
    const fd = new FormData();
    fd.set('_method', 'PUT');
    fd.set('action', 'term_update');
    fd.set('id', String(id));
    fd.set('name', editForm.name);
    fd.set('termNumber', String(editForm.termNumber));
    fd.set('startDate', editForm.startDate);
    fd.set('endDate', editForm.endDate);
    fetcher.submit(fd, { method: 'post', action: '/schools/academic-year' });
  };

  const deleteTerm = (id: number) => {
    const fd = new FormData();
    fd.set('_method', 'DELETE');
    fd.set('action', 'term_delete');
    fd.set('id', String(id));
    fetcher.submit(fd, { method: 'post', action: '/schools/academic-year' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[620px] md:w-[620px]
          p-6 md:p-10
          flex flex-col
        "
      >
        <div className="flex justify-between items-center mb-2">
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl md:text-2xl font-semibold">
              Terms &mdash; {year.name}
            </SheetTitle>
          </SheetHeader>
          <SheetClose asChild className="cursor-pointer">
            <X size={25} />
          </SheetClose>
        </div>
        <p className="text-sm text-[#898989] mb-6">
          {year.startDate} &ndash; {year.endDate}
        </p>

        {!isActiveYear && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              This year isn&apos;t active yet. Once its start date arrives, it
              will become the active year automatically, and its terms will
              take over as the current term based on their own dates.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {terms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No terms yet for this academic year.
            </p>
          ) : (
            terms
              .slice()
              .sort((a, b) => a.termNumber - b.termNumber)
              .map((term) =>
                editingId === term.id ? (
                  <div key={term.id} className="border rounded-md p-3 space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Term name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, startDate: e.target.value })
                        }
                      />
                      <Input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, endDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={() => submitEdit(term.id)}>
                        <Check className="h-4 w-4" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={term.id}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{term.name}</p>
                        {term.isCurrent && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {term.startDate} &ndash; {term.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(term)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTerm(term.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )
              )
          )}

          {showAddForm ? (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <Input
                placeholder="Term name (e.g. Term 1)"
                value={newTerm.name}
                onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={newTerm.startDate}
                  onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  value={newTerm.endDate}
                  onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={submitCreate}>
                  {fetcher.state === 'submitting' ? 'Adding...' : 'Add Term'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" /> Add Term
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
