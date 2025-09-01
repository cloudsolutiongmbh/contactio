# Contactio MVP â€“ Umsetzungsplan (Codebase-aligned)

Kurzfassung: Wir realisieren das MVP strikt entlang eurer bestehenden Architektur: React (Vite + TanStack Router) im Frontend, Convex als Backend/DB, Clerk fÃ¼r Auth. Microsoft 365 wird via Graph Webhooks + Delta eingebunden. Webhooks, Jobs und Cron laufen als Convex `httpEndpoint`/`action`/Scheduler. LLM-Aufrufe erfolgen gegen einen externen EU/CHâ€‘konformen Endpoint. Redis, NestJS, Next.js und Postgres sind fÃ¼r das MVP nicht nÃ¶tig. Wo die ursprÃ¼ngliche Vision abweicht, â€žgewinntâ€œ eure aktuelle Codebasis â€“ unten sind die Alternativen/Checks jeweils benannt.

In diesem Plan nennen wir pro Schritt: Ziel, Detaildesign, Codebaseâ€‘Impact (konkrete Ã„nderungen/Erweiterungen), Checks/Entscheide (fÃ¼r Seniorâ€‘Review), und Akzeptanzkriterien.

â€”

## Schritt 1: Tenants, Rollen und Datenmodell konsolidieren

Ziel: Multiâ€‘Tenant sauber abbilden, Rollen verankern, Kontakte auf Tenantâ€‘Ebene statt nur Userâ€‘Ebene scopen; Basis fÃ¼r Policies/Settings/Proposals schaffen.

Detaildesign
- Tenant-Modell:
  - `tenants` Tabelle (Convex): `id`, `name`, `createdAt`.
  - `memberships` Tabelle: `tenantId`, `userId` (Clerk `subject`), `role` in {`owner`,`reviewer`,`viewer`}, `createdAt`.
  - Default: Erster registrierter Nutzer wird `owner` seines Defaultâ€‘Tenants.
- Kontakte migrieren von Userâ€‘Scope auf Tenantâ€‘Scope:
  - `contacts` um `tenantId` erweitern. `ownerId` bleibt fÃ¼r Ownership/ACL optional erhalten, aber alle Queries werden primÃ¤r nach `tenantId` gefiltert.
  - Indexe: `by_tenant_lastName_firstName` und `by_tenant_createdAt`.
  - Migrationsstrategie: FÃ¼r existierende Kontakte `tenantId` aus erstem Membership des Besitzers ableiten.
- Settings/Policies:
  - `tenantSettings`: `tenantId`, `ownedDomains` (eigene Domains), `doNotCapture` (Domains/Patterns), `defaultCountryHint`, `groupScope` (optionale M365â€‘Gruppe), `llmProvider`, `createdAt`,`updatedAt`.
  - `policies`: `tenantId`, `autoApproveThreshold` (z.â€¯B. 0.85), `autoApproveOnlyEmptyFields` (bool), `sensitiveFields` (z.â€¯B. `mobile`), `createdAt`,`updatedAt`.
- Proposals & Historie (Strukturen vorbereiten, Implementierung in Schritt 4):
  - `proposals`: `tenantId`, `contactId|null`, `diff` (altâ†’neu), `source` (Mailbox, `internetMessageId`, `conversationId`, Zeit, Snippet), `confidence`, `status` in {`pending`,`approved`,`rejected`}, `createdAt`,`decidedAt`,`decidedBy`.
  - `fieldHistory` (optional MVP+1): je Kontakt, Feld, Quelle, Zeit.

Codebaseâ€‘Impact
- `packages/backend/convex/schema.ts`:
  - Neue Tabellen: `tenants`, `memberships`, `tenantSettings`, `policies`, `proposals` (+ spÃ¤tere `messages`, `conversations`, `locks`).
  - `contacts` um `tenantId` erweitern + neue Indexe.
- `packages/backend/convex/contacts.ts`:
  - Alle Queries/Mutations auf `tenantId` statt `ownerId` trimmen (ACL via Membership prÃ¼fen).
  - Optional: Softâ€‘Delete/Status belassen.
- Neue Module: `tenants.ts`, `settings.ts`, `policies.ts` (CRUD + Helpers).
- Frontend (`apps/web`):
  - Routerâ€‘Context mit `tenantId`/Role anreichern (aus Convex `me()` Query).
  - Bestehende Views (Liste/Detail) auf Tenantâ€‘Scope umstellen.

