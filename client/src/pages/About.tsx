import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";

/**
 * Design: Minimaliste & Professionnel
 * Page À Propos - LE FIDUCIAIRE
 */

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Titre */}
          <h1 className="text-5xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
            À Propos de LE FIDUCIAIRE
          </h1>

          {/* Mission */}
          <Card className="p-8 border-0 shadow-sm mb-8 bg-gradient-to-br from-blue-50 to-blue-100">
            <h2 className="text-2xl font-bold text-blue-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Notre Mission
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              LE FIDUCIAIRE est une plateforme gratuite et transparente dédiée à simplifier les calculs sociaux et fiscaux 
              pour les citoyens tunisiens. Notre objectif est de rendre accessible à tous les informations complexes relatives 
              à la paie, la retraite et l'impôt sur le revenu.
            </p>
          </Card>

          {/* Valeurs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 border-0 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Sécurité
              </h3>
              <p className="text-gray-600">
                Vos données ne sont jamais stockées. Tous les calculs se font localement sur votre appareil.
              </p>
            </Card>

            <Card className="p-6 border-0 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Transparence
              </h3>
              <p className="text-gray-600">
                Tous les calculs sont basés sur les réglementations officielles tunisiennes actualisées.
              </p>
            </Card>

            <Card className="p-6 border-0 shadow-sm">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Gratuit
              </h3>
              <p className="text-gray-600">
                Aucun frais caché. Utilisez tous nos calculateurs gratuitement, à tout moment.
              </p>
            </Card>
          </div>

          {/* Calculateurs */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Nos Calculateurs
            </h2>

            <div className="space-y-4">
              <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Calculateur de Paie CNSS
                </h3>
                <p className="text-gray-600 mb-3">
                  Calcule votre salaire net à partir du brut pour les salariés du secteur privé. 
                  Prend en compte les cotisations CNSS, l'IRPP et la CSS selon votre situation familiale.
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Basé sur:</strong> Réglementation CNSS 2025
                </p>
              </Card>

              <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Calculateur de Retraite CNSS
                </h3>
                <p className="text-gray-600 mb-3">
                  Estime votre pension de retraite en fonction de votre salaire moyen et votre durée de cotisation. 
                  Applique les indices d'actualisation et le barème de taux de pension.
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Basé sur:</strong> Réglementation CNSS 2025
                </p>
              </Card>

              <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Calculateur IRPP
                </h3>
                <p className="text-gray-600 mb-3">
                  Calcule votre impôt annuel sur le revenu avec le barème progressif 2025. 
                  Gère les déductions fiscales et les crédits d'impôt selon votre situation.
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Basé sur:</strong> Barème IRPP 2025 - Ministère des Finances
                </p>
              </Card>

              <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Calculateur de Paie CNRPS
                </h3>
                <p className="text-gray-600 mb-3">
                  Calcule le salaire net des fonctionnaires publics affiliés à la CNRPS. 
                  Applique le taux de cotisation CNRPS (8.5%) et les déductions fiscales.
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Basé sur:</strong> Réglementation CNRPS 2025
                </p>
              </Card>
            </div>
          </div>

          {/* Sources Réglementaires */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Sources Réglementaires
            </h2>

            <div className="space-y-4">
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  CNSS (Caisse Nationale de Sécurité Sociale)
                </h3>
                <p className="text-gray-600 mb-4">
                  Organisme responsable de la couverture sociale des salariés du secteur privé en Tunisie.
                </p>
                <a
                  href="https://www.cnss.tn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold"
                >
                  Visiter le site CNSS <ExternalLink className="w-4 h-4" />
                </a>
              </Card>

              <Card className="p-6 border-0 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  CNRPS (Caisse Nationale de Retraite et de Prévoyance Sociale)
                </h3>
                <p className="text-gray-600 mb-4">
                  Organisme responsable de la retraite et de la prévoyance sociale des fonctionnaires publics.
                </p>
                <a
                  href="https://www.cnrps.tn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold"
                >
                  Visiter le site CNRPS <ExternalLink className="w-4 h-4" />
                </a>
              </Card>

              <Card className="p-6 border-0 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Ministère des Finances
                </h3>
                <p className="text-gray-600 mb-4">
                  Source officielle pour la fiscalité, les barèmes IRPP et les réglementations fiscales.
                </p>
                <a
                  href="https://www.finances.gov.tn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold"
                >
                  Visiter le site des Finances <ExternalLink className="w-4 h-4" />
                </a>
              </Card>
            </div>
          </div>

          {/* Disclaimer */}
          <Card className="p-8 border-0 shadow-sm bg-yellow-50 border border-yellow-200">
            <h2 className="text-xl font-bold text-yellow-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              ⚠️ Avis Important
            </h2>
            <p className="text-yellow-900 leading-relaxed">
              LE FIDUCIAIRE fournit des estimations basées sur les réglementations officielles. 
              Ces calculs sont fournis à titre informatif uniquement et ne constituent pas des conseils fiscaux ou sociaux. 
              Pour des décisions importantes concernant votre paie, votre retraite ou vos impôts, 
              consultez les autorités compétentes (CNSS, CNRPS, Ministère des Finances) ou un professionnel qualifié.
            </p>
          </Card>

          {/* Contact */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-blue-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Besoin d'aide ?
            </h2>
            <p className="text-gray-600 mb-6">
              Pour toute question ou suggestion concernant LE FIDUCIAIRE, n'hésitez pas à nous contacter.
            </p>
            <Link href="/">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-8">
                Retour aux Calculateurs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 mt-12">
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
