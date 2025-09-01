import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onClose: () => void;
  form: {
    firstName: string;
    lastName: string;
    title?: string;
    email: string;
    linkedinUrl: string;
    notes: string;
    company?: string;
    phone?: string;
    status?: string;
    location?: string;
    industry?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    avatarUrl?: string;
    tags?: string; // comma or pipe separated
    birthday?: string; // YYYY-MM-DD
  };
  setForm: (f: any) => void;
  onSubmit: () => Promise<void> | void;
  submitting?: boolean;
};

export default function AddContactDialog({ open, onClose, form, setForm, onSubmit, submitting }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg bg-card p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Neuen Kontakt hinzufügen</h3>
          <button onClick={onClose} aria-label="Schliessen" className="rounded-md px-2 py-1 hover:bg-accent">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">Vorname</Label>
            <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Input id="status" value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="z.B. Lead, Kontakt, Kunde" />
          </div>
          <div>
            <Label htmlFor="industry">Branche</Label>
            <Input id="industry" value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="z.B. IT" />
          </div>
          <div>
            <Label htmlFor="location">Ort</Label>
            <Input id="location" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="z.B. Zürich" />
          </div>
          <div>
            <Label htmlFor="lastName">Nachname</Label>
            <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input id="title" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z.B. CTO" />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="company">Firma</Label>
            <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="websiteUrl">Website</Label>
            <Input id="websiteUrl" value={form.websiteUrl ?? ''} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="twitterUrl">Twitter</Label>
            <Input id="twitterUrl" value={form.twitterUrl ?? ''} onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="githubUrl">GitHub</Label>
            <Input id="githubUrl" value={form.githubUrl ?? ''} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" value={form.avatarUrl ?? ''} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notizen</Label>
            <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <Label htmlFor="birthday">Geburtstag</Label>
            <Input id="birthday" type="date" value={form.birthday ?? ''} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="tags">Tags (Komma oder |)</Label>
            <Input id="tags" value={form.tags ?? ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="z.B. Kunde, A-Score" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={() => onSubmit()} disabled={submitting}> {submitting ? "Speichere…" : "Speichern"} </Button>
        </div>
      </div>
    </div>
  );
}