Checks/Entscheide
- Rollenmodell ausreichend (Owner/Reviewer/Viewer) oder weitere Stufen nÃ¶tig?
- Migration: Akzeptabel, dass bestehende Daten dem Defaultâ€‘Tenant des Users zugeordnet werden?
- Eigene Domains: UIâ€‘Eingabe vs. Autoâ€‘Ermittlung aus verifizierten Absendern.

Akzeptanzkriterien
- Alle Contactâ€‘Listen/Details zeigen nur Daten des aktiven Tenants.
- Neue Kontakte werden mit `tenantId` persistiert.
- Settings/Policies sind pro Tenant les-/schreibbar (Owner/Admin only).

â€”

## Schritt 2: Microsoft 365 Anbindung, Webhooks & Delta
---

### Statusupdate Schritt 2 (Stand: 2025-09-01)

Erledigt
- Schema erweitert: mailboxes, subscriptions, messages, conversations, locks inkl. Indexe.
- Webhook: GET/POST /webhooks/graph (Handshake, 202-Antwort, Fehlerrobustheit).
- Entschlüsselung: RSA-OAEP (SHA-256) + AES-CBC für encryptedContent mit PEM-Secret.
- Idempotenz: Lock msg:: in locks.
- "Nur neueste Inbound je Konversation": Pflege conversations.maxReceivedInbound.
- Graph-Fallback: Fetch-by-resource, falls Payload fehlt.
- Subscriptions-Backend: listMailboxes (action), enableMailbox, disableMailbox, listSubscriptions, enewExpiring, deltaSyncMailbox, econcileGroupScope.
- UI (Settings): Bereich „Microsoft 365“ mit Admin-Consent-Link, optionalem GroupScope-Feld, Postfachliste inkl. Toggle und „Delta-Sync“.

Offen (innerhalb Schritt 2 sinnvoll, aber optional für MVP)
- Signaturprüfung der alidationTokens gegen Microsoft JWKs (derzeit Stub).
- Scheduler/Cron in Convex für enewExpiring und econcileGroupScope (derzeit manuell startbar).
- Bessere Fehler-/Statusanzeigen im UI (aktiv/fehlgeschlagen/erneuert) und Log-Instrumentierung.
- Touchpoints für Multi-Empfänger (Duplikate protokollieren) – Datenmodell vorbereitet, Logik minimal.

Voraussetzungen/Env
- GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID, GRAPH_WEBHOOK_URL.
- GRAPH_ENCRYPTION_PUBLIC_CERT_PEM (Base64 DER), GRAPH_ENCRYPTION_PRIVATE_KEY_PEM (PEM).

Testhinweise
- Handshake: GET /webhooks/graph?validationToken=ping → 200 Body ping.
- Postfach aktivieren → Abo angelegt, Ablaufzeit sichtbar.
- Testmail senden → Nachricht als pending erfasst (idempotent, nur neueste Inbound je Konversation).
- „Delta-Sync“ → initialer Import/Gaps.

---

Ziel: Eingehende Mails pro gewÃ¤hltem Postfach/Eintreff-Zeitpunkt robust erfassen (Webhook â€žcreatedâ€œ), verifizieren, entschlÃ¼sseln (Rich Notifications), idempotent verarbeiten und bei AusfÃ¤llen via Delta nachziehen.

Detaildesign
- Appâ€‘Registrierung (Entra ID): Multiâ€‘Tenant, Appâ€‘Permission `Mail.Read`; optional `MailboxSettings.Read`. Auth Ã¼ber Clientâ€‘Zertifikat (empfohlen) oder Secret. Replyâ€‘URL fÃ¼r Adminâ€‘Consent/Onboarding in der App.
- Onboarding/UI:
  - â€žMit Microsoft verbindenâ€œ startet Adminâ€‘Consent.
  - Nach Consent: Mailboxen (oder Gruppenmitglieder) listen; Auswahl speichern.
  - Pro Mailbox Subscription anlegen auf Resource `/users/{id}/mailFolders('inbox')/messages` mit: `changeType=created`, `includeResourceData=true`, `encryptionCertificate`, `clientState=GUID`, `$select=(id,receivedDateTime,conversationId,internetMessageId,from,toRecipients,ccRecipients,bodyPreview)`.
  - Subscriptions mit Expiry (max. 7 Tage) speichern.
