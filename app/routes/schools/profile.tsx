import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router';
import { Building2, Plus, MapPin, Phone } from 'lucide-react';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import type SchoolService from 'workers/services/school';

export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as { school: SchoolService };
  const schools = await services.school.getAll();
  return { schools };
}

export default function SchoolsListPage() {
  const { schools } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schools"
        description="Manage all registered schools"
        actions={
          <Button asChild className="bg-primary-gradient text-white flex items-center gap-2">
            <Link to="/schools/new">
              <Plus size={18} />
              <span className="font-medium">Add School</span>
            </Link>
          </Button>
        }
      />

      {schools.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No schools yet</h3>
              <p className="text-muted-foreground mt-1">
                Get started by adding your first school
              </p>
            </div>
            <Button asChild className="bg-primary-gradient text-white mt-2">
              <Link to="/schools/new">
                <Plus size={16} className="mr-2" />
                Add First School
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((s) => (
            <Link key={s.id} to={`/schools/${s.id}`}>
              <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  {/* <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    {s.registrationNumber && (
                      <p className="text-xs text-muted-foreground">
                        {s.registrationNumber}
                      </p>
                    )}
                  </div> */}
                </div>

                {s.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin size={14} />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone size={14} />
                    <span>{s.phone}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}