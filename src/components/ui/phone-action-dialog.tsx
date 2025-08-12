"use client";

import React, { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Contact } from "@/types/contact";
import { CallDialog } from "./call-dialog";
import { apiClient } from "@/lib/api";

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
  const [showCallDialog, setShowCallDialog] = useState(false);

  const handleAction = async (action: 'call' | 'whatsapp') => {
    try {
      // Chiama l'action callback
      onAction(action);
      
      // Esegui l'azione specifica
      if (action === 'call') {
        // Chiudi questo dialog e apri il CallDialog
        onOpenChange(false);
        setShowCallDialog(true);
      } else if (action === 'whatsapp') {
        // Compila il template e apri WhatsApp Web
        const cleanPhone = contact.phone?.replace(/[^\d+]/g, '');
        if (cleanPhone) {
          try {
            // Compila il template con i dati del contatto
            const templateResponse = await apiClient.compileWhatsAppTemplate(contact._id);
            let message = '';
            
            if (templateResponse.success && templateResponse.data) {
              message = templateResponse.data.compiledMessage;
            } else {
              // Fallback a messaggio di default se il template non è disponibile
              message = `Ciao ${contact.name}, ti scrivo da MenuChatCRM. Come posso aiutarti?`;
            }
            
            // Codifica il messaggio per l'URL
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
          } catch (error) {
            console.error('Errore nella compilazione del template:', error);
            // Fallback a WhatsApp senza messaggio precompilato
            const whatsappUrl = `https://wa.me/${cleanPhone}`;
            window.open(whatsappUrl, '_blank');
          }
        }
        // Chiudi il dialog
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Errore nell\'azione telefono:', error);
    }
  };

  return (
    <>
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
            
            <div className="grid grid-cols-2 gap-4">
              {/* Pulsante Chiamata */}
              <Button
                variant="outline"
                size="lg"
                className="flex flex-col items-center gap-2 h-20 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                onClick={() => handleAction('call')}
                disabled={!contact.phone}
              >
                <Phone className="h-6 w-6" />
                <span className="text-sm font-medium">Chiama</span>
              </Button>
              
              {/* Pulsante WhatsApp */}
              <Button
                variant="outline"
                size="lg"
                className="flex flex-col items-center gap-2 h-20 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                onClick={() => handleAction('whatsapp')}
                disabled={!contact.phone}
              >
                <MessageCircle className="h-6 w-6" />
                <span className="text-sm font-medium">WhatsApp</span>
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CallDialog per gestire le chiamate Twilio */}
      <CallDialog
        contact={contact}
        trigger={<></>} // Non serve un trigger perché lo controlliamo programmaticamente
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        onCallComplete={() => {
          setShowCallDialog(false);
        }}
      />
    </>
  );
} 