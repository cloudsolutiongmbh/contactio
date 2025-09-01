import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useQuery, useMutation, useAction } from "convex/react";
import { api } from "@contactio/backend/convex/_generated/api";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  const { user } = useUser();
  const tenantId = useMemo(() => (user?.id ? `user:${user.id}` : undefined), [user?.id]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [exportFormat, setExportFormat] = useState("csv");

  // Schritt 2: Microsoft 365 Integrationen
  const [groupScopeInput, setGroupScopeInput] = useState("");
  const [busyMailbox, setBusyMailbox] = useState<string | null>(null);
  const consent = useQuery(api.subscriptions.getConsentUrl, {});
  const subs = useQuery(api.subscriptions.listSubscriptions, {});
  const putSettings = useMutation(api.settings.put);
  const listMailboxesAction = useAction(api.subscriptions.listMailboxes);
  const enableMailboxAction = useAction(api.subscriptions.enableMailbox);
  const disableMailboxAction = useAction(api.subscriptions.disableMailbox);
  const runDelta = useAction(api.subscriptions.deltaSyncMailbox);
  const [mailboxes, setMailboxes] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const list = await listMailboxesAction({});
        setMailboxes(list as any[]);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [listMailboxesAction]);

  const handleExportData = () => {
    toast.success("Datenexport wird vorbereitet...");
  };

  const handleSaveGroupScope = async () => {
    if (!tenantId) return;
    try {
      await putSettings({ tenantId, groupScope: groupScopeInput });
      toast.success("GroupScope gespeichert");
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler beim Speichern");
    }
  };

  const handleToggleMailbox = async (
    item: { id: string; address: string; displayName?: string | null; mailboxId?: string | null; enabled: boolean },
    next: boolean,
  ) => {
    try {
      setBusyMailbox(item.id);
      if (next) {
        await enableMailboxAction({ userId: item.id, address: item.address, displayName: item.displayName ?? undefined });
        toast.success(`${item.address} aktiviert`);
      } else {
        if (!item.mailboxId) {
          toast.info("Mailbox ist nicht registriert");
        } else {
          await disableMailboxAction({ mailboxId: item.mailboxId as any });
          toast.success(`${item.address} deaktiviert`);
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Fehler bei Aktion");
    } finally {
      setBusyMailbox(null);
    }
  };

  const handleDelta = async (mailboxId: string) => {
    try {
      await runDelta({ mailboxId: mailboxId as any });
      toast.success("Delta-Sync gestartet");
    } catch (e: any) {
      toast.error(e?.message ?? "Delta-Sync fehlgeschlagen");
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Diese Funktion ist noch nicht verfügbar");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Authenticated>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Einstellungen</h1>
            <p className="text-muted-foreground">
              Verwalte deine Konto- und Anwendungseinstellungen
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>
                Deine persönlichen Informationen und Kontodetails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Benutzer</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.fullName || user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
                <UserButton />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    placeholder={user?.firstName || "Vorname"}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    placeholder={user?.lastName || "Nachname"}
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={user?.primaryEmailAddress?.emailAddress || "email@beispiel.de"}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Microsoft 365</CardTitle>
              <CardDescription>
                Verbinde ein Postfach und aktiviere Webhooks (Schritt 2)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Admin-Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Öffne die Microsoft-Adminfreigabe und bestätige Berechtigungen
                  </p>
                </div>
                <Button asChild variant="outline">
                  <a href={consent?.url ?? "#"} target="_blank" rel="noreferrer">
                    Mit Microsoft verbinden
                  </a>
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Group Scope (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Microsoft 365 Gruppen-ID für Mitglieds-Postfächer
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="group-id"
                    value={groupScopeInput}
                    onChange={(e) => setGroupScopeInput(e.target.value)}
                  />
                  <Button onClick={handleSaveGroupScope} variant="outline">
                    Speichern
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Postfächer</Label>
                  <span className="text-xs text-muted-foreground">
                    {mailboxes ? mailboxes.length : 0} gefunden
                  </span>
                </div>
                <div className="space-y-2">
                  {(mailboxes ?? []).map((m) => {
                    const sub = (subs ?? []).find((s) => s.mailboxId === (m as any).mailboxId);
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="space-y-0.5">
                          <div className="font-medium">{m.displayName || m.address}</div>
                          <div className="text-xs text-muted-foreground">{m.address}</div>
                          {sub && (
                            <div className="text-xs text-muted-foreground">
                              Abo bis {new Date(sub.expiresAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(m as any).mailboxId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelta((m as any).mailboxId)}
                            >
                              Delta-Sync
                            </Button>
                          )}
                          <Switch
                            checked={!!(m as any).enabled}
                            disabled={busyMailbox === m.id}
                            onCheckedChange={(next) => handleToggleMailbox(m as any, next)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benachrichtigungen</CardTitle>
              <CardDescription>
                Konfiguriere, wie du über Updates informiert werden möchtest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>E-Mail-Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">
                    Erhalte E-Mails über wichtige Updates und Aktivitäten
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Darstellung</CardTitle>
              <CardDescription>
                Passe das Aussehen der Anwendung an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dunkler Modus</Label>
                  <p className="text-sm text-muted-foreground">
                    Verwende ein dunkles Farbschema
                  </p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daten & Backup</CardTitle>
              <CardDescription>
                Verwalte deine Daten und Backup-Einstellungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Automatisches Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Erstelle automatisch Backups deiner Kontakte
                  </p>
                </div>
                <Switch
                  checked={autoBackup}
                  onCheckedChange={setAutoBackup}
                />
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Daten exportieren</Label>
                  <p className="text-sm text-muted-foreground">
                    Lade alle deine Kontakte herunter
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleExportData} variant="outline">
                      Als CSV exportieren
                    </Button>
                    <Button onClick={handleExportData} variant="outline">
                      Als JSON exportieren
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Gefahrenbereich</CardTitle>
              <CardDescription>
                Irreversible Aktionen für dein Konto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Konto löschen</Label>
                <p className="text-sm text-muted-foreground">
                  Lösche dein Konto permanent. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="mt-2"
                >
                  Konto löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Bitte anmelden, um die Einstellungen zu sehen.
        </div>
      </Unauthenticated>
    </div>
  );
}
