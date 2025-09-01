# Contactio MVP – Umsetzungsplan (Codebase-aligned)

Kurzfassung: Wir realisieren das MVP strikt entlang eurer bestehenden Architektur: React (Vite + TanStack Router) im Frontend, Convex als Backend/DB, Clerk für Auth. Microsoft 365 wird via Graph Webhooks + Delta eingebunden. Webhooks, Jobs und Cron laufen als Convex `httpEndpoint`/`action`/Scheduler. LLM-Aufrufe erfolgen gegen einen externen EU/CH‑konformen Endpoint. Redis, NestJS, Next.js und Postgres sind für das MVP nicht nötig. Wo die ursprüngliche Vision abweicht, „gewinnt“ eure aktuelle Codebasis – unten sind die Alternativen/Checks jeweils benannt.

In diesem Plan nennen wir pro Schritt: Ziel, Detaildesign, Codebase‑Impact (konkrete Änderungen/Erweiterungen), Checks/Entscheide (für Senior‑Review), und Akzeptanzkriterien.

—

## Schritt 1: Tenants, Rollen und Datenmodell konsolidieren

Ziel: Multi‑Tenant sauber abbilden, Rollen verankern, Kontakte auf Tenant‑Ebene statt nur User‑Ebene scopen; Basis für Policies/Settings/Proposals schaffen.

Detaildesign
- Tenant-Modell:
  - `tenants` Tabelle (Convex): `id`, `name`, `createdAt`.
  - `memberships` Tabelle: `tenantId`, `userId` (Clerk `subject`), `role` in {`owner`,`reviewer`,`viewer`}, `createdAt`.
  - Default: Erster registrierter Nutzer wird `owner` seines Default‑Tenants.
- Kontakte migrieren von User‑Scope auf Tenant‑Scope:
  - `contacts` um `tenantId` erweitern. `ownerId` bleibt für Ownership/ACL optional erhalten, aber alle Queries werden primär nach `tenantId` gefiltert.
  - Indexe: `by_tenant_lastName_firstName` und `by_tenant_createdAt`.
  - Migrationsstrategie: Für existierende Kontakte `tenantId` aus erstem Membership des Besitzers ableiten.
- Settings/Policies:
  - `tenantSettings`: `tenantId`, `ownedDomains` (eigene Domains), `doNotCapture` (Domains/Patterns), `defaultCountryHint`, `groupScope` (optionale M365‑Gruppe), `llmProvider`, `createdAt`,`updatedAt`.
  - `policies`: `tenantId`, `autoApproveThreshold` (z. B. 0.85), `autoApproveOnlyEmptyFields` (bool), `sensitiveFields` (z. B. `mobile`), `createdAt`,`updatedAt`.
- Proposals & Historie (Strukturen vorbereiten, Implementierung in Schritt 4):
  - `proposals`: `tenantId`, `contactId|null`, `diff` (alt→neu), `source` (Mailbox, `internetMessageId`, `conversationId`, Zeit, Snippet), `confidence`, `status` in {`pending`,`approved`,`rejected`}, `createdAt`,`decidedAt`,`decidedBy`.
  - `fieldHistory` (optional MVP+1): je Kontakt, Feld, Quelle, Zeit.

Codebase‑Impact
- `packages/backend/convex/schema.ts`:
  - Neue Tabellen: `tenants`, `memberships`, `tenantSettings`, `policies`, `proposals` (+ spätere `messages`, `conversations`, `locks`).
  - `contacts` um `tenantId` erweitern + neue Indexe.
- `packages/backend/convex/contacts.ts`:
  - Alle Queries/Mutations auf `tenantId` statt `ownerId` trimmen (ACL via Membership prüfen).
  - Optional: Soft‑Delete/Status belassen.
- Neue Module: `tenants.ts`, `settings.ts`, `policies.ts` (CRUD + Helpers).
- Frontend (`apps/web`):
  - Router‑Context mit `tenantId`/Role anreichern (aus Convex `me()` Query).
  - Bestehende Views (Liste/Detail) auf Tenant‑Scope umstellen.