- Webhookâ€‘Endpoint:
  - Convex `httpEndpoint` `POST /webhooks/graph` Ã¶ffentlich; Validationâ€‘Handshake (Token zurÃ¼ckgeben), `validationTokens` prÃ¼fen, Issuer verifizieren.
  - `encryptedContent` mit privatem SchlÃ¼ssel entschlÃ¼sseln (PEM in Convex Envâ€‘Secret). Resourceâ€‘Payload extrahieren.
  - Antwort immer schnell `202`. Verarbeitung als `action` Job.
- Idempotenz & Multiâ€‘EmpfÃ¤nger:
  - Dedupeâ€‘Key: `internetMessageId`. Erste verarbeitende Mailbox wird Owner; weitere Events markieren als Duplikate, EmpfÃ¤ngerliste wird als Touchpoints protokolliert.
  - IdempotenzschlÃ¼ssel speichern: `msg:${tenantId}:${internetMessageId}`; TTL (z.â€¯B. 24â€“48h) oder permanent in `messages` Tabelle. Kein Redis nÃ¶tig â€“ Convexâ€‘Tabelle `locks`/`messages` genÃ¼gt (Writeâ€‘Ifâ€‘Absent Logik im Code).
- â€žNur neueste Mail der Konversationâ€œ:
  - Pro `conversationId` je Tenant `maxReceivedInbound` tracken; nur verarbeiten, wenn `receivedDateTime` â‰¥ gespeichertes Max fÃ¼r Inbound.
  - Inboundâ€‘PrÃ¼fung: `from.address` nicht in `ownedDomains`/Doâ€‘Notâ€‘Capture.
- Renewal & Fallback:
  - Convex Scheduler Job: Alle 3â€“5 Tage Subscriptions erneuern.
  - Deltaâ€‘Fallback (`/messages/delta`) mit gespeicherten `deltaToken` pro Mailbox bei LÃ¼cken/Erstimport.
  - Reconcileâ€‘Job: Gruppenmitglieder (falls Gruppenscope) zyklisch prÃ¼fen; Subscriptions anpassen.

Codebaseâ€‘Impact
- `packages/backend/convex/graph.ts` (neu):
  - `httpEndpoint` `/webhooks/graph` (Handshake, Validierung, EntschlÃ¼sselung).
  - `action` `enqueueMessageProcessing(payload)`; Hilfsfunktionen zum Graphâ€‘GET/Delta (per `fetch`, kein SDK nÃ¶tig).
- Neue Tabellen in `schema.ts`:
  - `mailboxes` (tenantId, userId, address, displayName, enabled).
  - `subscriptions` (tenantId, mailboxId, subscriptionId, expiresAt, clientState, deltaToken?).
  - `messages` (tenantId, internetMessageId uniqâ€‘guard, conversationId, receivedDateTime, from, to/cc, mailboxOwnerId, status).
  - `conversations` (tenantId, conversationId, maxReceivedInbound).
  - `locks` (generic key/ttl, falls separat gewÃ¼nscht).
- `packages/backend/convex/settings.ts`: CRUD fÃ¼r Domains/Doâ€‘Notâ€‘Capture/GroupScope.
- Frontend: Onboarding/Wizard in `apps/web` (Route â€žEinstellungen > Microsoft verbindenâ€œ, Auswahl PostfÃ¤cher/Gruppe, Status der Subscriptions).

Checks/Entscheide
- Convex `httpEndpoint` ausreichend fÃ¼r Graphâ€‘Handshake? (Ja, Antwort <10s sicherstellen.)
- Zertifikatsverwaltung: PEMâ€‘Secret in Convex Env; Rotationsplan definieren.
- SDK vs. `fetch`: FÃ¼r MVP `fetch` reicht; SDK optional spÃ¤ter.

Akzeptanzkriterien
- Webhookâ€‘Validation und EntschlÃ¼sselung funktionieren in Staging (mit echtem Testâ€‘Tenant).
- Neue Nachricht erzeugt genau einen Processingâ€‘Job pro `internetMessageId` (Multiâ€‘EmpfÃ¤nger deduped).
- Deltaâ€‘Fallback kann initialen Import und LÃ¼cken schlieÃŸen.

â€”

