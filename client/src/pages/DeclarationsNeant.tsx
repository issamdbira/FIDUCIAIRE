import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateFormulaireCNSS } from '@/lib/cnss-templates/pdfGenerator';
import { NEANT_CONFIG } from '@/lib/cnss-templates/config-neant';

export default function DeclarationsNeant() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Paramètres de calibrage
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [fontSize, setFontSize] = useState(11);

  // Données de test pour visualiser le rendu
  const previewData = {
    employeurNum: '12345678-99',
    trimestre: '3',
    annee: '2026'
  };

  const updatePreview = async () => {
    try {
      const pdfBytes = await generateFormulaireCNSS({
        templateUrl: NEANT_CONFIG.I3.templatePath,
        data: previewData,
        config: NEANT_CONFIG.I3,
        globalOffsetX: offsetX,
        globalOffsetY: offsetY,
        globalFontSize: fontSize,
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
    }
  };

  useEffect(() => {
    updatePreview();
  }, [offsetX, offsetY, fontSize]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Kiosque CNSS : Déclarations Néant</h1>
      <p className="text-muted-foreground">Calibrez l'impression avant de générer votre lot.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calibrage (Millimètres)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Décalage Horizontal (X)</Label>
                <Input type="number" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Décalage Vertical (Y)</Label>
                <Input type="number" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Taille du texte</Label>
                <Input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>
          
          <Button className="w-full bg-blue-900 text-white hover:bg-blue-800">
            Générer le lot complet
          </Button>
        </div>

        <Card className="md:col-span-2 flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="text-lg">Aperçu en direct (État Récapitulatif I3)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 bg-slate-100 overflow-hidden">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title="Aperçu PDF" />
            ) : (
              <div className="flex items-center justify-center h-full">Chargement...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
