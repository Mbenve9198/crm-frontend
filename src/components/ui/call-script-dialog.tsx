"use client";

import React, { useState } from "react";
import { FileText, Loader2, Copy, Check, X, Phone, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Contact } from "@/types/contact";
import { apiClient } from "@/lib/api";

interface CallScriptDialogProps {
  contact: Contact;
  trigger?: React.ReactNode;
}

export function CallScriptDialog({ contact, trigger }: CallScriptDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Verifica se il contatto ha i requisiti
  const isInbound = contact.source === 'inbound_rank_checker';
  const hasRankData = !!contact.rankCheckerData;
  const canGenerateScript = isInbound && hasRankData;

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && canGenerateScript && !script) {
      await generateScript();
    }
  };

  const generateScript = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.generateCallScript(contact._id);
      
      if (response.success && response.data) {
        setScript(response.data.script);
      } else {
        setError(response.message || 'Errore durante la generazione dello script');
      }
    } catch (err) {
      console.error('Errore generazione script:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!script) return;
    
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Errore copia:', err);
    }
  };

  const handleRegenerate = () => {
    setScript(null);
    generateScript();
  };

  // Formatta lo script per una migliore visualizzazione
  const formatScript = (text: string) => {
    return text
      // Mantieni i doppi a capo come separatori di paragrafo
      .split('\n\n')
      .map((paragraph, index) => (
        <div key={index} className="mb-4 last:mb-0">
          {paragraph.split('\n').map((line, lineIndex) => {
            // Gestisci le emoji come intestazioni di fase
            const isPhaseHeader = /^[📞📊😤🔍🎯🙋💡📱🤔💰📉═]/.test(line.trim());
            
            if (isPhaseHeader) {
              return (
                <div 
                  key={lineIndex} 
                  className="text-base font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0"
                >
                  {line}
                </div>
              );
            }

            // Gestisci linee con [PAUSA]
            if (line.includes('[PAUSA') || line.includes('[ATTENDI')) {
              return (
                <div 
                  key={lineIndex} 
                  className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded my-2 italic border-l-4 border-amber-400"
                >
                  {line}
                </div>
              );
            }

            // Converti **testo** in grassetto
            const formattedLine = line.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIndex} className="text-gray-900">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            });

            return (
              <p key={lineIndex} className="text-sm text-gray-700 leading-relaxed mb-1">
                {formattedLine}
              </p>
            );
          })}
        </div>
      ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm"
            disabled={!canGenerateScript}
            title={!canGenerateScript ? 'Disponibile solo per contatti inbound con report Rank Checker' : 'Genera script chiamata'}
          >
            <FileText className="h-4 w-4 mr-2" />
            Script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Script Chiamata - {contact.name}
          </DialogTitle>
          <DialogDescription>
            Script di vendita personalizzato basato sui dati del Rank Checker
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!canGenerateScript ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Script non disponibile
              </h3>
              <p className="text-gray-600 max-w-md">
                {!isInbound 
                  ? 'Lo script è disponibile solo per contatti inbound provenienti dal Rank Checker.'
                  : 'Il contatto non ha dati del Rank Checker. È necessario almeno il report base.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Generazione script in corso...</p>
              <p className="text-sm text-gray-500 mt-2">L&apos;AI sta creando uno script personalizzato</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Errore generazione script
              </h3>
              <p className="text-gray-600 max-w-md mb-4">{error}</p>
              <Button onClick={handleRegenerate} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          ) : script ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>Script generato con AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Rigenera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className={copied ? 'bg-green-50 border-green-300 text-green-700' : ''}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copiato!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copia
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Script Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {formatScript(script)}
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">💡</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Suggerimenti:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Personalizza lo script in base alla conversazione</li>
                      <li>Mantieni un tono naturale e colloquiale</li>
                      <li>Ascolta attentamente le risposte del cliente</li>
                      <li>Usa i dati specifici del report per creare urgenza</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

