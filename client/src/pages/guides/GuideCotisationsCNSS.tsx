import GuideArticle from "./GuideArticle";

/**
 * Guide SEO : Cotisations CNSS — Taux salariaux et patronaux
 * Cible : /guides/cotisations-cnss-taux-salariaux-patronaux
 * Requête cible : "taux cotisation CNSS tunisie salariaux patronaux"
 */

export default function GuideCotisationsCNSS() {
  return (
    <GuideArticle
      title="Cotisations CNSS : Taux salariaux et patronaux"
      description="Détail des taux de cotisation CNSS en Tunisie : part salariale, part patronale, plafond, répartition par branche et impact sur le salaire net."
      reponseDirecte={
        <>
          <p>
            En Tunisie, les cotisations CNSS sont réparties entre l'employé et l'employeur.
            La <strong>part salariale</strong> s'élève à 6,68 % du salaire plafonné et est
            déduite du brut. La <strong>part patronale</strong> s'élève à 16,57 % du salaire
            plafonné et est à la charge exclusive de l'employeur. Le plafond mensuel de
            cotisation est de 6 fois le SMIG (environ 3 648 DT en 2025-2026).
          </p>
        </>
      }
      sections={[
        {
          heading: "Part salariale — 6,68 %",
          content: (
            <>
              <p>
                La part salariale est directement déduite du salaire brut. Elle se
                décompose en deux branches :
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[320px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-muted-foreground">
                      <th className="text-left py-2 pr-4">Branche</th>
                      <th className="text-right py-2">Taux salarial</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">Assurance sociale (maladie, maternité, décès)</td>
                      <td className="py-2 text-right">5,68 %</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Assurance vieillesse, invalidité, survivants</td>
                      <td className="py-2 text-right">1,00 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                <strong>Total salarial : 6,68 %</strong> du salaire dans la limite du plafond.
              </p>
            </>
          ),
        },
        {
          heading: "Part patronale — 16,57 %",
          content: (
            <>
              <p>
                La part patronale est à la charge de l'employeur. Elle ne figure pas sur
                le bulletin de paie du salarié (sauf mention informative). Elle se
                décompose comme suit :
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[320px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-muted-foreground">
                      <th className="text-left py-2 pr-4">Branche</th>
                      <th className="text-right py-2">Taux patronal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">Assurance sociale (maladie, maternité, décès)</td>
                      <td className="py-2 text-right">7,57 %</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Assurance vieillesse, invalidité, survivants</td>
                      <td className="py-2 text-right">9,00 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                <strong>Total patronal : 16,57 %</strong> du salaire dans la limite du plafond.
              </p>
            </>
          ),
        },
        {
          heading: "Plafond de cotisation",
          content: (
            <>
              <p>
                Les cotisations sont calculées sur la base du salaire brut dans la limite
                d'un plafond mensuel. Ce plafond correspond à <strong>6 fois le SMIG</strong>
                en vigueur. Pour 2025-2026, avec un SMIG de 608 DT, le plafond est de
                <strong> 3 648 DT/mois</strong>. Tout ce qui dépasse ce plafond n'est pas
                soumis aux cotisations CNSS.
              </p>
            </>
          ),
        },
        {
          heading: "Impact sur le salaire net",
          content: (
            <>
              <p>
                La cotisation salariale de 6,68 % est la première déduction opérée sur le
                salaire brut. Pour un salarié à 2 000 DT/mois (en-dessous du plafond),
                la CNSS salariale s'élève à 133,600 DT. Le montant restant (1 866,400 DT)
                constitue le revenu imposable servant de base au calcul de l'IRPP et de
                la CSS.
              </p>
              <p>
                La cotisation patronale de 16,57 % (soit 331,400 DT pour le même salaire)
                est un coût employeur qui ne réduit pas le net du salarié mais figure
                parfois à titre informatif sur la fiche de paie.
              </p>
            </>
          ),
        },
      ]}
      ctaLabel="Référentiel légal"
      ctaHref="/referentiel-avantages-exclus"
    />
  );
}
