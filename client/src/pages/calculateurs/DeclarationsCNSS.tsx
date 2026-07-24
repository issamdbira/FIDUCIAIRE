import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Plus, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import { construireNomFichier, telechargerTexte } from "@/lib/cnss-declarations/generator";
import { importerCSV, importerExcel, regenererApercu } from "@/lib/cnss-declarations/import";
import { telechargerZipDeclarations } from "@/lib/cnss-declarations/zip";
import type { DeclarationCNSS, EmployeurCNSS, SalarieCNSS } from "@/lib/cnss-declarations/types";

/**
 * Générateur de déclarations CNSS trimestrielles (fichiers TXT 122 caractères).
 * Porté depuis l'outil de référence CNSS-DS. Logique de formatage pure,
 * aucun taux/barème (contrairement au générateur de fiche de paie).
 * Traitement 100% local : les données restent dans le navigateur (localStorage).
 */

const STORAGE_EMPLOYEUR = "cnss_decl_employeur";
const STORAGE_DECLARATIONS = "cnss_decl_declarations";

const EMPLOYEUR_VIDE: EmployeurCNSS = { num: "", cle: "", code: "0000", anneeDef: new Date().getFullYear() };

export default function DeclarationsCNSS() {
  const [employeur, setEmployeur] = useState<EmployeurCNSS>(EMPLOYEUR_VIDE);
  const [declarations, setDeclarations] = useState<DeclarationCNSS[]>([]);
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [trimestre, setTrimestre] = useState("1");
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [lignes, setLignes] = useState<SalarieCNSS[]>([{ matricule: "", cle: "", nom: "", cin: "", salaire: "" }]);

  useEffect(() => {
    const rawEmp = localStorage.getItem(STORAGE_EMPLOYEUR);
    if (rawEmp) setEmployeur(JSON.parse(rawEmp));
    const rawDecl = localStorage.getItem(STORAGE_DECLARATIONS);
    if (rawDecl) setDeclarations(JSON.parse(rawDecl));
  }, []);

  const notifier = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const sauvegarderEmployeur = () => {
    localStorage.setItem(STORAGE_EMPLOYEUR, JSON.stringify(employeur));
    // Bug corrigé : régénérer les déclarations déjà créées avec le nouvel employeur,
    // sinon elles gardent l'ancien N°/Clé/Code dans le TXT (comme le faisait le HTML de référence).
    if (declarations.length > 0) {
      const regenerees = declarations.map((d) => regenererApercu(employeur, d));
      sauvegarderDeclarations(regenerees);
    }
    notifier("Employeur sauvegardé", "success");
  };

  const sauvegarderDeclarations = (decls: DeclarationCNSS[]) => {
    setDeclarations(decls);
    localStorage.setItem(STORAGE_DECLARATIONS, JSON.stringify(decls));
  };

  const ajouterLigne = () => setLignes([...lignes, { matricule: "", cle: "", nom: "", cin: "", salaire: "" }]);
  const supprimerLigne = (idx: number) => setLignes(lignes.filter((_, i) => i !== idx));
  const modifierLigne = (idx: number, patch: Partial<SalarieCNSS>) =>
    setLignes(lignes.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const genererDeclarationManuelle = () => {
    const employees = lignes.filter((l) => l.matricule || l.nom);
    if (employees.length === 0) {
      notifier("Ajoutez au moins un salarié", "error");
      return;
    }
    let decl: DeclarationCNSS = {
      id: Date.now() + "-manuel",
      fileName: `manuel-T${trimestre}-${annee}`,
      trimester: trimestre,
      year: annee,
      employees,
      totalSalary: employees.reduce((s, e) => s + (parseInt(e.salaire, 10) || 0), 0),
      errorsList: [],
      txtPreview: "",
      generatedFilename: "",
    };
    decl = regenererApercu(employeur, decl);
    sauvegarderDeclarations([...declarations, decl]);
    setLignes([{ matricule: "", cle: "", nom: "", cin: "", salaire: "" }]);
    notifier("Déclaration ajoutée", "success");
  };

  const importerFichiers = async (files: File[]) => {
    for (const f of files) {
      let result;
      if (f.name.endsWith(".csv")) result = await importerCSV(f);
      else if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) result = await importerExcel(f);
      else continue;

      if (result.error || !result.declaration) {
        notifier(result.error || "Erreur d'import", "error");
        continue;
      }
      if (declarations.find((d) => d.fileName === result.declaration!.fileName)) {
        notifier(`⚠️ ${result.declaration.fileName} existe déjà`, "error");
        continue;
      }
      const decl = regenererApercu(employeur, result.declaration);
      sauvegarderDeclarations([...declarations, decl]);
    }
    notifier("Import terminé", "success");
  };

  const supprimerDeclaration = (idx: number) => {
    if (!confirm("Supprimer cette déclaration ?")) return;
    sauvegarderDeclarations(declarations.filter((_, i) => i !== idx));
  };

  const toutEffacer = () => {
    if (!confirm("Tout réinitialiser (employeur + déclarations) ?")) return;
    setEmployeur(EMPLOYEUR_VIDE);
    sauvegarderDeclarations([]);
    localStorage.removeItem(STORAGE_EMPLOYEUR);
    notifier("Tout réinitialisé", "success");
  };

  const nomFichierExemple = employeur.num ? construireNomFichier(employeur, "X", "YYYY") : "DS000000000000.XYYYY";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
          <Link href="/calculateurs/testeur-txt-cnss">
            <Button variant="outline" className="text-blue-700 border-blue-300">
              Tester un fichier TXT existant →
            </Button>
          </Link>
        </div>
      </header>

      {notification && (
        <div className={`px-4 py-2 text-sm text-center ${notification.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {notification.message}
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Déclarations CNSS Trimestrielles
            </h1>
            <p className="text-gray-600">
              Générez vos fichiers de déclaration CNSS (format TXT 122 caractères) — saisie manuelle ou import CSV/Excel. Traitement 100% local.
            </p>
          </div>

          {/* Employeur */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Configuration Employeur</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs mb-1 block">N° Employeur *</Label>
                <Input maxLength={8} value={employeur.num} onChange={(e) => setEmployeur({ ...employeur, num: e.target.value })} placeholder="00045289" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Clé Employeur *</Label>
                <Input maxLength={2} value={employeur.cle} onChange={(e) => setEmployeur({ ...employeur, cle: e.target.value })} placeholder="87" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Code Exploitation</Label>
                <Input maxLength={4} value={employeur.code} onChange={(e) => setEmployeur({ ...employeur, code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Nom Entreprise</Label>
                <Input value={employeur.nom || ""} onChange={(e) => setEmployeur({ ...employeur, nom: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={sauvegarderEmployeur} className="bg-blue-700 hover:bg-blue-800">Sauvegarder</Button>
              <span className="text-xs bg-gray-100 px-3 py-1.5 rounded font-mono">{nomFichierExemple}</span>
            </div>
          </Card>

          {/* Import CSV/Excel */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Import CSV / Excel</h2>
            <p className="text-xs text-gray-500">
              Nom de fichier attendu : <code>nom-TRIMESTRE-ANNEE.csv</code> (ex: paie-1-2026.csv). Colonnes : Matricule, Clé, Nom, CIN, Salaire (millimes).
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50">
              <Upload className="w-6 h-6 text-blue-400" />
              <span className="text-sm text-gray-600">Glissez ou cliquez pour importer un fichier CSV/Excel</span>
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) importerFichiers(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
          </Card>

          {/* Saisie manuelle */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Saisie manuelle</h2>
            <div className="flex gap-4">
              <div>
                <Label className="text-xs mb-1 block">Trimestre</Label>
                <select className="border rounded px-3 py-2 text-sm" value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
                  <option value="1">T1</option>
                  <option value="2">T2</option>
                  <option value="3">T3</option>
                  <option value="4">T4</option>
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Année</Label>
                <Input type="number" className="w-28" value={annee} onChange={(e) => setAnnee(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-2">Matricule</th>
                    <th className="py-2 pr-2">Clé</th>
                    <th className="py-2 pr-2">Nom</th>
                    <th className="py-2 pr-2">CIN</th>
                    <th className="py-2 pr-2">Salaire (millimes)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1 pr-2"><Input value={l.matricule} onChange={(e) => modifierLigne(idx, { matricule: e.target.value })} /></td>
                      <td className="py-1 pr-2"><Input value={l.cle} onChange={(e) => modifierLigne(idx, { cle: e.target.value })} /></td>
                      <td className="py-1 pr-2"><Input value={l.nom} onChange={(e) => modifierLigne(idx, { nom: e.target.value })} /></td>
                      <td className="py-1 pr-2"><Input value={l.cin} onChange={(e) => modifierLigne(idx, { cin: e.target.value })} /></td>
                      <td className="py-1 pr-2"><Input value={l.salaire} onChange={(e) => modifierLigne(idx, { salaire: e.target.value })} /></td>
                      <td>
                        <Button variant="ghost" size="icon" onClick={() => supprimerLigne(idx)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={ajouterLigne} className="gap-2 border-blue-300 text-blue-700">
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
              <Button onClick={genererDeclarationManuelle} className="bg-blue-700 hover:bg-blue-800">
                Générer la déclaration
              </Button>
            </div>
          </Card>

          {/* Liste des déclarations */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-blue-900">Déclarations ({declarations.length})</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => (declarations.length ? telechargerZipDeclarations(employeur, declarations) : notifier("Aucune déclaration", "error"))}
                >
                  <Download className="w-4 h-4" /> ZIP (toutes)
                </Button>
                <Button variant="ghost" className="text-red-600" onClick={toutEffacer}>Réinitialiser tout</Button>
              </div>
            </div>

            {declarations.length === 0 && <p className="text-gray-400 text-sm">Aucune déclaration pour l'instant.</p>}

            {declarations.map((decl, idx) => {
              const valide = decl.errorsList.length === 0;
              const estOuverte = ouvertes[decl.id];
              return (
                <div key={decl.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
                    onClick={() => setOuvertes({ ...ouvertes, [decl.id]: !estOuverte })}
                  >
                    <div>
                      <p className="font-medium">{decl.fileName}</p>
                      <p className="text-xs text-gray-500">T{decl.trimester}/{decl.year} — {decl.generatedFilename}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>👥 {decl.employees.length}</span>
                      <span>{valide ? "✅" : "⚠️"}</span>
                    </div>
                  </div>
                  {estOuverte && (
                    <div className="p-4 space-y-3">
                      {!valide && (
                        <div className="text-xs text-red-600">
                          {decl.errorsList.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                      <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded overflow-x-auto">{decl.txtPreview}</pre>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => telechargerTexte(decl.txtPreview, decl.generatedFilename)}>Télécharger TXT</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => supprimerDeclaration(idx)}>Supprimer</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
