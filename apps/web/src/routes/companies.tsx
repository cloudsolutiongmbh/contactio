import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@contactio/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Building2, Users, MapPin, Briefcase } from "lucide-react";
import { useOrganization, useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/companies")({
  component: CompaniesComponent,
});

function CompaniesComponent() {
  const tenancyEnabled = (import.meta as any).env?.VITE_TENANCY_ENABLED === '1';
  const { organization } = useOrganization();
  const { user } = useUser();
  const tenantId = organization?.id ?? (user ? `user:${user.id}` : undefined);
  const [search, setSearch] = useState("");
  const listArgs: any = tenancyEnabled ? { search, tenantId } : { search };
  const companies = useQuery(api.companies.list, listArgs);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Authenticated>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Firmen</h1>
          <p className="text-muted-foreground">
            Alle Kontakte nach Unternehmen gruppiert
          </p>
        </div>

        <div className="mb-6">
          <div className="relative w-full max-w-xl">
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Firma oder Kontakt suchen..." 
            />
          </div>
        </div>

        {companies === undefined ? (
          <p className="text-sm text-muted-foreground">Lade...</p>
        ) : companies.length === 0 ? (
          <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="mb-4">Keine Firmen gefunden.</p>
            <Button onClick={() => navigate({ to: "/" })}>
              Neuen Kontakt hinzufügen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {companies.map((company: any) => (
              <Card key={company.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {company.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {company.contactCount}
                    </Badge>
                  </div>
                  
                  {(company.industries.length > 0 || company.locations.length > 0) && (
                    <CardDescription className="flex flex-wrap gap-2 mt-2">
                      {company.industries.map((industry: string) => (
                        <Badge key={industry} variant="outline" className="text-xs flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {industry}
                        </Badge>
                      ))}
                      {company.locations.map((location: string) => (
                        <Badge key={location} variant="outline" className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location}
                        </Badge>
                      ))}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Kontakte:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {company.contacts.slice(0, 6).map((contact: any) => (
                        <div
                          key={contact._id}
                          role="button"
                          onClick={() => navigate({ 
                            to: "/contact/$id" as any, 
                            params: { id: contact._id } as any 
                          })}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          {contact.avatarUrl ? (
                            <img 
                              src={contact.avatarUrl} 
                              alt="Avatar" 
                              className="h-6 w-6 rounded-full object-cover ring-1 ring-border" 
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-medium">
                              {initials(contact.firstName, contact.lastName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {contact.firstName} {contact.lastName}
                            </div>
                            {contact.title && (
                              <div className="text-xs text-muted-foreground truncate">
                                {contact.title}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {company.contacts.length > 6 && (
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          +{company.contacts.length - 6} weitere Kontakte
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Bitte anmelden, um Firmen zu sehen.
        </div>
      </Unauthenticated>
    </div>
  );
}

function initials(first: string, last: string) {
  const f = (first?.[0] ?? '').toUpperCase();
  const l = (last?.[0] ?? '').toUpperCase();
  return `${f}${l}` || 'C';
}
