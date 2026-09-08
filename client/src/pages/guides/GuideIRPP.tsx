import GuideArticle from "./GuideArticle";

/**
 * Guide SEO : Comprendre et calculer l'IRPP en Tunisie
 * Cible : /guides/comprendre-calculer-irpp-tunisie
 * Requête cible : "calculer IRPP tunisie"
 */

export default function GuideIRPP() {
  return (
    <GuideArticle
      title="Comprendre et calculer l'IRPP en Tunisie"
      description="Guide complet sur l'impôt sur le revenu des personnes physiques en Tunisie : barème progressif, déductions familiales, frais professionnels et simulateur interactif."
      reponseDirecte={
        <>
          <p>
            L'IRPP tunisien est un impôt progressif sur le revenu annuel. Après déduction
            de la cotisation CNSS (9,68 % de la part salariale sur le revenu annuel),
            des frais professionnels (10 % plafonnés à 2 000 DT/an) et des déductions
            familiales, le barème à 5 tranches (de 0 % à 35 %) est appliqué. Le
            montant annuel est ensuite divisé par 12 pour obtenir le prélèvement mensuel.
          </p>
        </>
      }
      sections={[
        {
          heading: "Barème IRPP 2025",
          content: (
            <>
              <p>Le barème progressif de l'IRPP en Tunisie pour l'année 2025 est le suivant :</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[320px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-muted-foreground">
                      <th className="text-left py-2 pr-4">Tranche de revenu (DT/an)</th>
                      <th className="text-right py-2">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">0 — 5 000</td>
                      <td className="py-2 text-right">0 %</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">5 001 — 10 000</td>
                      <td className="py-2 text-right">26 %</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">10 001 — 20 000</td>
                      <td className="py-2 text-right">28 %</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">20 001 — 30 000</td>
                      <td className="py-2 text-right">32 %</td>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-2 pr-4">30 001 — 50 000</td>
                      <td className="py-2 text-right">35 %</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Plus de 50 000</td>
                      <td className="py-2 text-right">35 %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          heading: "Déductions familiales",
          content: (
            <>
              <p>
                Les déductions familiales réduisent l'assiette imposable et donc l'IRPP.
                Elles sont calculées annuellement :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Chef de famille :</strong> 360 DT/an (si marié, veuf ou divorcé avec enfants)</li>
                <li><strong>Enfant :</strong> 100 DT/an par enfant à charge de moins de 20 ans</li>
                <li><strong>Étudiant sans bourse :</strong> 1 000 DT/an par étudiant à charge</li>
                <li><strong>Enfant handicapé :</strong> 2 000 DT/an</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Frais professionnels",
          content: (
            <>
              <p>
                Un abattement forfaitaire de <strong>10 % du revenu imposable</strong>
                (après déduction CNSS) est accordé, plafonné à <strong>2 000 DT/an</strong>.
                Il est automatiquement appliqué et ne nécessite aucun justificatif de
                frais réels.
              </p>
            </>
          ),
        },
        {
          heading: "Exemple de calcul",
          content: (
            <>
              <p>
                Pour un salarié célibataire avec 18 000 DT/an de revenu brut :
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>CNSS = 18 000 × 9,68 % = 1 742,400 DT</li>
                <li>Revenu imposable = 18 000 − 1 742,400 = 16 257,600 DT</li>
                <li>Frais pro = min(16 257,600 × 10 %, 2 000) = 1 625,760 DT</li>
                <li>Assiette = 16 257,600 − 1 625,760 = 14 631,840 DT</li>
                <li>IRPP calculé par tranches = montant selon le barème ci-dessus</li>
              </ol>
              <p>
                Le calculateur interactif de LE FIDUCIAIRE réalise ce calcul
                instantanément avec toutes les déductions applicables.
              </p>
            </>
          ),
        },
      ]}
      ctaLabel="Calculateur IRPP"
      ctaHref="/calculateurs/irpp"
    />
  );
}
