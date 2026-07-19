import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Calculator, TrendingUp, FileText, DollarSign } from "lucide-react";

/**
 * Design: Minimaliste & Professionnel
 * Palette: Bleu marine + Blanc + Or
 * Typographie: Montserrat (titres) + Inter (corps)
 */

export default function Home() {
  const calculators = [
    {
      id: "paie-cnss",
      title: "Calculateur de Paie",
      description: "Calculez votre salaire net à partir du brut pour les salariés du secteur privé (CNSS)",
      icon: DollarSign,
      href: "/calculateurs/paie-cnss",
      color: "from-blue-600 to-blue-700"
    },
    {
      id: "retraite-cnss",
      title: "Pension de Retraite",
      description: "Estimez votre pension de retraite en fonction de votre ancienneté et salaire",
      icon: TrendingUp,
      href: "/calculateurs/retraite-cnss",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: "irpp",
      title: "Impôt sur le Revenu",
      description: "Calculez votre impôt annuel sur le revenu (IRPP) selon votre situation familiale",
      icon: FileText,
      href: "/calculateurs/irpp",
      color: "from-blue-700 to-blue-800"
    },
    {
      id: "paie-cnrps",
      title: "Paie Secteur Public",
      description: "Calculez la paie des fonctionnaires publics affiliés à la CNRPS",
      icon: Calculator,
      href: "/calculateurs/paie-cnrps",
      color: "from-blue-600 to-blue-700"
    },
    {
      id: "actualisation-salaire",
      title: "Actualisation des Salaires",
      description: "Actualisez un salaire brut par le coefficient CNSS de son année pour le calcul de la retraite",
      icon: TrendingUp,
      href: "/calculateurs/actualisation-salaire",
      color: "from-blue-500 to-blue-600"
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
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={() => document.getElementById("calculateurs")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir les calculateurs gratuits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Calculators Section */}
      <section id="calculateurs" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-blue-900 mb-4 text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Nos Calculateurs
          </h3>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Sélectionnez le calculateur qui correspond à votre besoin pour obtenir une estimation précise.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {calculators.map((calc) => {
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

      {/* Features Section */}
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
