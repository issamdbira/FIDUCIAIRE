import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Calculator, TrendingUp, FileText, DollarSign, ClipboardCheck } from "lucide-react";

/**
 * Design: Minimaliste & Professionnel
 * Palette: Bleu marine + Blanc + Or
 * Typographie: Montserrat (titres) + Inter (corps)
 */

export default function Home() {
  const categorieCalculer = [
    {
      id: "calculer-salaire",
      title: "Calculer un salaire",
      description: "Brut → Net ou Net → Brut, pour les salariés du secteur privé (CNSS)",
      icon: DollarSign,
      href: "/calculateurs/calculer-salaire",
      color: "from-blue-600 to-blue-700"
    },
    {
      id: "irpp",
      title: "Calculer son impôt sur le revenu",
      description: "Estimez votre IRPP annuel selon votre situation familiale",
      icon: FileText,
      href: "/calculateurs/irpp",
      color: "from-blue-700 to-blue-800"
    },
    {
      id: "retraite-cnss",
      title: "Estimer sa retraite",
      description: "Estimez votre pension de retraite selon votre ancienneté et salaire",
      icon: TrendingUp,
      href: "/calculateurs/retraite-cnss",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "actualisation-salaire",
      title: "Actualiser un ancien salaire",
      description: "Actualisez un salaire par le coefficient CNSS de son année (pour le calcul de retraite)",
      icon: TrendingUp,
      href: "/calculateurs/actualisation-salaire",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "paie-cnrps",
      title: "Calculer une paie du secteur public",
      description: "Paie des fonctionnaires affiliés à la CNRPS",
      icon: Calculator,
      href: "/calculateurs/paie-cnrps",
      color: "from-blue-600 to-blue-700"
    }
  ];

  const categorieTraiter = [
    {
      id: "fiche-de-paie",
      title: "Générer une fiche de paie",
      description: "Employeur, logo, salarié, éléments de rémunération, détail du calcul et export PDF",
      icon: FileText,
      href: "/fiche-de-paie",
      color: "from-blue-700 to-blue-900"
    }
  ];

  const categorieDeclarer = [
    {
      id: "declarations-cnss",
      title: "Préparer une déclaration CNSS",
      description: "Saisie ou import CSV/Excel, contrôle des données, génération et test du fichier TXT",
      icon: ClipboardCheck,
      href: "/calculateurs/declarations-cnss",
      color: "from-blue-700 to-blue-800"
    }
  ];

  const handleAbout = () => {
    window.location.href = '/about';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                LE FIDUCIAIRE
              </h1>
            </div>
            <nav className="hidden md:flex gap-8">
              <a href="/" className="text-gray-700 hover:text-blue-700 transition-colors font-medium">
                Accueil
              </a>
              <a href="#calculateurs" className="text-gray-700 hover:text-blue-700 transition-colors font-medium">
                Calculateurs
              </a>
              <a href="/about" className="text-gray-700 hover:text-blue-700 transition-colors font-medium">
                À propos
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h2 className="text-5xl font-bold mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Vos Calculs Sociaux Simplifiés
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              LE FIDUCIAIRE vous aide à calculer votre paie, votre retraite et vos impôts en Tunisie. 
              Gratuit, transparent et facile d'utilisation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/fiche-de-paie">
                <Button
                  size="lg"
                  className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold"
                >
                  Générer une fiche de paie
                </Button>
              </Link>
              <Link href="/calculateurs/calculer-salaire">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Calculer un salaire
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={() => document.getElementById("calculateurs")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir tous les outils
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section : Traiter une paie (mise en avant en premier, cœur professionnel) */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-blue-900 mb-2 text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Traiter une paie
          </h3>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            Le traitement complet d'un salarié : employeur, éléments de rémunération, calcul détaillé et fiche exportable.
          </p>
          <div className="grid grid-cols-1 max-w-xl mx-auto gap-6">
            {categorieTraiter.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-yellow-400 bg-white">
                    <div className="p-8 flex items-start gap-4">
                      <div className={`w-14 h-14 flex-shrink-0 rounded-lg bg-gradient-to-br ${calc.color} flex items-center justify-center`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-blue-900 mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {calc.title}
                        </h4>
                        <p className="text-gray-600 text-sm">{calc.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section : Calculer (réponses rapides) */}
      <section id="calculateurs" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-blue-900 mb-2 text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Calculer
          </h3>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            Une réponse rapide à une question précise, sans dossier complet à monter.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorieCalculer.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white">
                    <div className="p-6">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${calc.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        {calc.title}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {calc.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section : Préparer une déclaration */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-blue-900 mb-2 text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Préparer une déclaration
          </h3>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            Saisissez ou importez vos données, contrôlez-les, puis générez et testez votre fichier de déclaration CNSS.
          </p>
          <div className="grid grid-cols-1 max-w-xl mx-auto gap-6">
            {categorieDeclarer.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white">
                    <div className="p-8 flex items-start gap-4">
                      <div className={`w-14 h-14 flex-shrink-0 rounded-lg bg-gradient-to-br ${calc.color} flex items-center justify-center`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-blue-900 mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {calc.title}
                        </h4>
                        <p className="text-gray-600 text-sm">{calc.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <p className="text-center mt-4">
            <Link href="/calculateurs/testeur-txt-cnss" className="text-blue-700 hover:underline text-sm">
              Déjà un fichier TXT généré ailleurs ? Testez sa conformité →
            </Link>
          </p>
        </div>
      </section>
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-blue-900 mb-12 text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Pourquoi LE FIDUCIAIRE ?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h4 className="text-xl font-semibold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Sécurisé
              </h4>
              <p className="text-gray-600">
                Vos données ne sont jamais stockées. Tous les calculs se font localement sur votre appareil.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h4 className="text-xl font-semibold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Rapide
              </h4>
              <p className="text-gray-600">
                Obtenez vos résultats instantanément sans attendre. Interface optimisée et réactive.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h4 className="text-xl font-semibold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Gratuit
              </h4>
              <p className="text-gray-600">
                Aucun frais caché. Utilisez tous nos calculateurs gratuitement, à tout moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-100">
              © 2026 LE FIDUCIAIRE. Tous droits réservés.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-blue-100 hover:text-white transition-colors">
                Mentions légales
              </a>
              <a href="#" className="text-blue-100 hover:text-white transition-colors">
                Confidentialité
              </a>
              <a href="#" className="text-blue-100 hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
