import GuideArticle from "./GuideArticle";

/**
 * Guide SEO : Contrôle des fichiers de déclaration CNSS (Format TXT)
 * Cible : /guides/controle-fichier-declaration-cnss-txt
 * Requête cible : "fichier déclaration CNSS TXT 122 caractères"
 */

export default function GuideFichierTXT() {
  return (
    <GuideArticle
      title="Contrôle des fichiers de déclaration CNSS (Format TXT)"
      description="Spécifications du fichier TXT de 122 caractères pour les déclarations CNSS, contrôles de validité, erreurs courantes et testeur interactif."
      reponseDirecte={
        <>
          <p>
            Le fichier de déclaration CNSS au format TXT est un fichier texte structuré
            où chaque ligne contient exactement <strong>122 caractères</strong>. Chaque
            position correspond à un champ précis (matricule employeur, période, données
            salarié, etc.). Tout écart de longueur ou de format invalide la ligne et
            peut entraîner le rejet de la déclaration par la CNSS.
          </p>
        </>
      }
      sections={[
        {
          heading: "Structure du fichier TXT",
          content: (
            <>
              <p>
                Le fichier est composé de trois types de lignes, identifiées par leur
                premier caractère (zone « type d'enregistrement ») :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Enregistrement Employeur (type A)</strong> — identité, matricule, période de déclaration</li>
                <li><strong>Enregistrement Salarié (type B)</strong> — données individuelles, salaire, jours travaillés</li>
                <li><strong>Enregistrement Total (type C)</strong> — totaux de contrôle, effectif, masse salariale</li>
              </ul>
              <p>
                Chaque enregistrement fait exactement 122 caractères, y compris les
                espaces de remplissage (padding à droite pour les zones alphabétiques,
                zéros à gauche pour les zones numériques).
              </p>
            </>
          ),
        },
        {
          heading: "Contrôles de validité essentiels",
          content: (
            <>
              <p>Les contrôles à effectuer avant la soumission incluent :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Longueur exacte de chaque ligne = 122 caractères</li>
                <li>Type d'enregistrement valide (A, B ou C)</li>
                <li>Matricule employeur au format numérique correct</li>
                <li>Période de déclaration cohérente (mois 01-12, année 4 chiffres)</li>
                <li>Nombre de jours travaillés entre 0 et 30 (ou 31 selon le mois)</li>
                <li>Montants au format numérique sans décimales ou avec le bon nombre de positions</li>
                <li>Cohérence entre les totaux (type C) et la somme des lignes salarié (type B)</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Erreurs courantes",
          content: (
            <>
              <p>
                Les erreurs les plus fréquentes qui entraînent un rejet par la CNSS :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Lignes de longueur différente de 122 (caractères manquants ou excédentaires)</li>
                <li>Caractères accentués ou spéciaux dans les zones alphabétiques</li>
                <li>Montants avec des séparateurs de milliers (espaces ou virgules)</li>
                <li>Matricule employeur erroné ou absent</li>
                <li>Incohérence entre le total déclaré et la somme des lignes salarié</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Testeur de fichier TXT",
          content: (
            <>
              <p>
                LE FIDUCIAIRE propose un testeur de fichier TXT CNSS qui vérifie
                automatiquement toutes ces règles. Il charge votre fichier, analyse
                chaque ligne et signale les anomalies avec leur position exacte.
                Le contrôle s'effectue entièrement en local dans votre navigateur —
                votre fichier n'est jamais transmis.
              </p>
            </>
          ),
        },
      ]}
      ctaLabel="Testeur TXT CNSS"
      ctaHref="/calculateurs/testeur-txt-cnss"
    />
  );
}