Checks/Entscheide
- Rollenmodell ausreichend (Owner/Reviewer/Viewer) oder weitere Stufen nötig?
- Migration: Akzeptabel, dass bestehende Daten dem Default‑Tenant des Users zugeordnet werden?
- Eigene Domains: UI‑Eingabe vs. Auto‑Ermittlung aus verifizierten Absendern.

Akzeptanzkriterien
- Alle Contact‑Listen/Details zeigen nur Daten des aktiven Tenants.
- Neue Kontakte werden mit `tenantId` persistiert.
- Settings/Policies sind pro Tenant les-/schreibbar (Owner/Admin only).

—

## Schritt 2: Microsoft 365 Anbindung, Webhooks & Delta

Ziel: Eingehende Mails pro gewähltem Postfach/Eintreff-Zeitpunkt robust erfassen (Webhook „created“), verifizieren, entschlüsseln (Rich Notifications), idempotent verarbeiten und bei Ausfällen via Delta nachziehen.

Detaildesign
- App‑Registrierung (Entra ID): Multi‑Tenant, App‑Permission `Mail.Read`; optional `MailboxSettings.Read`. Auth über Client‑Zertifikat (empfohlen) oder Secret. Reply‑URL für Admin‑Consent/Onboarding in der App.
- Onboarding/UI:
  - „Mit Microsoft verbinden“ startet Admin‑Consent.
  - Nach Consent: Mailboxen (oder Gruppenmitglieder) listen; Auswahl speichern.
  - Pro Mailbox Subscription anlegen auf Resource `/users/{id}/mailFolders('inbox')/messages` mit: `changeType=created`, `includeResourceData=true`, `encryptionCertificate`, `clientState=GUID`, `$select=(id,receivedDateTime,conversationId,internetMessageId,from,toRecipients,ccRecipients,bodyPreview)`.
  - Subscriptions mit Expiry (max. 7 Tage) speichern.
- Webhook‑Endpoint:
  - Convex `httpEndpoint` `POST /webhooks/graph` öffentlich; Validation‑Handshake (Token zurückgeben), `validationTokens` prüfen, Issuer verifizieren.
  - `encryptedContent` mit privatem Schlüssel entschlüsseln (PEM in Convex Env‑Secret). Resource‑Payload extrahieren.
  - Antwort immer schnell `202`. Verarbeitung als `action` Job.
- Idempotenz & Multi‑Empfänger:
  - Dedupe‑Key: `internetMessageId`. Erste verarbeitende Mailbox wird Owner; weitere Events markieren als Duplikate, Empfängerliste wird als Touchpoints protokolliert.
  - Idempotenzschlüssel speichern: `msg:${tenantId}:${internetMessageId}`; TTL (z. B. 24–48h) oder permanent in `messages` Tabelle. Kein Redis nötig – Convex‑Tabelle `locks`/`messages` genügt (Write‑If‑Absent Logik im Code).
- „Nur neueste Mail der Konversation“:
  - Pro `conversationId` je Tenant `maxReceivedInbound` tracken; nur verarbeiten, wenn `receivedDateTime` ≥ gespeichertes Max für Inbound.
  - Inbound‑Prüfung: `from.address` nicht in `ownedDomains`/Do‑Not‑Capture.
- Renewal & Fallback:
  - Convex Scheduler Job: Alle 3–5 Tage Subscriptions erneuern.
  - Delta‑Fallback (`/messages/delta`) mit gespeicherten `deltaToken` pro Mailbox bei Lücken/Erstimport.
  - Reconcile‑Job: Gruppenmitglieder (falls Gruppenscope) zyklisch prüfen; Subscriptions anpassen.

Codebase‑Impact
- `packages/backend/convex/graph.ts` (neu):
  - `httpEndpoint` `/webhooks/graph` (Handshake, Validierung, Entschlüsselung).
  - `action` `enqueueMessageProcessing(payload)`; Hilfsfunktionen zum Graph‑GET/Delta (per `fetch`, kein SDK nötig).
