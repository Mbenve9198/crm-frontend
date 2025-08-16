'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Loader2,
  MessageCircle,
  Copy,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { TwilioSettings, TwilioConfigureRequest, WhatsAppTemplate } from '@/types/twilio';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/ui/login-form';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Caricamento Impostazioni...</p>
      </div>
    </div>
  );
}

function SettingsContent() {
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Stato per template WhatsApp
  const [whatsappTemplate, setWhatsappTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [availableVariables, setAvailableVariables] = useState<{
    fixed: Array<{ key: string; description: string }>;
    dynamic: Array<{ key: string; description: string }>;
  } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TwilioConfigureRequest>({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });
  
  // Form state per template WhatsApp
  const [templateMessage, setTemplateMessage] = useState('');

  useEffect(() => {
    loadTwilioSettings();
    loadWhatsAppTemplate();
    loadAvailableVariables();
  }, []);

  const loadTwilioSettings = async () => {
    try {
      const response = await apiClient.getTwilioSettings();
      if (response.success && response.data) {
        setTwilioSettings(response.data);
        setFormData({
          accountSid: response.data.accountSid || '',
          authToken: '', // Non mostriamo mai l'auth token esistente
          phoneNumber: response.data.phoneNumber || ''
        });
      }
    } catch (error) {
      console.error('Errore nel caricare impostazioni Twilio:', error);
      toast.error('Errore nel caricare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppTemplate = async () => {
    try {
      const response = await apiClient.getWhatsAppTemplate();
      if (response.success && response.data) {
        setWhatsappTemplate(response.data);
        setTemplateMessage(response.data.message);
      }
    } catch (error) {
      console.error('Errore nel caricare template WhatsApp:', error);
      toast.error('Errore nel caricare il template WhatsApp');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const loadAvailableVariables = async () => {
    try {
      const response = await apiClient.getWhatsAppTemplateVariables();
      if (response.success && response.data) {
        setAvailableVariables(response.data);
      }
    } catch (error) {
      console.error('Errore nel caricare variabili disponibili:', error);
    }
  };

  const handleConfigure = async () => {
    if (!formData.accountSid || !formData.authToken || !formData.phoneNumber) {
      toast.error('Tutti i campi sono obbligatori');
      return;
    }

    setIsConfiguring(true);
    try {
      const response = await apiClient.configureTwilio(formData);
      if (response.success && response.data) {
        setTwilioSettings(response.data);
        toast.success('Configurazione salvata! Procedi con la verifica.');
        setFormData(prev => ({ ...prev, authToken: '' })); // Pulisci l'auth token
      } else {
        toast.error(response.message || 'Errore nella configurazione');
      }
    } catch (error) {
      console.error('Errore nella configurazione:', error);
      toast.error('Errore nella configurazione');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const response = await apiClient.verifyTwilio();
      if (response.success) {
        await loadTwilioSettings(); // Ricarica per ottenere lo stato aggiornato
        toast.success('Configurazione verificata con successo!');
      } else {
        toast.error(response.message || 'Errore nella verifica');
      }
    } catch (error) {
      console.error('Errore nella verifica:', error);
      toast.error('Errore nella verifica');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestCall = async () => {
    if (!testNumber) {
      toast.error('Inserisci un numero per il test');
      return;
    }

    setIsTesting(true);
    try {
      const response = await apiClient.testTwilioCall({ testNumber });
      if (response.success) {
        toast.success('Chiamata di test iniziata! Controlla il tuo telefono.');
      } else {
        toast.error(response.message || 'Errore nella chiamata di test');
      }
    } catch (error) {
      console.error('Errore nella chiamata di test:', error);
      toast.error('Errore nella chiamata di test');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Sei sicuro di voler disabilitare Twilio? Non potrai più effettuare chiamate.')) {
      return;
    }

    try {
      const response = await apiClient.disableTwilio();
      if (response.success && response.data) {
        setTwilioSettings(response.data);
        toast.success('Twilio disabilitato');
      }
    } catch (error) {
      console.error('Errore nel disabilitare Twilio:', error);
      toast.error('Errore nel disabilitare Twilio');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateMessage.trim()) {
      toast.error('Il messaggio del template è obbligatorio');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const response = await apiClient.updateWhatsAppTemplate({ message: templateMessage });
      if (response.success && response.data) {
        setWhatsappTemplate(response.data);
        toast.success('Template WhatsApp salvato con successo!');
      } else {
        toast.error(response.message || 'Errore nel salvare il template');
      }
    } catch (error) {
      console.error('Errore nel salvare template:', error);
      toast.error('Errore nel salvare il template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const insertVariable = (variable: string) => {
    const placeholder = `{${variable}}`;
    setTemplateMessage(prev => prev + placeholder);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isConfigured = twilioSettings?.accountSid && twilioSettings?.phoneNumber;
  const isVerified = twilioSettings?.isVerified;
  const isEnabled = twilioSettings?.isEnabled;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderna */}
      <div className="transition-all duration-300">
        <ModernSidebar />
      </div>

      {/* Main content con padding-left per la sidebar */}
      <main className="pl-16 transition-all duration-300">
        <div className="container mx-auto py-4 px-6 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Impostazioni
            </h1>
            <p className="text-gray-600 mt-2">
              Configura le tue impostazioni personali e integrazione Twilio
            </p>
          </div>

          {/* Configurazione Template WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                Template WhatsApp
              </CardTitle>
              <CardDescription>
                Configura il messaggio predefinito che verrà utilizzato quando invii un messaggio WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingTemplate ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Caricamento template...
                </div>
              ) : (
                <>
                  {/* Editor del template */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Messaggio Template</label>
                    <Textarea
                      placeholder="Ciao {nome}, sono {utente} di MenuChatCRM. Come posso aiutarti?"
                      value={templateMessage}
                      onChange={(e) => setTemplateMessage(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                      <span>Usa variabili come {"{nome}"} per personalizzare il messaggio</span>
                      <span>{templateMessage.length}/1000</span>
                    </div>
                  </div>

                  {/* Variabili disponibili */}
                  {availableVariables && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Variabili Disponibili
                      </h4>
                      
                      {/* Variabili fisse */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Variabili Fisse:</p>
                        <div className="flex flex-wrap gap-2">
                          {availableVariables.fixed.map((variable) => (
                            <Button
                              key={variable.key}
                              variant="outline"
                              size="sm"
                              onClick={() => insertVariable(variable.key)}
                              className="text-xs"
                              title={variable.description}
                            >
                              {"{" + variable.key + "}"}
                              <Copy className="h-3 w-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Variabili dinamiche */}
                      {availableVariables.dynamic.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Proprietà Dinamiche dei Contatti:</p>
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {availableVariables.dynamic.map((variable) => (
                              <Button
                                key={variable.key}
                                variant="outline"
                                size="sm"
                                onClick={() => insertVariable(variable.key)}
                                className="text-xs"
                                title={variable.description}
                              >
                                {"{" + variable.key + "}"}
                                <Copy className="h-3 w-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Azione salvataggio */}
                  <div className="border-t pt-4">
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate || !templateMessage.trim()}
                      className="w-full"
                    >
                      {isSavingTemplate ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Salva Template
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Stato corrente template */}
                  {whatsappTemplate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Template Corrente</h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-600">Messaggio:</span>
                          <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                            {whatsappTemplate.message}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Variabili rilevate:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {whatsappTemplate.variables.map((variable) => (
                              <Badge key={variable} variant="secondary" className="text-xs">
                                {"{" + variable + "}"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {whatsappTemplate.updatedAt && (
                          <div className="text-xs text-gray-500">
                            Ultimo aggiornamento: {new Date(whatsappTemplate.updatedAt).toLocaleString('it-IT')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mostra loading durante la verifica dell'autenticazione
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se non autenticato, mostra il form di login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Se autenticato, mostra le impostazioni
  return <SettingsContent />;
}