## Schritt 3: Vorverarbeitung, Signaturâ€‘Erkennung & LLMâ€‘Extraktion

Ziel: Aus der neuesten Inboundâ€‘Mail je Konversation die Signatur robust isolieren und strukturierte Kontaktdaten mit Validierung/Normalisierung extrahieren.

Detaildesign
- Vorverarbeitung:
  - HTML â†’ DOM normalisieren, Styles/Skripte strippen, Inlineâ€‘CSS ignorieren.
  - Zitatâ€‘Trim: Erkenne Gmail `gmail_quote`, Outlook â€žAm â€¦ schrieb â€¦â€œ, `blockquote`â€‘Ketten; entferne Disclaimer/Signaturen vergangener Nachrichten (Heuristiken/Regex, lÃ¤ndersprachliche Muster DE/EN/FR/IT).
  - Sammle `img`â€‘`alt`â€‘Texte (hÃ¤ufig Telefonnummern bei Bildsignaturen).
- Locatorâ€‘Pipeline (Ruleâ€‘based + kleiner Klassifikator optional):
  - Abschnitte taggen: `signature | content | quote | legal`.
  - Kandidatenfenster: unterer Bereich nach GruÃŸformel, limitierte Zeilenanzahl.
- LLMâ€‘Extraktion:
  - Prompt (Fewâ€‘Shots) mit Strictâ€‘JSONâ€‘Schema:
    - `full_name`, `given_name|null`, `family_name|null`, `job_title|null`, `company|null`, `emails[]`, `phones[]` mit `{type: work|mobile|direct|fax, number}`, `website|null`, `linkedin|null`, `address{street,postal_code,city,country}`.
  - Validierung/Normalisierung:
    - Eâ€‘Mail RFCâ€‘Check; dedupe/lowercase; Plusâ€‘Alias entfernen.
    - Telefonnummern â†’ E.164 (libphonenumber), Defaultâ€‘Land aus Absenderâ€‘Domain/TLD oder Tenantâ€‘Hint.
    - URLs/Unicode normalisieren (NFC).
  - Confidence Score: Locatorâ€‘Signal + Feldvalidierungen + LLMâ€‘Selbstauskunft gewichtet.
- Fallbacks:
  - Nurâ€‘Bildâ€‘Signaturen: OCR (Tesseract) + LLM Postâ€‘Processing. FÃ¼r MVP optional als externer Minimalâ€‘Worker (separate kleine Nodeâ€‘Service/API) â€“ nur aufrufbar, wenn Bilder erkannt.
  - VCFâ€‘AnhÃ¤nge: vCard Parser (direkte Extraktion ohne LLM, wenn vorhanden).
  - Mehrsprachigkeit: Localeâ€‘Hints via Absenderâ€‘Domain/TLD und Tenantâ€‘Settings.

Codebaseâ€‘Impact
- `packages/backend/convex/extract.ts` (neu):
  - `action` `preprocessAndExtract(messageId)` fÃ¼hrt: Laden Body (Graph GET falls nÃ¶tig) â†’ Trim & Tagging â†’ Kandidatenwahl â†’ LLMâ€‘Call â†’ Validierung/Normalisierung â†’ Ergebnis + `confidence` zurÃ¼ck.
  - Interne Utils: `trimQuotes()`, `stripDisclaimers()`, `locateSignature()`, `normalizePhones()/emails()/urls()`.
  - Optional `ocr.ts` Client fÃ¼r externen OCRâ€‘Dienst.
- Secrets/Config: `LLM_ENDPOINT`, `LLM_API_KEY`, `OCR_ENDPOINT` optional.
- Tests: Unitâ€‘Tests fÃ¼r Parser/Normalizer (Schritt 5 vertieft).

Checks/Entscheide
- LLMâ€‘Provider (EU/CH) Auswahl; Preis/Latenz/Datenschutz.
- OCR im MVP aktivieren oder als Featureâ€‘Flag â€žspÃ¤terâ€œ?
- JSONâ€‘Schema finalisieren (z.â€¯B. mehrere Adressen/Phones erlauben?).

Akzeptanzkriterien
- FÃ¼r kuratierte Testmails werden Felder konsistent extrahiert; Confidence reproduzierbar.
- UngÃ¼ltige Werte (Eâ€‘Mail/Telefon) werden verworfen/berichtigt.

â€”