- Neue Tabellen in `schema.ts`:
  - `mailboxes` (tenantId, userId, address, displayName, enabled).
  - `subscriptions` (tenantId, mailboxId, subscriptionId, expiresAt, clientState, deltaToken?).
  - `messages` (tenantId, internetMessageId uniq‑guard, conversationId, receivedDateTime, from, to/cc, mailboxOwnerId, status).
  - `conversations` (tenantId, conversationId, maxReceivedInbound).
  - `locks` (generic key/ttl, falls separat gewünscht).
- `packages/backend/convex/settings.ts`: CRUD für Domains/Do‑Not‑Capture/GroupScope.
- Frontend: Onboarding/Wizard in `apps/web` (Route „Einstellungen > Microsoft verbinden“, Auswahl Postfächer/Gruppe, Status der Subscriptions).

Checks/Entscheide
- Convex `httpEndpoint` ausreichend für Graph‑Handshake? (Ja, Antwort <10s sicherstellen.)
- Zertifikatsverwaltung: PEM‑Secret in Convex Env; Rotationsplan definieren.
- SDK vs. `fetch`: Für MVP `fetch` reicht; SDK optional später.

Akzeptanzkriterien
- Webhook‑Validation und Entschlüsselung funktionieren in Staging (mit echtem Test‑Tenant).
- Neue Nachricht erzeugt genau einen Processing‑Job pro `internetMessageId` (Multi‑Empfänger deduped).
- Delta‑Fallback kann initialen Import und Lücken schließen.

—

## Schritt 3: Vorverarbeitung, Signatur‑Erkennung & LLM‑Extraktion

Ziel: Aus der neuesten Inbound‑Mail je Konversation die Signatur robust isolieren und strukturierte Kontaktdaten mit Validierung/Normalisierung extrahieren.

Detaildesign
- Vorverarbeitung:
  - HTML → DOM normalisieren, Styles/Skripte strippen, Inline‑CSS ignorieren.
  - Zitat‑Trim: Erkenne Gmail `gmail_quote`, Outlook „Am … schrieb …“, `blockquote`‑Ketten; entferne Disclaimer/Signaturen vergangener Nachrichten (Heuristiken/Regex, ländersprachliche Muster DE/EN/FR/IT).
  - Sammle `img`‑`alt`‑Texte (häufig Telefonnummern bei Bildsignaturen).
- Locator‑Pipeline (Rule‑based + kleiner Klassifikator optional):
  - Abschnitte taggen: `signature | content | quote | legal`.
  - Kandidatenfenster: unterer Bereich nach Grußformel, limitierte Zeilenanzahl.
- LLM‑Extraktion:
  - Prompt (Few‑Shots) mit Strict‑JSON‑Schema:
    - `full_name`, `given_name|null`, `family_name|null`, `job_title|null`, `company|null`, `emails[]`, `phones[]` mit `{type: work|mobile|direct|fax, number}`, `website|null`, `linkedin|null`, `address{street,postal_code,city,country}`.
  - Validierung/Normalisierung:
    - E‑Mail RFC‑Check; dedupe/lowercase; Plus‑Alias entfernen.
    - Telefonnummern → E.164 (libphonenumber), Default‑Land aus Absender‑Domain/TLD oder Tenant‑Hint.
    - URLs/Unicode normalisieren (NFC).
  - Confidence Score: Locator‑Signal + Feldvalidierungen + LLM‑Selbstauskunft gewichtet.
- Fallbacks:
  - Nur‑Bild‑Signaturen: OCR (Tesseract) + LLM Post‑Processing. Für MVP optional als externer Minimal‑Worker (separate kleine Node‑Service/API) – nur aufrufbar, wenn Bilder erkannt.
  - VCF‑Anhänge: vCard Parser (direkte Extraktion ohne LLM, wenn vorhanden).
  - Mehrsprachigkeit: Locale‑Hints via Absender‑Domain/TLD und Tenant‑Settings.

