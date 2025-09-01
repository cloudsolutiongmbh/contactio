import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Zap, Shield, Globe, Users, CheckCircle, ArrowRight, Star } from "lucide-react";

export const Route = createFileRoute("/landing")({
  component: LandingComponent,
});

function LandingComponent() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    // Simulate API call - replace with actual implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Vielen Dank! Wir melden uns bei Ihnen.");
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">contactio</div>
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                🇨🇭 Swiss Made
              </Badge>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600">Funktionen</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600">Preise</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600">Über uns</a>
              <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              🚀 Revolutionieren Sie Ihr Contact Management
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Nie wieder <span className="text-blue-600">manuelle</span><br />
              Kontakt-Erfassung
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              <strong>contactio</strong> extrahiert automatisch Kontaktdaten aus E-Mail-Signaturen 
              und hält Ihr CRM immer aktuell. Mit KI-Power, Swiss Quality und Microsoft 365 Integration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/" className="group">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 text-white">
                  Jetzt kostenlos testen
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => document.getElementById('demo')?.scrollIntoView()}>
                Demo ansehen
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 mb-16">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>GDPR Konform</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span>Schweizer Server</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-600" />
                <span>Microsoft 365 Certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-red-100 text-red-700">Das Problem</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Ihr Team verliert täglich wertvolle Zeit
              </h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>45 Minuten täglich</strong> für manuelle Kontakt-Erfassung pro Person</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Veraltete CRM-Daten</strong> führen zu verpassten Geschäftschancen</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Inkonsistente Daten</strong> durch unterschiedliche Eingabemethoden</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Wichtige Kontakte</strong> gehen im E-Mail-Chaos verloren</p>
                </div>
              </div>
            </div>
            
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700">Die Lösung</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                contactio macht alles automatisch
              </h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <p><strong>100% automatisch:</strong> Kontakte aus E-Mail-Signaturen extrahieren</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <p><strong>KI-gestützt:</strong> Höchste Genauigkeit bei der Daten-Extraktion</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <p><strong>Smart Merge:</strong> Automatisches Update bestehender Kontakte</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <p><strong>Review-System:</strong> Vollständige Kontrolle über alle Änderungen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">Funktionen</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Alles was Sie für perfektes Contact Management brauchen
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Von der automatischen Erfassung bis zur intelligenten Analyse - 
              contactio deckt alle Aspekte modernen Contact Managements ab.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Automatische Extraktion</CardTitle>
                <CardDescription>
                  KI extrahiert Kontaktdaten aus E-Mail-Signaturen mit 95%+ Genauigkeit
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Microsoft 365 Integration</CardTitle>
                <CardDescription>
                  Nahtlose Anbindung an Outlook und Exchange mit Echtzeit-Synchronisation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Smart Deduplizierung</CardTitle>
                <CardDescription>
                  Intelligentes Zusammenführen von Kontakten und Vermeidung von Duplikaten
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
                  <Shield className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Swiss Privacy</CardTitle>
                <CardDescription>
                  Alle Daten bleiben in der Schweiz. GDPR-konform und höchste Sicherheitsstandards
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                  <CheckCircle className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>Review & Approve</CardTitle>
                <CardDescription>
                  Vollständige Kontrolle durch intelligentes Review-System für alle Änderungen
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
                  <Star className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Multi-Tenant Ready</CardTitle>
                <CardDescription>
                  Perfekt für Agenturen und Unternehmen mit mehreren Mandanten
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">So einfach geht's</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              In 3 Schritten zu perfektem Contact Management
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Microsoft 365 verbinden</h3>
              <p className="text-gray-600">
                Verbinden Sie contactio einmalig mit Ihrem Microsoft 365 Account. 
                Sicher und GDPR-konform.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">E-Mails empfangen</h3>
              <p className="text-gray-600">
                Arbeiten Sie ganz normal. contactio analysiert automatisch 
                alle eingehenden E-Mails im Hintergrund.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Review & Approve</h3>
              <p className="text-gray-600">
                Prüfen und bestätigen Sie neue Kontakte mit einem Klick. 
                Alles andere macht contactio automatisch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Bereits über 1000 Schweizer Unternehmen vertrauen uns
            </h2>
            <p className="text-xl text-blue-100">
              Von Startups bis zu Grossunternehmen - contactio spart Zeit und Geld
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-200">Genauigkeit bei Datenextraktion</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">45min</div>
              <div className="text-blue-200">Zeitersparnis pro Person/Tag</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-blue-200">Uptime Garantie</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-blue-200">Datenverluste seit Launch</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">Preise</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Transparent und fair für jede Unternehmensgrösse
            </h2>
            <p className="text-xl text-gray-600">
              Keine versteckten Kosten. Alle Pläne inkl. Swiss Hosting und Premium Support.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="text-4xl font-bold text-blue-600 my-4">
                  CHF 29
                  <span className="text-lg text-gray-500 font-normal">/Monat</span>
                </div>
                <CardDescription>Perfekt für kleine Teams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Bis zu 5 Benutzer</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>1000 Kontakte/Monat</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Microsoft 365 Integration</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Standard Support</span>
                </div>
                <Button className="w-full mt-6" variant="outline">
                  14 Tage kostenlos testen
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 relative hover:shadow-xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-4 py-1">Beliebtester Plan</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Business</CardTitle>
                <div className="text-4xl font-bold text-blue-600 my-4">
                  CHF 79
                  <span className="text-lg text-gray-500 font-normal">/Monat</span>
                </div>
                <CardDescription>Ideal für wachsende Unternehmen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Bis zu 25 Benutzer</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>5000 Kontakte/Monat</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Advanced KI Features</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Multi-Tenant Support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Priority Support</span>
                </div>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  14 Tage kostenlos testen
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 hover:border-purple-300 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="text-4xl font-bold text-purple-600 my-4">
                  Custom
                </div>
                <CardDescription>Für grosse Organisationen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Unbegrenzt Benutzer</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Unbegrenzt Kontakte</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Custom Integrationen</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>On-Premise Option</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>24/7 Dedicated Support</span>
                </div>
                <Button className="w-full mt-6" variant="outline">
                  Kontakt aufnehmen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            Bereit für automatisches Contact Management?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Schliessen Sie sich über 1000 zufriedenen Schweizer Unternehmen an. 
            14 Tage kostenlos testen, keine Kreditkarte erforderlich.
          </p>
          
          <form onSubmit={handleWaitlist} className="max-w-md mx-auto mb-8">
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="Ihre E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white text-gray-900"
                required
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-white text-blue-600 hover:bg-gray-100 px-8"
              >
                {isSubmitting ? "..." : "Starten"}
              </Button>
            </div>
          </form>
          
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>14 Tage kostenlos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Keine Kreditkarte</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Jederzeit kündbar</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="text-2xl font-bold text-white">contactio</div>
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  🇨🇭 Swiss
                </Badge>
              </div>
              <p className="text-gray-400 mb-4">
                Automatisches Contact Management mit Schweizer Qualität und Datenschutz.
              </p>
              <p className="text-sm text-gray-500">
                Eine cloud-solution.ch Company<br />
                Mit ❤️ in der Schweiz entwickelt
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Produkt</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Funktionen</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Preise</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrationen</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Unternehmen</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Über uns</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karriere</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Dokumentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Datenschutz</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 contactio by cloud-solution.ch. Alle Rechte vorbehalten.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">AGB</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Datenschutz</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Impressum</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}