## Schritt 4: Deduplizierung, Merge, Proposals, Autoâ€‘Approve, â€žZuletzt kontaktetâ€œ

Ziel: Ã„nderungen korrekt mit bestehenden Kontakten abgleichen, Konflikte als Reviewâ€‘Proposals aufbereiten oder gemÃ¤ÃŸ Policy automatisch Ã¼bernehmen; Touchpoints pflegen.

Detaildesign
- Matchingâ€‘Strategie:
  - PrimÃ¤r: Eâ€‘Mail (caseâ€‘insensitive, Plusâ€‘Alias entfernt).
  - SekundÃ¤r: Name Ã— Firma/Domain, Telefonnummern, LinkedIn.
  - Fuzzy: Trigram/Levenshtein auf Namen/Firmen (leichtes Scoring, keine schweren AbhÃ¤ngigkeiten nÃ¶tig).
- Mergeâ€‘Regeln:
  - Leere Felder befÃ¼llen automatisch.
  - Konflikte erzeugen `ChangeProposal` mit Diff (alt vs. neu) inkl. Quelle/Signaturâ€‘Snippet.
  - Historie (optional MVP+1) auf Feldebene.
- Autoâ€‘Approve Policies:
  - Wenn `confidence â‰¥ threshold` ODER â€žnur leere Felderâ€œ â†’ auto.
  - Sensible Felder (`mobile` etc.) nie auto.
- Touchpoints/â€žZuletzt kontaktetâ€œ:
  - Bei deduziertem Kontakt `lastContactedAt` aktualisieren.
  - Optionale `touchpoints` Tabelle: welcher interne EmpfÃ¤nger, welche Mailbox, wann.
- UI Workflows:
  - Reviewâ€‘Inbox (Liste) mit Filter/Sort; Bulkâ€‘Approve (z.â€¯B. >0.9).
  - Reviewâ€‘Detail: Splitâ€‘View mit Diff (links) und Signaturâ€‘Snippet/Quelle (rechts); Aktionen: Approve/Reject/Edit+Approve/Snooze.

Codebaseâ€‘Impact
- `packages/backend/convex/dedupe.ts` (neu): Matching/Scoring Hilfsfunktionen.
- `packages/backend/convex/proposals.ts` (neu): CRUD + `approveProposal` (fÃ¼hrt Merge aus), `rejectProposal`.
- `packages/backend/convex/ingest.ts` (neu oder Teil von `graph.ts`): orchestriert `extract` â†’ `dedupe` â†’ `proposal/autoâ€‘merge` â†’ Persistenz.
- `packages/backend/convex/schema.ts`: Tabellen `proposals`, optional `touchpoints` ergÃ¤nzen.
- Frontend (`apps/web/src/routes`):
  - `reviews.tsx` (Liste), `review.$id.tsx` (Detail), Bulkâ€‘Aktionen, Confidenceâ€‘Badge, Diffâ€‘Renderer.
  - `settings.tsx` erweitern: Policies (Threshold, Flags), Doâ€‘Notâ€‘Capture Domains, eigene Domains.

Checks/Entscheide
- Fuzzyâ€‘Matching Umfang: MVP leicht, spÃ¤ter ausbauen (z.â€¯B. Namesaurus/phonetic libs)?
- Diffâ€‘Darstellung: Komplexe Felder (Phones/Addresses) strukturiert rendern.

Akzeptanzkriterien
- Exakte Duplikate werden ohne Proposal gemerged.
- Konflikte erscheinen als Proposal; Approve/Reject schreibt korrekt in DB.
- `lastContactedAt` aktualisiert sich bei neuen Inboundâ€‘Mails.

â€”

## Schritt 5: UI/UX, Sicherheit, Monitoring, Tests & Rollout

Ziel: Bedienelemente fÃ¼r Onboarding/Review/Dashboard liefern, 2FA aktivieren, Health/Logs bereitstellen, Tests aufsetzen und sauber ausrollen.

Detaildesign
- UI/UX:
  - Navigation: Dashboard, Reviews, Kontakte, Einstellungen (bestehend ergÃ¤nzen), Firmen (bestehend), Benutzer (spÃ¤ter).
  - Dashboardâ€‘Kacheln: Pending Reviews, Autoâ€‘Approved (7d), Fehler, Aktive PostfÃ¤cher.
  - Kontakte: Filter (Firma, Domain, Land, Tag, â€žzuletzt kontaktetâ€œ), Detail inkl. Ã„nderungsverlauf.
  - Export: CSV/vCard Endpoint (Serverâ€‘Action) + UIâ€‘Button.