Codebase‑Impact
- `packages/backend/convex/extract.ts` (neu):
  - `action` `preprocessAndExtract(messageId)` führt: Laden Body (Graph GET falls nötig) → Trim & Tagging → Kandidatenwahl → LLM‑Call → Validierung/Normalisierung → Ergebnis + `confidence` zurück.
  - Interne Utils: `trimQuotes()`, `stripDisclaimers()`, `locateSignature()`, `normalizePhones()/emails()/urls()`.
  - Optional `ocr.ts` Client für externen OCR‑Dienst.
- Secrets/Config: `LLM_ENDPOINT`, `LLM_API_KEY`, `OCR_ENDPOINT` optional.
- Tests: Unit‑Tests für Parser/Normalizer (Schritt 5 vertieft).

Checks/Entscheide
- LLM‑Provider (EU/CH) Auswahl; Preis/Latenz/Datenschutz.
- OCR im MVP aktivieren oder als Feature‑Flag „später“?
- JSON‑Schema finalisieren (z. B. mehrere Adressen/Phones erlauben?).

Akzeptanzkriterien
- Für kuratierte Testmails werden Felder konsistent extrahiert; Confidence reproduzierbar.
- Ungültige Werte (E‑Mail/Telefon) werden verworfen/berichtigt.

—

## Schritt 4: Deduplizierung, Merge, Proposals, Auto‑Approve, „Zuletzt kontaktet“

Ziel: Änderungen korrekt mit bestehenden Kontakten abgleichen, Konflikte als Review‑Proposals aufbereiten oder gemäß Policy automatisch übernehmen; Touchpoints pflegen.

Detaildesign
- Matching‑Strategie:
  - Primär: E‑Mail (case‑insensitive, Plus‑Alias entfernt).
  - Sekundär: Name × Firma/Domain, Telefonnummern, LinkedIn.
  - Fuzzy: Trigram/Levenshtein auf Namen/Firmen (leichtes Scoring, keine schweren Abhängigkeiten nötig).
- Merge‑Regeln:
  - Leere Felder befüllen automatisch.
  - Konflikte erzeugen `ChangeProposal` mit Diff (alt vs. neu) inkl. Quelle/Signatur‑Snippet.
  - Historie (optional MVP+1) auf Feldebene.
- Auto‑Approve Policies:
  - Wenn `confidence ≥ threshold` ODER „nur leere Felder“ → auto.
  - Sensible Felder (`mobile` etc.) nie auto.
- Touchpoints/„Zuletzt kontaktet“:
  - Bei deduziertem Kontakt `lastContactedAt` aktualisieren.
  - Optionale `touchpoints` Tabelle: welcher interne Empfänger, welche Mailbox, wann.
- UI Workflows:
  - Review‑Inbox (Liste) mit Filter/Sort; Bulk‑Approve (z. B. >0.9).
  - Review‑Detail: Split‑View mit Diff (links) und Signatur‑Snippet/Quelle (rechts); Aktionen: Approve/Reject/Edit+Approve/Snooze.

Codebase‑Impact
- `packages/backend/convex/dedupe.ts` (neu): Matching/Scoring Hilfsfunktionen.
- `packages/backend/convex/proposals.ts` (neu): CRUD + `approveProposal` (führt Merge aus), `rejectProposal`.
- `packages/backend/convex/ingest.ts` (neu oder Teil von `graph.ts`): orchestriert `extract` → `dedupe` → `proposal/auto‑merge` → Persistenz.
- `packages/backend/convex/schema.ts`: Tabellen `proposals`, optional `touchpoints` ergänzen.
- Frontend (`apps/web/src/routes`):
  - `reviews.tsx` (Liste), `review.$id.tsx` (Detail), Bulk‑Aktionen, Confidence‑Badge, Diff‑Renderer.
  - `settings.tsx` erweitern: Policies (Threshold, Flags), Do‑Not‑Capture Domains, eigene Domains.

Checks/Entscheide
- Fuzzy‑Matching Umfang: MVP leicht, später ausbauen (z. B. Namesaurus/phonetic libs)?
- Diff‑Darstellung: Komplexe Felder (Phones/Addresses) strukturiert rendern.

