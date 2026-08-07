import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { TrendingUp, FileText, DollarSign, ClipboardCheck, FileX } from "lucide-react";

export default function Home() {
  const categorieCalculer = [
    {
      id: "calculer-salaire",
      title: "Calculer un salaire",
      description: "Brut \u2192 Net ou Net \u2192 Brut, pour les salari\u00e9s du secteur priv\u00e9 (CNSS)",
      icon: DollarSign,
      href: "/calculateurs/calculer-salaire",
      color: "from-blue-600 to-blue-700",
    },
    {
      id: "irpp",
      title: "Calculer son imp\u00f4t sur le revenu",
      description: "Estimez votre IRPP annuel selon votre situation familiale",
      icon: FileText,
      href: "/calculateurs/irpp",
      color: "from-blue-700 to-blue-800",
    },
    {
      id: "retraite-cnss",
      title: "Estimer sa retraite",
      description: "Estimez votre pension de retraite selon votre anciennet\u00e9 et salaire",
      icon: TrendingUp,
      href: "/calculateurs/retraite-cnss",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "actualisation-salaire",
      title: "Actualiser un ancien salaire",
      description: "Actualisez un salaire par le coefficient CNSS de son ann\u00e9e (pour le calcul de retraite)",
      icon: TrendingUp,
      href: "/calculateurs/actualisation-salaire",
      color: "from-blue-500 to-blue-600",
    },
  ];

  const categorieTraiter = [
    {
      id: "fiche-de-paie",
      title: "G\u00e9n\u00e9rer une fiche de paie",
      description: "Employeur, logo, salari\u00e9, \u00e9l\u00e9ments de r\u00e9mun\u00e9ration, d\u00e9tail du calcul et export PDF",
      icon: FileText,
      href: "/fiche-de-paie",
      color: "from-blue-700 to-blue-900",
    },
  ];

  const categorieDeclarer = [
    {
      id: "declarations-cnss",
      title: "Pr\u00e9parer une d\u00e9claration CNSS",
      description: "Saisie ou import CSV/Excel, contr\u00f4le des donn\u00e9es, g\u00e9n\u00e9ration et test du fichier TXT",
      icon: ClipboardCheck,
      href: "/calculateurs/declarations-cnss",
      color: "from-blue-700 to-blue-800",
    },
    {
      id: "declarations-neant",
      title: "D\u00e9clarations N\u00e9ant",
      description: "G\u00e9n\u00e9rez par lot vos d\u00e9clarations n\u00e9ant (\u00c9tat I3 + Bordereau I16) avec calibrage PDF",
      icon: FileX,
      href: "/calculateurs/declarations-neant",
      color: "from-blue-600 to-blue-700",
    },
  ];

  const categorieReference = [
    {
      id: "referentiel-avantages-exclus",
      title: "R\u00e9f\u00e9rentiel des avantages exclus de cotisations",
      description: "Consultez les plafonds des avantages exclus de l'assiette CNSS (D\u00e9cret n\u00b0 2003-1098)",
      icon: FileText,
      href: "/referentiel-avantages-exclus",
      color: "from-blue-600 to-blue-700",
    },
  ];

  return (
    <div className="py-10">
      <div className="container mx-auto max-w-5xl">
        {/* Page title */}
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-foreground mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Vos Calculs Sociaux Simplifi\u00e9s
          </h1>
          <p className="text-muted-foreground">
            LE FIDUCIAIRE vous aide \u00e0 calculer votre paie, votre retraite et vos imp\u00f4ts en Tunisie.
          </p>
        </div>

        {/* Section : Traiter une paie */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Traiter une paie
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Le traitement complet d'un salari\u00e9 : employeur, \u00e9l\u00e9ments de r\u00e9mun\u00e9ration, calcul d\u00e9taill\u00e9 et fiche exportable.
          </p>
          <div className="grid grid-cols-1 max-w-xl gap-4">
            {categorieTraiter.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-accent">
                    <div className="p-6 flex items-start gap-4">
                      <div
                        className={`w-12 h-12 flex-shrink-0 rounded-md bg-gradient-to-br ${calc.color} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {calc.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{calc.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section : Calculer */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Calculer
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Une r\u00e9ponse rapide \u00e0 une question pr\u00e9cise, sans dossier complet \u00e0 monter.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorieCalculer.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <div className="p-6">
                      <div
                        className={`w-10 h-10 rounded-md bg-gradient-to-br ${calc.color} flex items-center justify-center mb-3`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        {calc.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">{calc.description}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Section : Pr\u00e9parer une d\u00e9claration */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Pr\u00e9parer une d\u00e9claration
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Saisissez ou importez vos donn\u00e9es, contr\u00f4lez-les, puis g\u00e9n\u00e9rez et testez votre fichier de d\u00e9claration CNSS.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl gap-4">
            {categorieDeclarer.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="p-6 flex items-start gap-4">
                      <div
                        className={`w-12 h-12 flex-shrink-0 rounded-md bg-gradient-to-br ${calc.color} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {calc.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{calc.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <p className="mt-3">
            <Link href="/calculateurs/testeur-txt-cnss" className="text-primary hover:underline text-sm">
              D\u00e9j\u00e0 un fichier TXT g\u00e9n\u00e9r\u00e9 ailleurs ? Testez sa conformit\u00e9 \u2192
            </Link>
          </p>
        </section>

        {/* Section : R\u00e9f\u00e9rentiel l\u00e9gal */}
        <section>
          <h2
            className="text-xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            R\u00e9f\u00e9rentiel l\u00e9gal
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Consultez les textes et bar\u00e8mes de r\u00e9f\u00e9rence utilis\u00e9s par les calculateurs.
          </p>
          <div className="grid grid-cols-1 max-w-xl gap-4">
            {categorieReference.map((calc) => {
              const Icon = calc.icon;
              return (
                <Link key={calc.id} href={calc.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <div className="p-6 flex items-start gap-4">
                      <div
                        className={`w-12 h-12 flex-shrink-0 rounded-md bg-gradient-to-br ${calc.color} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
                          {calc.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{calc.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
