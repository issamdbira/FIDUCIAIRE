import JSZip from "jszip";
import type { DeclarationCNSS, EmployeurCNSS } from "./types";

/** Télécharge toutes les déclarations sous forme d'un unique fichier ZIP. */
export async function telechargerZipDeclarations(emp: EmployeurCNSS, declarations: DeclarationCNSS[]): Promise<void> {
  const zip = new JSZip();
  declarations.forEach((decl) => {
    if (decl.txtPreview) zip.file(decl.generatedFilename || decl.fileName, decl.txtPreview);
  });
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `CNSS_${emp.num}_batch.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