Akzeptanzkriterien
- Exakte Duplikate werden ohne Proposal gemerged.
- Konflikte erscheinen als Proposal; Approve/Reject schreibt korrekt in DB.
- `lastContactedAt` aktualisiert sich bei neuen Inbound‑Mails.

—

## Schritt 5: UI/UX, Sicherheit, Monitoring, Tests & Rollout

Ziel: Bedienelemente für Onboarding/Review/Dashboard liefern, 2FA aktivieren, Health/Logs bereitstellen, Tests aufsetzen und sauber ausrollen.

Detaildesign
- UI/UX:
  - Navigation: Dashboard, Reviews, Kontakte, Einstellungen (bestehend ergänzen), Firmen (bestehend), Benutzer (später).
  - Dashboard‑Kacheln: Pending Reviews, Auto‑Approved (7d), Fehler, Aktive Postfächer.
  - Kontakte: Filter (Firma, Domain, Land, Tag, „zuletzt kontaktet“), Detail inkl. Änderungsverlauf.
  - Export: CSV/vCard Endpoint (Server‑Action) + UI‑Button.
- Auth/Security:
  - Clerk: TOTP/2FA aktivieren; Rollen aus Membership ableiten (Owner‑gated Settings/Policies).
  - Rate‑Limits auf `httpEndpoint` (clientState prüfen, schnelle 202‑Antwort, Body‑Size Limits).
  - Secrets: Graph‑Zertifikat/Client Secret/LLM Key als Convex Env‑Secrets; keine Secrets im Repo.
- Monitoring/Health:
  - `GET /health` als `httpEndpoint` (liveness/readiness Checks: DB, Env, Subscription Renewals).
  - Strukturierte Logs (JSON) mit `requestId`, `tenantId`; optional Sentry/OTel.
  - Dead‑Letter: Fehlgeschlagene Jobs in `messages`/`ingestErrors` protokollieren.
- Tests (MVP):
  - Unit: Parser/Trim/Normalizer, Dedupe‑Scoring.
  - Integration: Webhook‑Flow mit Fake‑Payload, Delta‑Sync (Mock), LLM‑Mock (verschiedene Schemas/Fehler), Proposal‑Approve.
  - E2E (später): Minimales Playwright‑Szenario Onboarding→Review→Approve.
- Rollout:
  - Staging‑Tenant mit Test‑Mailboxen; App‑Registrierung in Staging/Tenant.
  - Smoke‑Tests: Webhook‑Validation, Delta‑Import, erster Proposal, Auto‑Approve.
  - Go‑Live: Produktions‑App‑Registrierung, Zertifikats‑Rotation dokumentiert, Cron aktiv.

Codebase‑Impact
- `packages/backend/convex/healthCheck.ts`: erweitern oder `health.ts` neu.
- `apps/web/src/routes` Ergänzungen: `dashboard.tsx`, `reviews.tsx`, `review.$id.tsx`, `settings.tsx` erweitern.
- Utility: `apps/web/src/components` für Diff‑View, Confidence‑Badge, Bulk‑Actions.

Checks/Entscheide
- Telemetrie: Sentry/OTel ja/nein im MVP.
- Export‑Formate: vCard Version (3.0/4.0), Feld‑Mapping fixieren.

Akzeptanzkriterien
- Admin kann Microsoft verbinden, Postfächer wählen, Subscriptions sehen.
- Reviews funktionieren inkl. Approve/Reject/Edit, Dashboard zeigt KPIs.
- Health Endpoint grün; Fehler werden geloggt; Basis‑Tests grün.

—

## Ergänzende Spezifika aus der Langfassung (abgeglichen und übernommen)

