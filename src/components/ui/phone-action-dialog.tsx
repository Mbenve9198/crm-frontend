"use client";

import React, { useState } from "react";
import { Phone, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Contact } from "@/types/contact";
import { InitiateCallRequest } from "@/types/call";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface PhoneActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onAction: (action: 'call' | 'whatsapp') => void;
}

export function PhoneActionDialog({ 
  open, 
  onOpenChange, 
  contact, 
  onAction 
}: PhoneActionDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const handleAction = async (action: 'call' | 'whatsapp') => {
    setIsProcessing(true);
    setCallError(null);
    
    try {
      // Chiama l'action callback
      onAction(action);
      
      // Esegui l'azione specifica
      if (action === 'call') {
        // Prova prima con Twilio
        try {
          if (!contact.phone) {
            throw new Error('Il contatto non ha un numero di telefono');
          }

          const request: InitiateCallRequest = {
            contactId: contact._id,
            recordCall: true,
          };

          console.log('🚀 Avvio chiamata Twilio per:', contact.name);
          const response = await apiClient.initiateCall(request);
          
          if (response.success && response.data) {
            toast.success('Chiamata Twilio avviata! Ti stiamo chiamando...');
            onOpenChange(false);
            return;
          } else {
            console.warn('⚠️ Twilio non disponibile, fallback a tel:');
            // Fallback alla chiamata normale
            window.location.href = `tel:${contact.phone}`;
          }
        } catch (twilioError) {
          console.warn('⚠️ Errore Twilio, fallback a tel:', twilioError);
          // Fallback alla chiamata normale
          window.location.href = `tel:${contact.phone}`;
        }
      } else if (action === 'whatsapp') {
        // Apri WhatsApp Web
        const cleanPhone = contact.phone?.replace(/[^\d+]/g, '');
        if (cleanPhone) {
          const whatsappUrl = `https://wa.me/${cleanPhone}`;
          window.open(whatsappUrl, '_blank');
        }
      }
      
      // Chiudi il dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Errore nell\'azione telefono:', error);
      setCallError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Contatta {contact.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">Numero di telefono:</p>
            <p className="text-lg font-semibold text-gray-900">{contact.phone}</p>
          </div>
          
          {/* Messaggio di errore */}
          {callError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{callError}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {/* Pulsante Chiamata */}
            <Button
              variant="outline"
              size="lg"
              className="flex flex-col items-center gap-2 h-20 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              onClick={() => handleAction('call')}
              disabled={isProcessing || !contact.phone}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm font-medium">Chiamando...</span>
                </>
              ) : (
                <>
                  <Phone className="h-6 w-6" />
                  <span className="text-sm font-medium">Chiama</span>
                </>
              )}
            </Button>
            
            {/* Pulsante WhatsApp */}
            <Button
              variant="outline"
              size="lg"
              className="flex flex-col items-center gap-2 h-20 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              onClick={() => handleAction('whatsapp')}
              disabled={isProcessing}
            >
              <MessageCircle className="h-6 w-6" />
              <span className="text-sm font-medium">WhatsApp</span>
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 