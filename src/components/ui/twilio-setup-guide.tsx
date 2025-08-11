'use client';

import React from 'react';
import { ExternalLink, Phone, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';

interface TwilioSetupGuideProps {
  isVerified?: boolean;
  phoneNumber?: string;
}

export function TwilioSetupGuide({ isVerified = false, phoneNumber }: TwilioSetupGuideProps) {
  const openVerifiedNumbers = () => {
    window.open('https://console.twilio.com/us1/develop/phone-numbers/manage/verified', '_blank');
  };

  const openTwilioConsole = () => {
    window.open('https://console.twilio.com', '_blank');
  };

  if (isVerified && phoneNumber) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Numero Verificato Attivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">
                Il tuo numero <strong>{phoneNumber}</strong> è verificato e attivo.
              </p>
              <p className="text-xs text-green-600">
                Puoi effettuare chiamate usando questo numero come mittente.
              </p>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Phone className="h-3 w-3 mr-1" />
              Attivo
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Shield className="h-5 w-5" />
          Guida: Verifica il tuo Numero su Twilio
        </CardTitle>
        <CardDescription className="text-blue-700">
          Per effettuare chiamate con il tuo numero personale, devi prima verificarlo su Twilio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-blue-900">Registrati su Twilio</p>
              <p className="text-sm text-blue-700">Se non hai ancora un account, creane uno gratuito</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 text-blue-600 border-blue-300 hover:bg-blue-100"
                onClick={openTwilioConsole}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Vai al Console Twilio
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-blue-900">Verifica il tuo numero</p>
                             <p className="text-sm text-blue-700 mb-2">
                 Vai nella sezione &quot;Verified Caller IDs&quot; e aggiungi il tuo numero personale
               </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
                onClick={openVerifiedNumbers}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Verified Caller IDs
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
            <div>
              <p className="font-medium text-blue-900">Completa la verifica</p>
              <p className="text-sm text-blue-700">
                Riceverai una chiamata o SMS con un codice da inserire per completare la verifica
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
            <div>
              <p className="font-medium text-blue-900">Ottieni le credenziali</p>
              <p className="text-sm text-blue-700">
                Copia l&apos;Account SID e Auth Token dal dashboard principale e inseriscili nel form qui sopra
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-800 font-medium mb-1">💡 Informazioni Importanti:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Con un numero verificato puoi solo effettuare chiamate in uscita</li>
            <li>• Il tuo numero apparirà come mittente delle chiamate</li>
            <li>• Non riceverai chiamate su Twilio, ma è perfetto per il CRM</li>
            <li>• La verifica è gratuita e richiede solo pochi minuti</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 