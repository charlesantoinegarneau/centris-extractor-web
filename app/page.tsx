"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { centrisAPI, PropertyData, downloadBlob } from "../lib/api";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    filename: string;
    properties: PropertyData[];
    total_properties: number;
  } | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Check backend connection on component mount
  useEffect(() => {
    const checkBackend = async () => {
      const isConnected = await centrisAPI.testConnection();
      setBackendConnected(isConnected);
      if (!isConnected) {
        toast.error("Backend indisponible - mode démo activé");
      } else {
        toast.success("Backend connecté - extraction réelle disponible");
      }
    };
    checkBackend();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }

    setIsProcessing(true);
    toast.success(`Traitement de ${file.name} en cours...`);

    try {
      if (backendConnected) {
        // Use real API
        const result = await centrisAPI.extractPDF(file);
        setExtractedData({
          filename: result.filename,
          properties: result.properties,
          total_properties: result.total_properties,
        });
        toast.success(`Extraction réussie: ${result.total_properties} propriétés trouvées!`);
      } else {
        // Fallback to demo data
        setTimeout(() => {
          setExtractedData({
            filename: file.name,
            properties: [
              { address: "123 Rue Example, Montréal", price: "450,000$", type: "Condo" },
              { address: "456 Avenue Test, Laval", price: "380,000$", type: "Maison" },
            ],
            total_properties: 2,
          });
          toast.success("Extraction démo terminée (backend indisponible)");
        }, 2000);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(`Erreur d'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      // Fallback to demo data on error
      setExtractedData({
        filename: file.name,
        properties: [
          { address: "Extraction échouée - données d'exemple", price: "N/A", type: "Demo" },
        ],
        total_properties: 1,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const downloadExcel = async () => {
    if (!extractedData) return;
    
    try {
      toast.success("Export Excel en cours...");
      
      if (backendConnected) {
        // Use real API for Excel export
        const blob = await centrisAPI.exportToExcel({
          filename: extractedData.filename,
          properties: extractedData.properties,
        });
        
        downloadBlob(blob, extractedData.filename.replace('.pdf', '.xlsx'));
        toast.success("Export Excel terminé!");
      } else {
        // Fallback demo export using xlsx library
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(extractedData.properties);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Centris Data');
        XLSX.writeFile(wb, extractedData.filename.replace('.pdf', '.xlsx'));
        toast.success("Export Excel démo terminé!");
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Erreur d'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏠 Centris Extractor Web
          </h1>
          <p className="text-lg text-gray-600">
            Extrayez automatiquement les données immobilières de vos PDF Centris
          </p>
          
          {/* Backend Status Indicator */}
          <div className="mt-4 flex justify-center">
            {backendConnected === null ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Vérification du backend...
              </div>
            ) : backendConnected ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Extraction réelle activée
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Mode démo (backend indisponible)
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📄</div>
              {isDragActive ? (
                <p className="text-xl text-blue-600">Déposez votre PDF ici...</p>
              ) : (
                <>
                  <p className="text-xl text-gray-700">
                    Glissez-déposez votre PDF Centris ici
                  </p>
                  <p className="text-sm text-gray-500">
                    ou cliquez pour sélectionner un fichier
                  </p>
                </>
              )}
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Choisir un fichier
              </button>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
              <span className="text-yellow-800 font-medium">
                Extraction en cours... Veuillez patienter
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {extractedData && !isProcessing && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                📊 Données extraites
              </h2>
              <button
                onClick={downloadExcel}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                📥 Exporter Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      Adresse
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      Prix
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.properties.map((property, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {property.address}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-green-600">
                        {property.price}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {property.type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Développé avec ❤️ pour l&apos;extraction de données Centris</p>
        </div>
      </div>
    </div>
  );
}
