'use client';

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Settings, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  TestTube,
  Info,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { TwilioSettings, TwilioConfigureRequest, TwilioTestCallRequest } from '@/types/twilio';
import { TwilioSetupGuide } from '@/components/ui/twilio-setup-guide';

export default function SettingsPage() {
  const [twilioSettings, setTwilioSettings] = useState<TwilioSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Form state
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [formData, setFormData] = useState<TwilioConfigureRequest>({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });
  const [testNumber, setTestNumber] = useState('');

  useEffect(() => {
    loadTwilioSettings();
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Impostazioni
        </h1>
        <p className="text-gray-600 mt-2">
          Configura le tue impostazioni personali e integrazione Twilio
        </p>
      </div>

      {/* Configurazione Twilio */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-6 w-6" />
            Configurazione Twilio
            {isEnabled && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Attivo
              </Badge>
            )}
            {isConfigured && !isVerified && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Da verificare
              </Badge>
            )}
            {!isConfigured && (
              <Badge variant="outline">
                <XCircle className="h-3 w-3 mr-1" />
                Non configurato
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Configura il tuo account Twilio per effettuare chiamate direttamente dal CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Guida setup */}
          <TwilioSetupGuide 
            isVerified={isEnabled} 
            phoneNumber={twilioSettings?.phoneNumber} 
          />

          {/* Form di configurazione */}
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Account SID</label>
              <Input
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={formData.accountSid}
                onChange={(e) => setFormData(prev => ({ ...prev, accountSid: e.target.value }))}
                disabled={isEnabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auth Token</label>
              <div className="relative">
                <Input
                  type={showAuthToken ? "text" : "password"}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.authToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                  disabled={isEnabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowAuthToken(!showAuthToken)}
                  disabled={isEnabled}
                >
                  {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Numero di Telefono</label>
              <Input
                type="tel"
                placeholder="+393331234567"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                disabled={isEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato internazionale richiesto (es. +393331234567)
              </p>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex gap-3 pt-4 border-t">
            {!isEnabled && (
              <>
                <Button
                  onClick={handleConfigure}
                  disabled={isConfiguring}
                  className="flex-1"
                >
                  {isConfiguring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Salva Configurazione
                    </>
                  )}
                </Button>

                {isConfigured && !isVerified && (
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    variant="outline"
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verifica Configurazione
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {isEnabled && (
              <Button
                onClick={handleDisable}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Disabilita Twilio
              </Button>
            )}
          </div>

          {/* Test chiamata */}
          {isEnabled && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test Chiamata
              </h4>
              <div className="flex gap-3">
                <Input
                  type="tel"
                  placeholder="+393331234567"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestCall}
                  disabled={isTesting}
                  variant="outline"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Chiamando...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Test
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Inserisci un numero per testare la configurazione
              </p>
            </div>
          )}

          {/* Stato corrente */}
          {twilioSettings && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Stato Configurazione</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Account SID:</span>
                  <p className="font-mono">{twilioSettings.accountSid || 'Non configurato'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Numero:</span>
                  <p className="font-mono">{twilioSettings.phoneNumber || 'Non configurato'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Verificato:</span>
                  <p>{twilioSettings.isVerified ? '✅ Sì' : '❌ No'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Abilitato:</span>
                  <p>{twilioSettings.isEnabled ? '✅ Sì' : '❌ No'}</p>
                </div>
              </div>
              {twilioSettings.lastVerified && (
                <div className="mt-2 text-xs text-gray-500">
                  Ultima verifica: {new Date(twilioSettings.lastVerified).toLocaleString('it-IT')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 