- Gruppierung pro `conversationId` (Schritt 2): nur neueste inbound Nachricht verarbeiten; `from.address` nicht in eigenen Domains (Settings).
- Zitat‑Trim & Noise‑Filter (Schritt 3): Gmail/Outlook Marker, Disclaimer, `blockquote`‑Ketten; `img alt` sammeln.
- LLM‑Schema/Validierung (Schritt 3): Strict JSON, E.164, RFC‑Check, Unicode NFC, Confidence Score.
- Dedupe/Merge/History (Schritt 4): Primär E‑Mail, Sekundär Name×Firma/Domain, Phone, LinkedIn, Fuzzy‑Score; Merge‑Priorität; Proposal bei Konflikt.
- Auto‑Approve (Schritt 4): Threshold + „nur leere Felder“, sensible Felder nie auto.
- UI/UX (Schritt 5): Dashboard/Reviews/Contacts/Settings, Bulk‑Aktionen, Diff‑Split‑View.
- API‑Design (Schritt 2/5): Convex `httpEndpoint` statt separater REST‑API; Endpoints: `/webhooks/graph`, `/health`, optionale `/export`.
- Idempotenz & Locking (Schritt 2): Schlüssel `msg:$tenantId:$internetMessageId` in Convex‑Tabelle; Duplicate → nur Touchpoint aktualisieren.

—

## Architektur‑Abweichungen zur ursprünglichen Vision und Begründung

- Kein NestJS/Next.js/Postgres/Redis im MVP: Euer bestehender Stack (Convex + React + Clerk) deckt alle MVP‑Anforderungen ab, reduziert Betrieb (Single‑VM nicht nötig). Optional spätere Migration zu Managed Postgres/Redis, falls Skala/Features es erfordern.
- Webhooks/Worker in Convex: `httpEndpoint` + `action` + Scheduler ersetzt dedizierten Worker. Für Spezialfälle (OCR/Tesseract) optional schlanker externer Microservice.
- Microsoft Graph SDK: Für MVP direkte `fetch`‑Calls (geringere Abhängigkeiten); SDK optional nachziehen.

—

## Offene Entscheidungen (für Senior‑Review)

- LLM‑Provider Auswahl (EU/CH), Kosten/Latenz, PII‑Richtlinien.
- OCR jetzt vs. später; wenn jetzt: wo hosten (kleiner Node‑Service)?
- JSON‑Schema Feinschliff (Mehrfach‑Adressen/‑Phones, Felderpflichten).
- Fuzzy‑Match Schwellenwerte und Metriken (A/B gegen manuelle Labels?).
- Scheduler in Convex vs. externer Cron (z. B. GitHub Actions) – Betriebsvorzug.
- Tenancy‑Modell: Single‑Tenant pro User im MVP oder echte Multi‑Tenant‑Organisationen mit Einladungen.

—

## Konkrete nächste Schritte (Umsetzungsreihenfolge kurz)

1) Schema erweitern: tenants/memberships/settings/policies/proposals/messages/conversations; contacts um `tenantId` + Indexe.
2) Membership/ACL einziehen; Frontend‑Context `tenantId/role` auslesen; bestehende Listen/Details auf Tenant‑Scope.
3) Graph: `httpEndpoint` + Validation/Decrypt; Subscriptions CRUD; Renewal/Delta Actions; Onboarding‑UI.
4) Extract‑Pipeline (Trim/Locate/LLM/Normalize) + Dedupe/Merge/Proposals + UI Reviews.
5) Dashboard/Health/Logging/Tests; Rollout Staging→Prod.

—

## Testplan (konkretisiert)

- Unit: `trimQuotes()`, `stripDisclaimers()`, `locateSignature()`, `normalizePhones()/emails()/urls()`, Dedupe‑Scorer.
- Integration: Fake Webhook (Handshake + Event), Delta‑Sync mit Mock‑Tokens, LLM‑Mock verschiedenster Antworten, Proposal‑Lifecycle.
- Smoke: End‑to‑End über UI (Onboarding→erste Mail→Review→Approve→Kontakt aktualisiert).

—

## Betriebsaspekte

- Secrets: Über Convex Env; Rotation für Graph‑Zertifikat dokumentieren.
- Rate‑Limits & Backpressure: Schnelle 202‑Antworten, Work‑Queue über Actions, Dead‑Letter Logging.
- Observability: Strukturierte Logs mit `tenantId`/`requestId`, Health‑Endpoint, optional Sentry/OTel.

—

Stand: erstellt für eure aktuelle Codebasis. Änderungen/Präzisierungen nach Senior‑Review gerne einpflegen.

