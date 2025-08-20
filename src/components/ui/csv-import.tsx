"use client";

import React, { useState } from "react";
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
import { FileUpload } from "@/components/ui/file-upload";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
  RefreshCw,
  Bug,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// Importa i tipi dalla libreria API
import { CsvAnalysisResult, CsvImportResult } from "@/lib/api";

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

type MappingOption = {
  value: string;
  label: string;
  description: string;
  required?: boolean;
  type?: "fixed" | "existing" | "new" | "special";
};

// Campi base - verranno sostituiti dai dati del backend quando disponibili
const DEFAULT_FIELDS: MappingOption[] = [
  { value: "name", label: "Nome", description: "Campo nome del contatto (obbligatorio)", required: true, type: "fixed" },
  { value: "email", label: "Email", description: "Campo email (opzionale ma unico se fornito)", required: false, type: "fixed" },
  { value: "phone", label: "Telefono", description: "Campo telefono (opzionale)", required: false, type: "fixed" },
  { value: "lists", label: "Liste", description: "Liste separate da virgola", required: false, type: "fixed" },
  { value: "ignore", label: "Ignora colonna", description: "Ignora questa colonna durante l'importazione", required: false, type: "special" },
];

export function CsvImportDialog({ 
  children, 
  onImportComplete 
}: { 
  children: React.ReactNode;
  onImportComplete?: () => void;
}) {
  const { user, checkAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CsvAnalysisResult | null>(null);
  const [mappingOptions, setMappingOptions] = useState<MappingOption[]>(DEFAULT_FIELDS);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [customProperties, setCustomProperties] = useState<string[]>([]);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update">("skip");
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isTestingAuth, setIsTestingAuth] = useState(false);

  // Costruisce le opzioni di mappatura dai dati del backend
  const buildMappingOptions = (result: CsvAnalysisResult): MappingOption[] => {
    const options: MappingOption[] = [];

    // Campi fissi
    result.availableFields.fixed.forEach(field => {
      const description = result.mappingInstructions[field] || `Campo ${field}`;
      const required = field === 'name'; // Solo il nome è obbligatorio
      options.push({
        value: field,
        label: field === 'name' ? 'Nome' : field === 'email' ? 'Email' : field === 'phone' ? 'Telefono' : field === 'lists' ? 'Liste' : field,
        description,
        required,
        type: 'fixed'
      });
    });

    // Proprietà dinamiche esistenti
    result.availableFields.existingProperties.forEach(prop => {
      const propertyKey = `properties.${prop}`;
      const description = result.mappingInstructions[propertyKey] || `Proprietà esistente: ${prop}`;
      options.push({
        value: propertyKey,
        label: `📋 ${prop}`,
        description,
        required: false,
        type: 'existing'
      });
    });

    // Opzione ignora
    options.push({
      value: 'ignore',
      label: 'Ignora colonna',
      description: 'Ignora questa colonna durante l\'importazione',
      required: false,
      type: 'special'
    });

    return options;
  };

  const handleTestAuth = async () => {
    setIsTestingAuth(true);
    setDebugInfo("Testing autenticazione...");
    
    try {
      const result = await apiClient.testAuth();
      const debugDetails = [
        `🔐 Test Auth Risultato: ${result.success ? '✅ SUCCESSO' : '❌ FALLITO'}`,
        `📋 Messaggio: ${result.success ? 'Autenticazione valida' : result.error}`,
        `👤 Utente: ${result.data?.user?.firstName} ${result.data?.user?.lastName}`,
        `📧 Email: ${result.data?.user?.email}`,
        `🎭 Ruolo: ${result.data?.user?.role}`,
        `🕒 Timestamp: ${new Date().toLocaleString()}`
      ];
      
      setDebugInfo(debugDetails.join('\n'));
      
      if (!result.success) {
        setError("❌ Test autenticazione fallito. Il problema è confermato con l'API di auth.");
      }
    } catch (err) {
      setError("❌ Errore durante il test di autenticazione");
      setDebugInfo(`Errore test auth: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    
    // Verifica che sia un CSV
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError("Il file deve essere in formato CSV");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setDebugInfo("");
    setCsvFile(file);

    try {
      // Debug dettagliato
      const token = apiClient.getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      
      const debugDetails = [
        `🔍 Token presente: ${!!token}`,
        `🌐 API URL: ${apiUrl}`,
        `👤 Utente autenticato: ${user?.firstName} ${user?.lastName} (${user?.role})`,
        `📧 Email utente: ${user?.email}`,
        `📄 File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        `🔗 Endpoint completo: ${apiUrl}/contacts/import-csv?phase=analyze`
      ];
      
      setDebugInfo(debugDetails.join('\n'));
      console.log('=== CSV Upload Debug ===');
      debugDetails.forEach(detail => console.log(detail));
      
      if (!token) {
        throw new Error("Token di autenticazione mancante. Effettua nuovamente il login.");
      }
      
      const response = await apiClient.importCsvAnalyze(file);
      
      // DEBUG: Log completo della risposta
      console.log('🔍 CSV Analysis Response:', response);
      console.log('🔍 response.success:', response.success);
      console.log('🔍 response.data:', response.data);
      if (response.data) {
        console.log('🔍 response.data.headers:', response.data.headers);
        console.log('🔍 response.data.sampleRows:', response.data.sampleRows);
        console.log('🔍 response.data.availableFields:', response.data.availableFields);
        console.log('🔍 Tipo headers:', typeof response.data.headers);
        console.log('🔍 Array.isArray(headers):', Array.isArray(response.data.headers));
      }
      
      if (response.success && response.data) {
        // Verifica che la struttura sia corretta (struttura reale del backend)
        if (!response.data.headers || !Array.isArray(response.data.headers)) {
          console.error('❌ ERRORE: response.data.headers non è un array valido');
          console.error('   - response.data.headers:', response.data.headers);
          console.error('   - Tipo:', typeof response.data.headers);
          throw new Error('Struttura dati non valida dal backend: mancano gli headers');
        }
        
        if (!response.data.sampleRows || !Array.isArray(response.data.sampleRows)) {
          console.error('❌ ERRORE: response.data.sampleRows non è un array valido');
          console.error('   - response.data.sampleRows:', response.data.sampleRows);
          console.error('   - Tipo:', typeof response.data.sampleRows);
          throw new Error('Struttura dati non valida dal backend: mancano i sampleRows');
        }
        
        console.log('✅ Struttura dati validata correttamente');
        
        // DEBUG: Kontrolliamo cosa contengono i dati per evitare errori di rendering
        console.log('🔍 DETTAGLIO DATI CSV:');
        console.log('   - Headers:', response.data.headers);
        console.log('   - Numero sampleRows:', response.data.sampleRows.length);
        console.log('   - Prima riga sample:', response.data.sampleRows[0]);
        console.log('   - Tipi dei valori nella prima riga:');
        if (response.data.sampleRows[0]) {
          Object.entries(response.data.sampleRows[0]).forEach(([key, value]) => {
            console.log(`     - ${key}: ${typeof value} =`, value);
          });
        }
        
        // Assicuriamoci che i campi richiesti esistano
        const completeResult: CsvAnalysisResult = {
          headers: response.data.headers || [],
          sampleRows: response.data.sampleRows || [],
          availableFields: response.data.availableFields || { fixed: [], existingProperties: [], newProperties: '' },
          mappingInstructions: response.data.mappingInstructions || {},
          dynamicPropertiesInfo: response.data.dynamicPropertiesInfo || { existing: [], count: 0, usage: '' }
        };
        
        setAnalysisResult(completeResult);
        
        // Costruisce le opzioni di mappatura dai dati del backend
        const options = buildMappingOptions(completeResult);
        setMappingOptions(options);
        
        setCurrentStep("mapping");
        
        // Auto-mappatura intelligente
        const autoMapping: Record<string, string> = {};
        response.data.headers.forEach((column) => {
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
        setDebugInfo(""); // Reset debug info se tutto va bene
      } else {
        throw new Error(response.message || "Errore nell'analisi del CSV");
      }
    } catch (err) {
      console.error('=== CSV Upload Error ===');
      console.error(err);
      
      // Gestione errori dettagliata
      const errorMessage = getErrorMessage(err);
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError("🔐 ERRORE 401: Token non valido o sessione scaduta");
        // Prova a verificare l'autenticazione
        checkAuth();
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError("❌ Non hai i permessi per importare contatti.");
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        setError("📦 File troppo grande. Massimo 5MB consentiti.");
      } else if (getErrorMessage(err).includes('CORS')) {
        setError("🌐 Errore di CORS. Verifica la configurazione del backend.");
      } else if (getErrorMessage(err).includes('Network') || getErrorMessage(err).includes('Failed to fetch')) {
        setError("🔌 Errore di connessione. Verifica che il backend sia online.");
      } else {
        setError(`❌ ${getErrorMessage(err)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (csvFile) {
      await handleFileUpload([csvFile]);
    }
  };

  const handleReauth = async () => {
    setError(null);
    setDebugInfo("Verificando autenticazione...");
    try {
      await checkAuth();
      setDebugInfo("Autenticazione verificata. Riprova il caricamento.");
    } catch {
      setError("Errore nella verifica dell'autenticazione. Effettua il login.");
      setDebugInfo("");
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

  // Helper per convertire qualsiasi valore in stringa sicura per il rendering
  const safeStringify = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Helper per estrarre messaggi di errore sicuri
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return "Errore sconosciuto";
  };

  const validateMapping = () => {
    const requiredFields = AVAILABLE_FIELDS.filter((f) => f.required).map((f) => f.value);
    const mappedFields = Object.values(columnMapping);
    
    return requiredFields.every((field) => mappedFields.includes(field));
  };

  const handlePreview = () => {
    if (!validateMapping()) {
      setError("Il campo Nome è obbligatorio");
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
      console.error('CSV import error:', err);
      const errorMessage = getErrorMessage(err);
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError("🔐 Sessione scaduta. Effettua nuovamente il login e riprova.");
      } else {
        setError(`❌ ${errorMessage}`);
      }
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
    setDebugInfo("");
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
    <div className="space-y-6">
      <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-background border-neutral-200 dark:border-neutral-800 rounded-lg">
        <FileUpload 
          onChange={handleFileUpload}
          accept={{ 'text/csv': ['.csv'] }}
          maxSize={5 * 1024 * 1024} // 5MB
        />
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Analizzando il file CSV...</span>
        </div>
      )}
      
      {/* Debug controls */}
      <div className="flex gap-2 justify-center">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleTestAuth}
          disabled={isTestingAuth}
        >
          <Bug className="h-4 w-4 mr-1" />
          {isTestingAuth ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Testing...
            </>
          ) : (
            'Test Auth'
          )}
        </Button>
      </div>
      
      {/* Debug info */}
      {debugInfo && (
        <div className="bg-gray-100 p-3 rounded text-xs font-mono whitespace-pre-line">
          <strong>🔍 Debug Info:</strong><br />
          {debugInfo}
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <div className="whitespace-pre-line">{safeStringify(error)}</div>
            {error.includes("401") || error.includes("Sessione scaduta") ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReauth}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Verifica Auth
                </Button>
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Riprova
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRetry} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-1" />
                Riprova
              </Button>
            )}
          </div>
        </Alert>
      )}
      
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>📋 <strong>Formato supportato:</strong> CSV (massimo 5MB)</p>
        <p>📝 <strong>Requisiti:</strong> Prima riga deve contenere i nomi delle colonne</p>
        <p>✅ <strong>Campo obbligatorio:</strong> Nome</p>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Mappatura Colonne</h3>
        <p className="text-sm text-gray-600">
          Associa le colonne del tuo CSV ai campi del CRM. Solo il campo Nome è obbligatorio.
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
                  {prop.replace("properties.", "").charAt(0).toUpperCase() + prop.replace("properties.", "").slice(1)}
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
        {analysisResult?.headers && Array.isArray(analysisResult.headers) ? (
          analysisResult.headers.map((column) => (
            <div key={column} className="flex items-center gap-3">
              <div className="flex-1">
                <Badge variant="outline">{safeStringify(column)}</Badge>
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
          ))
        ) : (
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-yellow-800">Nessuna colonna trovata nel file CSV.</p>
            <p className="text-sm text-yellow-600 mt-1">Verifica che il file contenga le intestazioni nella prima riga.</p>
          </div>
        )}
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
          <span>{safeStringify(error)}</span>
        </Alert>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Anteprima Importazione</h3>
        <p className="text-sm text-gray-600">
          Verifica i dati prima dell&apos;importazione. Saranno importati {analysisResult?.sampleRows?.length || 0} contatti (anteprima).
        </p>
      </div>

      {/* Preview dei primi 3 record */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anteprima Dati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysisResult?.sampleRows && Array.isArray(analysisResult.sampleRows) ? (
              analysisResult.sampleRows.slice(0, 3).map((row, index) => (
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
                          <span className="text-gray-600">{safeStringify(row[csvCol])}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-yellow-800">Nessun dato di anteprima disponibile.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {analysisResult?.sampleRows?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Righe di anteprima</div>
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
            <p className="font-medium">Errori durante l&apos;importazione:</p>
            <ul className="list-disc list-inside text-sm mt-1">
              {importResult.errors.map((error, index) => (
                <li key={index}>{safeStringify(error)}</li>
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