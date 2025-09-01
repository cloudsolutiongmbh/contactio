import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@contactio/backend/convex/_generated/api";
import type { Id } from "@contactio/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact/$id")({
  component: ContactDetailRoute,
});

function ContactDetailRoute() {
  const { id } = Route.useParams();
  const contact = useQuery(api.contacts.get, { id: id as Id<"contacts"> });
  const update = useMutation(api.contacts.update);
  const remove = useMutation(api.contacts.remove);
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});

  useEffect(() => {
    if (contact && !editing) {
      setDraft({ ...contact });
    }
  }, [contact, editing]);

  const disableSave = useMemo(() => {
    const d = draft || {};
    return !d.firstName?.trim?.() || !d.lastName?.trim?.() || !d.email?.trim?.();
  }, [draft]);

  const onSave = async () => {
    try {
      const payload: any = pickEditable(draft);
      await update({ id: id as Id<"contacts">, ...payload });
      setEditing(false);
      toast.success("Gespeichert");
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Speichern");
    }
  };

  const onDelete = async () => {
    try {
      await remove({ id: id as Id<"contacts"> });
      toast.success("Kontakt gelöscht");
      navigate({ to: "/" as any });
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Löschen");
    }
  };

  if (contact === undefined) return <div className="p-6 text-sm text-muted-foreground">Lade…</div>;
  if (contact === null) return <div className="p-6 text-sm text-muted-foreground">Kontakt nicht gefunden.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {contact.avatarUrl ? (
            <img src={contact.avatarUrl} alt="Avatar" className="h-14 w-14 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-medium">
              {initials(contact.firstName, contact.lastName)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[contact.title, contact.company].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
              <Button onClick={onSave} disabled={disableSave}>Speichern</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
              <Button variant="destructive" onClick={onDelete}>Löschen</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="rounded-lg border p-4 md:col-span-2">
          <h2 className="mb-3 font-medium">Stammdaten</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vorname" value={contact.firstName} editing={editing} onChange={(v) => setDraft({ ...draft, firstName: v })} />
            <Field label="Nachname" value={contact.lastName} editing={editing} onChange={(v) => setDraft({ ...draft, lastName: v })} />
            <Field label="E-Mail" value={contact.email} editing={editing} onChange={(v) => setDraft({ ...draft, email: v })} />
            <Field label="Telefon (primär)" value={contact.phone ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Field label="Firma" value={contact.company ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, company: v })} />
            <Field label="Titel" value={contact.title ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, title: v })} />
            <Field label="Status" value={contact.status ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, status: v })} />
            <Field label="Ort" value={contact.location ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, location: v })} />
            <Field label="Branche" value={contact.industry ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, industry: v })} />
            <Field label="Geburtstag" value={contact.birthday ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, birthday: v })} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Weitere Telefone (eine pro Zeile, optionales Label mit ":")</Label>
              {editing ? (
                <textarea
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={formatLabelValueLines(draft.phones ?? contact.phones)}
                  onChange={(e) => setDraft({ ...draft, phones: parseLabelValueLines(e.target.value) })}
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatLabelValueLines(contact.phones) || "—"}
                </p>
              )}
            </div>
            <div>
              <Label>Weitere E-Mails (eine pro Zeile, optionales Label mit ":")</Label>
              {editing ? (
                <textarea
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={formatLabelValueLines(draft.emailsExtra ?? contact.emailsExtra)}
                  onChange={(e) => setDraft({ ...draft, emailsExtra: parseLabelValueLines(e.target.value) })}
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatLabelValueLines(contact.emailsExtra) || "—"}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Label>Notizen</Label>
            {editing ? (
              <textarea className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm" rows={5} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes || "—"}</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Kontakt & Social</h2>
          <Field label="LinkedIn" value={contact.linkedinUrl} editing={editing} onChange={(v) => setDraft({ ...draft, linkedinUrl: v })} />
          <Field label="Website" value={contact.websiteUrl ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, websiteUrl: v })} />
          <Field label="Twitter" value={contact.twitterUrl ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, twitterUrl: v })} />
          <Field label="GitHub" value={contact.githubUrl ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, githubUrl: v })} />
          <Field label="Avatar URL" value={contact.avatarUrl ?? ""} editing={editing} onChange={(v) => setDraft({ ...draft, avatarUrl: v })} />
          <div className="mt-4">
            <Label>Tags (Kommagetrennt)</Label>
            {editing ? (
              <Input className="mt-1" value={(draft.tags ?? contact.tags ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{(contact.tags ?? []).join(", ") || "—"}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <Input className="mt-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="mt-1 text-sm text-muted-foreground">{value || "—"}</div>
      )}
    </div>
  );
}

function initials(first: string, last: string) {
  const f = (first?.[0] ?? '').toUpperCase();
  const l = (last?.[0] ?? '').toUpperCase();
  return `${f}${l}` || 'C';
}

function parseLabelValueLines(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const idx = l.indexOf(":");
    if (idx > 0) return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
    return { value: l };
  });
}

function formatLabelValueLines(arr?: Array<{ label?: string; value: string }>) {
  if (!arr || arr.length === 0) return "";
  return arr.map((p) => (p.label ? `${p.label}: ${p.value}` : p.value)).join("\n");
}

function pickEditable(d: any) {
  const keys = [
    'firstName', 'lastName', 'email', 'linkedinUrl', 'notes', 'company', 'phone', 'title',
    'phones', 'emailsExtra', 'addresses', 'avatarUrl', 'websiteUrl', 'twitterUrl', 'githubUrl', 'tags', 'birthday', 'lastContactedAt'
  ];
  const out: any = {};
  for (const k of keys) if (k in (d ?? {})) out[k] = (d as any)[k];
  return out;
}
