import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload } from "lucide-react";
import { Link } from "wouter";
import { testerFichierTXT } from "@/lib/cnss-declarations/tester";
import type { TesteurResult } from "@/lib/cnss-declarations/types";

/**
 * Testeur de fichiers TXT CNSS (validation du format 122 caractères/ligne).
 * Porté depuis l'outil de référence CNSS-DS. Logique de format pure.
 */
export default function TesteurTXT() {
  const [resultats, setResultats] = useState<TesteurResult[]>([]);
  const [dragging, setDragging] = useState(false);

  const testerFichiers = async (files: File[]) => {
    const res: TesteurResult[] = [];
    for (const f of files) {
      res.push(await testerFichierTXT(f));
    }
    setResultats(res);
  };

  const totalSalaries = resultats.filter((r) => r.valid).reduce((s, r) => s + r.totalSalaries, 0);
  const totalSalaireDT = resultats.filter((r) => r.valid).reduce((s, r) => s + r.totalSalaireDT, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/calculateurs/declarations-cnss">
            <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
              <ArrowLeft className="w-4 h-4" />
              Retour aux déclarations
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Testeur de Fichiers TXT CNSS
            </h1>
            <p className="text-gray-600">
              Importez un ou plusieurs fichiers TXT générés (par ce site ou tout autre outil) pour vérifier leur conformité au format CNSS 122 caractères/ligne.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-gray-700">
            <strong>Spécification CNSS 2012</strong> — chaque ligne fait 122 caractères fixes :
            N°Employeur(8) + Clé(2) + Code(4) + Trimestre(1) + Année(4) + Page(3) + Ligne(2) + Matricule(8)
            + Clé(2) + Nom(60) + CIN(8) + Salaire millimes(10) + Zone vierge(10).
          </div>

          <Card
            className={`p-8 border-2 border-dashed text-center cursor-pointer ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length) testerFichiers(files);
            }}
          >
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload className="w-8 h-8 text-blue-400" />
              <span className="text-gray-600">Glissez-déposez vos fichiers TXT ici, ou cliquez pour sélectionner</span>
              <input
                type="file"
                multiple
                accept=".txt,*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) testerFichiers(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
          </Card>

          {resultats.length > 0 && (
            <div className="space-y-4">
              {resultats.map((r, i) => (
                <Card key={i} className="p-6 border-0 shadow-sm">
                  <p className="font-semibold text-blue-900">📄 {r.fileName}</p>
                  {r.valid ? (
                    <>
                      <p className="text-sm text-green-700 mt-1">
                        ✅ Valide — 👥 {r.totalSalaries} salarié(s) — 💰 {r.totalSalaireDT.toFixed(3)} DT
                      </p>
                      {r.errors.length > 0 && (
                        <div className="text-sm text-red-600 mt-2">
                          ⚠️ Anomalies ({r.errors.length}) :
                          {r.errors.map((e, j) => <div key={j}>• {e}</div>)}
                        </div>
                      )}
                      <details className="mt-3">
                        <summary className="text-sm text-blue-700 cursor-pointer">Détail ligne par ligne</summary>
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="py-1 pr-2">Pg</th>
                                <th className="py-1 pr-2">Ln</th>
                                <th className="py-1 pr-2">Matricule/Clé</th>
                                <th className="py-1 pr-2">Nom</th>
                                <th className="py-1 pr-2">CIN</th>
                                <th className="py-1 pr-2">Salaire (DT)</th>
                                <th className="py-1 pr-2">Zone</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.employees.map((e, k) => (
                                <tr key={k} className="border-b">
                                  <td className="py-1 pr-2">{e.page}</td>
                                  <td className="py-1 pr-2">{e.ligne}</td>
                                  <td className="py-1 pr-2 font-mono">{e.matricule}/{e.cle}</td>
                                  <td className="py-1 pr-2">{e.nom}</td>
                                  <td className="py-1 pr-2 font-mono">{e.cin}</td>
                                  <td className="py-1 pr-2 font-mono">{e.salaireDT.toFixed(3)}</td>
                                  <td className={`py-1 pr-2 font-mono ${e.zoneOk ? "text-green-600" : "text-red-600"}`}>{e.zoneVierge}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">❌ {r.error || "Fichier invalide ou vide"}</p>
                  )}
                </Card>
              ))}

              <div className="p-4 bg-blue-50 rounded-lg text-sm">
                <strong>Récapitulatif global</strong>
                <br />📁 Fichiers testés : {resultats.length}
                <br />👥 Total salariés : {totalSalaries}
                <br />💰 Total salaires déclarés : {totalSalaireDT.toFixed(3)} DT
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