- Auth/Security:
  - Clerk: TOTP/2FA aktivieren; Rollen aus Membership ableiten (Ownerâ€‘gated Settings/Policies).
  - Rateâ€‘Limits auf `httpEndpoint` (clientState prÃ¼fen, schnelle 202â€‘Antwort, Bodyâ€‘Size Limits).
  - Secrets: Graphâ€‘Zertifikat/Client Secret/LLM Key als Convex Envâ€‘Secrets; keine Secrets im Repo.
- Monitoring/Health:
  - `GET /health` als `httpEndpoint` (liveness/readiness Checks: DB, Env, Subscription Renewals).
  - Strukturierte Logs (JSON) mit `requestId`, `tenantId`; optional Sentry/OTel.
  - Deadâ€‘Letter: Fehlgeschlagene Jobs in `messages`/`ingestErrors` protokollieren.
- Tests (MVP):
  - Unit: Parser/Trim/Normalizer, Dedupeâ€‘Scoring.
  - Integration: Webhookâ€‘Flow mit Fakeâ€‘Payload, Deltaâ€‘Sync (Mock), LLMâ€‘Mock (verschiedene Schemas/Fehler), Proposalâ€‘Approve.
  - E2E (spÃ¤ter): Minimales Playwrightâ€‘Szenario Onboardingâ†’Reviewâ†’Approve.
- Rollout:
  - Stagingâ€‘Tenant mit Testâ€‘Mailboxen; Appâ€‘Registrierung in Staging/Tenant.
  - Smokeâ€‘Tests: Webhookâ€‘Validation, Deltaâ€‘Import, erster Proposal, Autoâ€‘Approve.
  - Goâ€‘Live: Produktionsâ€‘Appâ€‘Registrierung, Zertifikatsâ€‘Rotation dokumentiert, Cron aktiv.

Codebaseâ€‘Impact
- `packages/backend/convex/healthCheck.ts`: erweitern oder `health.ts` neu.
- `apps/web/src/routes` ErgÃ¤nzungen: `dashboard.tsx`, `reviews.tsx`, `review.$id.tsx`, `settings.tsx` erweitern.
- Utility: `apps/web/src/components` fÃ¼r Diffâ€‘View, Confidenceâ€‘Badge, Bulkâ€‘Actions.

Checks/Entscheide
- Telemetrie: Sentry/OTel ja/nein im MVP.
- Exportâ€‘Formate: vCard Version (3.0/4.0), Feldâ€‘Mapping fixieren.

Akzeptanzkriterien
- Admin kann Microsoft verbinden, PostfÃ¤cher wÃ¤hlen, Subscriptions sehen.
- Reviews funktionieren inkl. Approve/Reject/Edit, Dashboard zeigt KPIs.
- Health Endpoint grÃ¼n; Fehler werden geloggt; Basisâ€‘Tests grÃ¼n.

â€”

## ErgÃ¤nzende Spezifika aus der Langfassung (abgeglichen und Ã¼bernommen)

- Gruppierung pro `conversationId` (Schritt 2): nur neueste inbound Nachricht verarbeiten; `from.address` nicht in eigenen Domains (Settings).
- Zitatâ€‘Trim & Noiseâ€‘Filter (Schritt 3): Gmail/Outlook Marker, Disclaimer, `blockquote`â€‘Ketten; `img alt` sammeln.
- LLMâ€‘Schema/Validierung (Schritt 3): Strict JSON, E.164, RFCâ€‘Check, Unicode NFC, Confidence Score.
- Dedupe/Merge/History (Schritt 4): PrimÃ¤r Eâ€‘Mail, SekundÃ¤r NameÃ—Firma/Domain, Phone, LinkedIn, Fuzzyâ€‘Score; Mergeâ€‘PrioritÃ¤t; Proposal bei Konflikt.
- Autoâ€‘Approve (Schritt 4): Threshold + â€žnur leere Felderâ€œ, sensible Felder nie auto.
- UI/UX (Schritt 5): Dashboard/Reviews/Contacts/Settings, Bulkâ€‘Aktionen, Diffâ€‘Splitâ€‘View.
- APIâ€‘Design (Schritt 2/5): Convex `httpEndpoint` statt separater RESTâ€‘API; Endpoints: `/webhooks/graph`, `/health`, optionale `/export`.
- Idempotenz & Locking (Schritt 2): SchlÃ¼ssel `msg:$tenantId:$internetMessageId` in Convexâ€‘Tabelle; Duplicate â†’ nur Touchpoint aktualisieren.

