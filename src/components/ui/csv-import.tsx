"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type CsvAnalysisResult = {
  columns: string[];
  preview: Record<string, string>[];
  rowCount: number;
};

type CsvImportResult = {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
};

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

const AVAILABLE_FIELDS = [
  { value: "name", label: "Nome", required: true },
  { value: "email", label: "Email", required: true },
  { value: "phone", label: "Telefono", required: false },
  { value: "lists", label: "Liste (separate da virgola)", required: false },
];

export function CsvImportDialog({ 
  children, 
  onImportComplete 
}: { 
  children: React.ReactNode;
  onImportComplete?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CsvAnalysisResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [customProperties, setCustomProperties] = useState<string[]>([]);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update">("skip");
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    setCsvFile(file);

    try {
      const response = await apiClient.importCsvAnalyze(file);
      if (response.success && response.data) {
        setAnalysisResult(response.data);
        setCurrentStep("mapping");
        
        // Auto-mappatura intelligente
        const autoMapping: Record<string, string> = {};
        response.data.columns.forEach((column) => {
          const normalizedColumn = column.toLowerCase().trim();
          
          if (normalizedColumn.includes("nome") || normalizedColumn.includes("name")) {
            autoMapping[column] = "name";
          } else if (normalizedColumn.includes("email") || normalizedColumn.includes("mail")) {
            autoMapping[column] = "email";
          } else if (normalizedColumn.includes("telefono") || normalizedColumn.includes("phone") || normalizedColumn.includes("tel")) {
            autoMapping[column] = "phone";
          } else if (normalizedColumn.includes("lista") || normalizedColumn.includes("liste") || normalizedColumn.includes("list")) {
            autoMapping[column] = "lists";
          }
        });
        
        setColumnMapping(autoMapping);
      } else {
        throw new Error(response.message || "Errore nell'analisi del CSV");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (csvColumn: string, targetField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField,
    }));
  };

  const addCustomProperty = () => {
    if (newPropertyName.trim() && !customProperties.includes(newPropertyName.trim())) {
      const propertyName = `properties.${newPropertyName.trim()}`;
      setCustomProperties((prev) => [...prev, propertyName]);
      setNewPropertyName("");
    }
  };

  const removeCustomProperty = (property: string) => {
    setCustomProperties((prev) => prev.filter((p) => p !== property));
    // Rimuovi anche dalla mappatura se presente
    setColumnMapping((prev) => {
      const newMapping = { ...prev };
      Object.keys(newMapping).forEach((key) => {
        if (newMapping[key] === property) {
          delete newMapping[key];
        }
      });
      return newMapping;
    });
  };

  const getAllAvailableFields = () => {
    return [
      ...AVAILABLE_FIELDS,
      ...customProperties.map((prop) => ({
        value: prop,
        label: prop.replace("properties.", "").charAt(0).toUpperCase() + prop.replace("properties.", "").slice(1),
        required: false,
      })),
      { value: "ignore", label: "Ignora colonna", required: false },
    ];
  };

  const validateMapping = () => {
    const requiredFields = AVAILABLE_FIELDS.filter((f) => f.required).map((f) => f.value);
    const mappedFields = Object.values(columnMapping);
    
    return requiredFields.every((field) => mappedFields.includes(field));
  };

  const handlePreview = () => {
    if (!validateMapping()) {
      setError("I campi Nome ed Email sono obbligatori");
      return;
    }
    setCurrentStep("preview");
  };

  const handleImport = async () => {
    if (!csvFile || !analysisResult) return;

    setIsLoading(true);
    setCurrentStep("importing");

    try {
      const response = await apiClient.importCsvExecute(csvFile, columnMapping, duplicateStrategy);
      
      if (response.success && response.data) {
        setImportResult(response.data);
        setCurrentStep("complete");
      } else {
        throw new Error(response.message || "Errore durante l'importazione");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setCurrentStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep("upload");
    setCsvFile(null);
    setAnalysisResult(null);
    setColumnMapping({});
    setCustomProperties([]);
    setNewPropertyName("");
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
    // Chiama la callback se l'importazione è stata completata
    if (currentStep === "complete" && onImportComplete) {
      onImportComplete();
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Carica file CSV</p>
          <p className="text-sm text-gray-600 mb-4">
            Trascina il tuo file CSV qui o clicca per selezionarlo
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analizzando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Seleziona CSV
              </>
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Mappatura Colonne</h3>
        <p className="text-sm text-gray-600">
          Associa le colonne del tuo CSV ai campi del CRM. I campi Nome ed Email sono obbligatori.
        </p>
      </div>

      {/* Aggiungi proprietà personalizzata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Crea Nuova Proprietà</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome proprietà (es. azienda, note)"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCustomProperty()}
            />
            <Button size="sm" onClick={addCustomProperty} disabled={!newPropertyName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {customProperties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customProperties.map((prop) => (
                <Badge key={prop} variant="secondary" className="flex items-center gap-1">
                  {prop.replace("properties.", "")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCustomProperty(prop)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mappatura colonne */}
      <div className="space-y-3">
        {analysisResult?.columns.map((column) => (
          <div key={column} className="flex items-center gap-3">
            <div className="flex-1">
              <Badge variant="outline">{column}</Badge>
            </div>
            <div className="flex-1">
              <Select
                value={columnMapping[column] || ""}
                onValueChange={(value) => handleMappingChange(column, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona campo..." />
                </SelectTrigger>
                <SelectContent>
                  {getAllAvailableFields().map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label} {field.required && "(Obbligatorio)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Strategia duplicati */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gestione Duplicati</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={duplicateStrategy} onValueChange={(value: "skip" | "update") => setDuplicateStrategy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Salta contatti duplicati</SelectItem>
              <SelectItem value="update">Aggiorna contatti esistenti</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Anteprima Importazione</h3>
        <p className="text-sm text-gray-600">
          Verifica i dati prima dell'importazione. Saranno importati {analysisResult?.rowCount} contatti.
        </p>
      </div>

      {/* Preview dei primi 3 record */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anteprima Dati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysisResult?.preview.slice(0, 3).map((row, index) => (
              <div key={index} className="p-3 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(columnMapping).map(([csvCol, targetField]) => {
                    if (targetField === "ignore") return null;
                    return (
                      <div key={csvCol}>
                        <span className="font-medium">
                          {targetField.startsWith("properties.") 
                            ? targetField.replace("properties.", "").charAt(0).toUpperCase() + targetField.replace("properties.", "").slice(1)
                            : AVAILABLE_FIELDS.find(f => f.value === targetField)?.label || targetField
                          }:
                        </span>{" "}
                        <span className="text-gray-600">{row[csvCol] || "N/A"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {analysisResult?.rowCount}
            </div>
            <div className="text-sm text-gray-600">Contatti da importare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(columnMapping).filter(v => v !== "ignore").length}
            </div>
            <div className="text-sm text-gray-600">Campi mappati</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-4 text-center">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
      <h3 className="text-lg font-medium">Importazione in corso...</h3>
      <p className="text-gray-600">
        Stiamo importando i tuoi contatti. Questo potrebbe richiedere alcuni secondi.
      </p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4 text-center">
      <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
      <h3 className="text-lg font-medium text-green-600">Importazione Completata!</h3>
      
      {importResult && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {importResult.imported}
              </div>
              <div className="text-sm text-gray-600">Importati</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {importResult.updated}
              </div>
              <div className="text-sm text-gray-600">Aggiornati</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">
                {importResult.skipped}
              </div>
              <div className="text-sm text-gray-600">Saltati</div>
            </CardContent>
          </Card>
        </div>
      )}

      {importResult?.errors && importResult.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <p className="font-medium">Errori durante l'importazione:</p>
            <ul className="list-disc list-inside text-sm mt-1">
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}
    </div>
  );

  const renderContent = () => {
    switch (currentStep) {
      case "upload":
        return renderUploadStep();
      case "mapping":
        return renderMappingStep();
      case "preview":
        return renderPreviewStep();
      case "importing":
        return renderImportingStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const getFooterButtons = () => {
    switch (currentStep) {
      case "upload":
        return null;
      case "mapping":
        return (
          <>
            <Button variant="outline" onClick={() => setCurrentStep("upload")}>
              Indietro
            </Button>
            <Button onClick={handlePreview} disabled={!validateMapping()}>
              Anteprima
            </Button>
          </>
        );
      case "preview":
        return (
          <>
            <Button variant="outline" onClick={() => setCurrentStep("mapping")}>
              Indietro
            </Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                "Importa Contatti"
              )}
            </Button>
          </>
        );
      case "importing":
        return null;
      case "complete":
        return (
          <Button onClick={handleClose} className="w-full">
            Chiudi
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Importa Contatti da CSV
          </DialogTitle>
        </DialogHeader>
        
        <div className="min-h-[400px]">
          {renderContent()}
        </div>

        {getFooterButtons() && (
          <DialogFooter className="flex gap-2">
            {getFooterButtons()}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 