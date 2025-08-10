"use client";

import React, { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

interface PhoneActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contactName: string;
  onAction: (action: 'call' | 'whatsapp') => void;
}

export function PhoneActionDialog({ 
  open, 
  onOpenChange, 
  phoneNumber, 
  contactName, 
  onAction 
}: PhoneActionDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'call' | 'whatsapp') => {
    setIsProcessing(true);
    
    try {
      // Chiama l'action callback
      onAction(action);
      
      // Esegui l'azione specifica
      if (action === 'call') {
        // Avvia la chiamata
        window.location.href = `tel:${phoneNumber}`;
      } else if (action === 'whatsapp') {
        // Apri WhatsApp Web
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}`;
        window.open(whatsappUrl, '_blank');
      }
      
      // Chiudi il dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Errore nell\'azione telefono:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Contatta {contactName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">Numero di telefono:</p>
            <p className="text-lg font-semibold text-gray-900">{phoneNumber}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Pulsante Chiamata */}
            <Button
              variant="outline"
              size="lg"
              className="flex flex-col items-center gap-2 h-20 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              onClick={() => handleAction('call')}
              disabled={isProcessing}
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