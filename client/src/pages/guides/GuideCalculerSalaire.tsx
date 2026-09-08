import GuideArticle from "./GuideArticle";

/**
 * Guide SEO : Comment calculer un salaire brut en net en Tunisie ?
 * Cible : /guides/calculer-salaire-brut-net-tunisie
 * Requête cible : "calculer salaire brut net tunisie"
 */

export default function GuideCalculerSalaire() {
  return (
    <GuideArticle
      title="Comment calculer un salaire brut en net en Tunisie ?"
      description="Méthode complète pour convertir un salaire brut en salaire net en Tunisie, en appliquant les retenues CNSS, IRPP, CSS et les avantages exclus du Décret 2003-1098."
      reponseDirecte={
        <>
          <p>
            En Tunisie, le passage du salaire brut au salaire net s'effectue en déduisant
            du brut la cotisation CNSS (6,68 % de la part salariale, plafonnée à un
            certain montant), l'IRPP (impôt sur le revenu progressif) et la contribution
            de solidarité sociale (CSS de 1 %). Le net à payer est le reste après ces
            trois retenues principales.
          </p>
        </>
      }
      sections={[
        {
          heading: "Étape 1 — Cotisation CNSS salariale",
          content: (
            <>
              <p>
                La cotisation CNSS salariale est prélevée sur le salaire brut dans la
                limite d'un plafond mensuel. Pour le régime non agricole, le taux
                salarial est de <strong>6,68 %</strong> appliqué au brut plafonné.
                En 2025-2026, le plafond CNSS est de 6 fois le SMIG (soit
                environ 3 648 DT/mois). Tout ce qui dépasse ce plafond n'est pas
                soumis à la cotisation CNSS.
              </p>
              <p>
                <strong>Formule :</strong> CNSS salariale = min(Brut, Plafond) × 6,68 %
              </p>
            </>
          ),
        },
        {
          heading: "Étape 2 — Abattement frais professionnels",
          content: (
            <>
              <p>
                Avant de calculer l'IRPP, on déduit un abattement pour frais
                professionnels de <strong>10 % du revenu imposable</strong> (brut moins
                CNSS), plafonné à <strong>2 000 DT par an</strong> (soit 166,667 DT/mois).
                Cet abattement est automatique et ne nécessite aucun justificatif.
              </p>
            </>
          ),
        },
        {
          heading: "Étape 3 — IRPP (Impôt sur le Revenu des Personnes Physiques)",
          content: (
            <>
              <p>
                L'IRPP est un impôt progressif appliqué à l'assiette imposable nette
                (brut − CNSS − frais pro − déductions familiales). Le barème 2025
                comporte 5 tranches allant de 0 % à 35 %. Les déductions familiales
                incluent 360 DT/an pour chef de famille, 100 DT/an par enfant et
                1 000 DT/an par étudiant sans bourse.
              </p>
              <p>
                Le simulateur de LE FIDUCIAIRE intègre ce barème officiel et toutes
                les déductions applicables pour un résultat conforme.
              </p>
            </>
          ),
        },
        {
          heading: "Étape 4 — CSS (Contribution de Solidarité Sociale)",
          content: (
            <>
              <p>
                La CSS est une contribution de <strong>1 %</strong> appliquée sur
                l'assiette imposable après déduction des frais professionnels. Elle
                s'ajoute à l'IRPP dans les retenues totales.
              </p>
            </>
          ),
        },
        {
          heading: "Formule récapitulative",
          content: (
            <>
              <p>
                <strong>Net à payer = Brut − CNSS − IRPP − CSS</strong>
              </p>
              <p>
                Où : CNSS = min(Brut, Plafond) × 6,68 %, IRPP = barème progressif
                (assiette nette), CSS = assiette × 1 %.
              </p>
            </>
          ),
        },
      ]}
      ctaLabel="Calculer un salaire"
      ctaHref="/calculateurs/calculer-salaire"
    />
  );
}