â€”

## Architekturâ€‘Abweichungen zur ursprÃ¼nglichen Vision und BegrÃ¼ndung

- Kein NestJS/Next.js/Postgres/Redis im MVP: Euer bestehender Stack (Convex + React + Clerk) deckt alle MVPâ€‘Anforderungen ab, reduziert Betrieb (Singleâ€‘VM nicht nÃ¶tig). Optional spÃ¤tere Migration zu Managed Postgres/Redis, falls Skala/Features es erfordern.
- Webhooks/Worker in Convex: `httpEndpoint` + `action` + Scheduler ersetzt dedizierten Worker. FÃ¼r SpezialfÃ¤lle (OCR/Tesseract) optional schlanker externer Microservice.
- Microsoft Graph SDK: FÃ¼r MVP direkte `fetch`â€‘Calls (geringere AbhÃ¤ngigkeiten); SDK optional nachziehen.

â€”

## Offene Entscheidungen (fÃ¼r Seniorâ€‘Review)

- LLMâ€‘Provider Auswahl (EU/CH), Kosten/Latenz, PIIâ€‘Richtlinien.
- OCR jetzt vs. spÃ¤ter; wenn jetzt: wo hosten (kleiner Nodeâ€‘Service)?
- JSONâ€‘Schema Feinschliff (Mehrfachâ€‘Adressen/â€‘Phones, Felderpflichten).
- Fuzzyâ€‘Match Schwellenwerte und Metriken (A/B gegen manuelle Labels?).
- Scheduler in Convex vs. externer Cron (z.â€¯B. GitHub Actions) â€“ Betriebsvorzug.
- Tenancyâ€‘Modell: Singleâ€‘Tenant pro User im MVP oder echte Multiâ€‘Tenantâ€‘Organisationen mit Einladungen.

â€”

## Konkrete nÃ¤chste Schritte (Umsetzungsreihenfolge kurz)

1) Schema erweitern: tenants/memberships/settings/policies/proposals/messages/conversations; contacts um `tenantId` + Indexe.
2) Membership/ACL einziehen; Frontendâ€‘Context `tenantId/role` auslesen; bestehende Listen/Details auf Tenantâ€‘Scope.
3) Graph: `httpEndpoint` + Validation/Decrypt; Subscriptions CRUD; Renewal/Delta Actions; Onboardingâ€‘UI.
4) Extractâ€‘Pipeline (Trim/Locate/LLM/Normalize) + Dedupe/Merge/Proposals + UI Reviews.
5) Dashboard/Health/Logging/Tests; Rollout Stagingâ†’Prod.

â€”

## Testplan (konkretisiert)

- Unit: `trimQuotes()`, `stripDisclaimers()`, `locateSignature()`, `normalizePhones()/emails()/urls()`, Dedupeâ€‘Scorer.
- Integration: Fake Webhook (Handshake + Event), Deltaâ€‘Sync mit Mockâ€‘Tokens, LLMâ€‘Mock verschiedenster Antworten, Proposalâ€‘Lifecycle.
- Smoke: Endâ€‘toâ€‘End Ã¼ber UI (Onboardingâ†’erste Mailâ†’Reviewâ†’Approveâ†’Kontakt aktualisiert).

â€”

## Betriebsaspekte

- Secrets: Ãœber Convex Env; Rotation fÃ¼r Graphâ€‘Zertifikat dokumentieren.
- Rateâ€‘Limits & Backpressure: Schnelle 202â€‘Antworten, Workâ€‘Queue Ã¼ber Actions, Deadâ€‘Letter Logging.
- Observability: Strukturierte Logs mit `tenantId`/`requestId`, Healthâ€‘Endpoint, optional Sentry/OTel.

â€”

Stand: erstellt fÃ¼r eure aktuelle Codebasis. Ã„nderungen/PrÃ¤zisierungen nach Seniorâ€‘Review gerne einpflegen.


