import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@contactio/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddContactDialog from "@/components/add-contact-dialog";
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useOrganization, useUser } from "@clerk/clerk-react";

export const Route = createFileRoute("/contacts")({
  component: ContactsComponent,
});

function ContactsComponent() {
  const tenancyEnabled = (import.meta as any).env?.VITE_TENANCY_ENABLED === '1';
  const { organization } = useOrganization();
  const { user } = useUser();
  const tenantId = organization?.id ?? (user ? `user:${user.id}` : undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<'newest'|'alphabetical'>('newest');
  const [status, setStatus] = useState<string>('Alle');
  const [location, setLocation] = useState<string>('Alle');
  const [industry, setIndustry] = useState<string>('Alle');

  const listArgsAll: any = tenancyEnabled ? { search, tenantId } : { search };
  const listArgs: any = tenancyEnabled ? { search, sort, status, location, industry, tenantId } : { search, sort, status, location, industry };
  const contactsAll = useQuery(api.contacts.list, listArgsAll);
  const contacts = useQuery(api.contacts.list, listArgs);
  const createContact = useMutation(api.contacts.create);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    linkedinUrl: "",
    notes: "",
    company: "",
    phone: "",
    status: "Kontakt",
    location: "",
    industry: "",
    websiteUrl: "",
    twitterUrl: "",
    githubUrl: "",
    avatarUrl: "",
    tags: "",
    birthday: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const disableSave = useMemo(() => !form.firstName.trim() || !form.lastName.trim() || !form.email.trim(), [form]);

  const onSubmit = async () => {
    if (disableSave) return;
    try {
      setSubmitting(true);
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        title: form.title?.trim() || undefined,
        email: form.email,
        linkedinUrl: form.linkedinUrl.trim(),
        notes: form.notes,
        company: form.company?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        status: form.status?.trim() || undefined,
        location: form.location?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        websiteUrl: form.websiteUrl?.trim() || undefined,
        twitterUrl: form.twitterUrl?.trim() || undefined,
        githubUrl: form.githubUrl?.trim() || undefined,
        avatarUrl: form.avatarUrl?.trim() || undefined,
        tags: form.tags ? form.tags.split(/[,|]/).map((s)=>s.trim()).filter(Boolean) : undefined,
        birthday: form.birthday || undefined,
      };
      if (tenancyEnabled && tenantId) payload.tenantId = tenantId;
      await createContact(payload);
      setOpen(false);
      setForm({ firstName: "", lastName: "", title: "", email: "", linkedinUrl: "", notes: "", company: "", phone: "", status: "Kontakt", location: "", industry: "", websiteUrl: "", twitterUrl: "", githubUrl: "", avatarUrl: "", tags: "", birthday: "" });
      toast.success("Kontakt gespeichert");
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Speichern");
    } finally {
      setSubmitting(false);
    }
  };

  const onExportCsv = () => {
    const rows = contacts ?? [];
    if (!rows || rows.length === 0) {
      toast.info("Keine Kontakte zum Exportieren");
      return;
    }
    download('contacts.csv', toCsv(rows));
  };

  const onImportCsv = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    const count = await importRows(rows, createContact);
    toast.success(`${count} Kontakte importiert`);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <Authenticated>
        <div className="mb-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3">
            <Input className="max-w-xl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button onClick={onExportCsv}>Export CSV</Button>
            <input id="csvInput" type="file" accept=".csv" className="hidden" onChange={onImportCsv} />
            <Button onClick={() => document.getElementById('csvInput')?.click()}>Import CSV</Button>
            <Button onClick={() => setOpen(true)}>Neuer Kontakt</Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-md border px-2 py-1 text-sm bg-background">
              <option value="newest">Neueste</option>
              <option value="alphabetical">Alphabetisch</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-background">
              {['Alle','Lead','Kontakt','Kunde','Partner','Archiv'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ort</span>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-background">
              {['Alle', ...(uniqueFrom(contactsAll, 'location'))].map((s) => (
                <option key={s} value={s}>{s || '—'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Branche</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-background">
              {['Alle', ...(uniqueFrom(contactsAll, 'industry'))].map((s) => (
                <option key={s} value={s}>{s || '—'}</option>
              ))}
            </select>
          </div>
        </div>

        {contacts === undefined ? (
          <p className="text-sm text-muted-foreground">Lade...</p>
        ) : contacts.length === 0 ? (
          <div className="rounded-lg border p-10 text-center text-sm text-muted-foreground">
            <p className="mb-4">Noch keine Kontakte vorhanden.</p>
            <Button onClick={() => setOpen(true)}>Neuer Kontakt</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contacts.map((c: any) => (
              <div key={c._id} role="button" onClick={() => navigate({ to: "/contact/$id" as any, params: { id: c._id } as any })} className="rounded-lg border p-3 hover:bg-accent/50 cursor-pointer">
                <div className="mb-2 flex items-center gap-3">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="Avatar" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-medium">
                      {initials(c.firstName, c.lastName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.firstName} {c.lastName}</div>
                    <div className="text-xs text-muted-foreground truncate">{[c.title, c.company].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.email}</div>
              </div>
            ))}
          </div>
        )}

        <AddContactDialog open={open} onClose={() => setOpen(false)} form={form as any} setForm={setForm} onSubmit={onSubmit} submitting={submitting} />
      </Authenticated>

      <Unauthenticated>
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">Bitte anmelden, um Kontakte zu sehen.</div>
      </Unauthenticated>
    </div>
  );
}

function initials(first: string, last: string) {
  const f = (first?.[0] ?? '').toUpperCase();
  const l = (last?.[0] ?? '').toUpperCase();
  return `${f}${l}` || 'C';
}

function uniqueFrom(list: any[] | undefined, key: string): string[] {
  if (!list) return [];
  const set = new Set<string>();
  for (const c of list) {
    const v = (c?.[key] ?? '').toString();
    if (v) set.add(v);
  }
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function toCsv(rows: any[]): string {
  const headers = [
    'firstName','lastName','email','company','title','phone','linkedinUrl','notes','tags','location','industry','websiteUrl','twitterUrl','githubUrl','avatarUrl'
  ];
  const escape = (val: any) => {
    const s = (val ?? '').toString();
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const c of rows) {
    const tags = (c.tags ?? []).join('|');
    const row = [
      c.firstName,c.lastName,c.email,c.company ?? '',c.title ?? '',c.phone ?? '',c.linkedinUrl ?? '',c.notes ?? '',tags,
      c.location ?? '',c.industry ?? '',c.websiteUrl ?? '',c.twitterUrl ?? '',c.githubUrl ?? '',c.avatarUrl ?? ''
    ].map(escape).join(',');
    lines.push(row);
  }
  return lines.join('\n');
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): any[] {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  const out: any[] = [];
  for (let i=1;i<lines.length;i++){
    const parts = splitCsvLine(lines[i]);
    const row: any = {};
    headers.forEach((h,idx)=>{ row[h] = parts[idx] ?? '' });
    out.push(row);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (inQuotes){
      if (ch === '"'){
        if (line[i+1] === '"'){ cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === ','){ res.push(cur); cur=''; }
      else if (ch === '"'){ inQuotes = true; }
      else { cur += ch; }
    }
  }
  res.push(cur);
  return res.map(s=>s.trim());
}

async function importRows(rows: any[], create: any) {
  let count = 0;
  for (const r of rows) {
    const payload: any = {
      firstName: r.firstName || r.vorname || '',
      lastName: r.lastName || r.nachname || '',
      email: r.email || '',
      company: r.company || r.firma || undefined,
      title: r.title || undefined,
      phone: r.phone || undefined,
      linkedinUrl: r.linkedinUrl || r.linkedin || '',
      notes: r.notes || '',
      location: r.location || r.ort || undefined,
      industry: r.industry || r.branche || undefined,
      websiteUrl: r.websiteUrl || undefined,
      twitterUrl: r.twitterUrl || undefined,
      githubUrl: r.githubUrl || undefined,
      avatarUrl: r.avatarUrl || undefined,
      tags: (r.tags || '').split(/[,|]/).map((s:string)=>s.trim()).filter(Boolean),
    };
    if (!payload.firstName || !payload.lastName || !payload.email) continue;
    await create(payload);
    count++;
  }
  return count;
}