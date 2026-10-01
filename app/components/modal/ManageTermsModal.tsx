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
import type { FetcherWithComponents } from 'react-router';

interface Term {
  id: number;
  academicYearId: number;
  name: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface AcademicYear {
  id: string | number;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  terms?: Term[];
}

interface ManageTermsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  year: AcademicYear | null;
}

export default function ManageTermsModal({
  open,
  setOpen,
  fetcher,
  year,
}: ManageTermsModalProps) {
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

  // Sync state when incoming academic year updates or modal opens
  useEffect(() => {
    if (year && open) {
      setTerms(year.terms || []);
      setNewTerm((prev) => ({ ...prev, termNumber: (year.terms?.length || 0) + 1 }));
      setError(null);
    }
  }, [year, open]);

  // Handle fetcher responses
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
  }, [fetcher.state, fetcher.data, terms.length]);

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
          flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-1">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Terms &mdash; {year.name}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {year.startDate} &ndash; {year.endDate}
          </p>

          {/* STATUS NOTICES */}
          {!isActiveYear && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This year isn&apos;t active yet. Once its start date arrives, it
                will become the active year automatically, and its terms will
                take over as the current term based on their own dates.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* SCROLLABLE TERMS LIST */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-3">
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
                    <div key={term.id} className="border border-border rounded-md p-3 space-y-2 bg-background">
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
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="hover:scale-105 transition cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => submitEdit(term.id)}
                          className="hover:scale-105 transition cursor-pointer"
                        >
                          <Check className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={term.id}
                      className="flex items-center justify-between border border-border rounded-md p-3 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{term.name}</p>
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
                          className="hover:scale-105 transition cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTerm(term.id)}
                          className="hover:scale-105 transition cursor-pointer text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                )
            )}

            {/* ADD TERM FORM OR TRIGGER BUTTON */}
            {showAddForm ? (
              <div className="border border-border rounded-md p-3 space-y-2 bg-muted/30">
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
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                    className="hover:scale-105 transition cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={submitCreate}
                    className="hover:scale-105 transition cursor-pointer"
                  >
                    {fetcher.state === 'submitting' ? 'Adding...' : 'Add Term'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full hover:scale-105 transition cursor-pointer border-dashed"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Term
              </Button>
            )}
          </div>

          {/* STICKY FOOTER */}
          <div className="flex justify-end border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-8 rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}