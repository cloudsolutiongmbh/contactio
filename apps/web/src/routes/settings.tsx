import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  const { user } = useUser();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [exportFormat, setExportFormat] = useState("csv");

  const handleExportData = () => {
    toast.success("Datenexport wird vorbereitet...");
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