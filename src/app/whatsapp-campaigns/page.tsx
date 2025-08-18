'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Eye,
  XCircle,
  X,
  Loader2,
  MoreHorizontal,
  QrCode,
  Smartphone,
  RefreshCw,
  UserX,
  Ban,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/ui/login-form';
import { 
  WhatsappCampaign, 
  WhatsappSession, 
  CampaignStatus, 
  CAMPAIGN_STATUSES, 
  SESSION_STATUSES,
  CreateSessionRequest,
  CreateCampaignRequest,
  MessageSequence
} from '@/types/whatsapp';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Caricamento Campagne WhatsApp...</p>
      </div>
    </div>
  );
}

function CampaignsContent() {
  const [campaigns, setCampaigns] = useState<WhatsappCampaign[]>([]);
  const [sessions, setSessions] = useState<WhatsappSession[]>([]);
  const [contactLists, setContactLists] = useState<Array<{ name: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isActioning, setIsActioning] = useState<string | null>(null);
  void isActioning; // Evita warning unused var
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // Variabili dinamiche per template
  const [availableVariables, setAvailableVariables] = useState<{
    fixed: Array<{ key: string; description: string }>;
    dynamic: Array<{ key: string; description: string }>;
  } | null>(null);

  // Stati per filtri di esclusione
  const [allContacts, setAllContacts] = useState<Array<{ _id: string; name: string; email?: string }>>([]);
  const [allCampaigns, setAllCampaigns] = useState<Array<{ _id: string; name: string; status: string }>>([]);

  // Stati per nuova sessione
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionData, setNewSessionData] = useState<CreateSessionRequest>({
    name: '',
    sessionId: ''
  });

  // Stati per nuova campagna
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState<CreateCampaignRequest>({
    name: '',
    description: '',
    whatsappSessionId: '',
    targetList: '',
    messageTemplate: '',
    messageSequences: [],
    contactFilters: {
      excludeContacts: [],
      excludeFromCampaigns: [],
      excludeContactedWithinDays: undefined
    },
    timing: {
      intervalBetweenMessages: 30,
      schedule: {
        startTime: '09:00',
        endTime: '18:00',
        timezone: 'Europe/Rome'
      }
    }
  });

  // Stati per QR Code
  const [selectedQrSession, setSelectedQrSession] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrMonitorInterval, setQrMonitorInterval] = useState<NodeJS.Timeout | null>(null);

  // Stati per Dettagli Campagna
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsappCampaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [messageFilter, setMessageFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');
  const [messageSearch, setMessageSearch] = useState('');

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getWhatsAppCampaigns({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: 10
      });

      if (response.success && response.data) {
        setCampaigns(response.data.campaigns);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Errore caricamento campagne:', error);
      toast.error('Errore nel caricare le campagne');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  const loadSessions = useCallback(async () => {
    try {
      console.log('🔄 Caricamento sessioni WhatsApp...');
      const response = await apiClient.getWhatsAppSessions();
      console.log('📝 Risposta sessioni:', response);
      
      if (response.success && response.data) {
        console.log('✅ Sessioni caricate:', response.data.sessions.length);
        setSessions(response.data.sessions);
        
        // Debug: mostra lo stato di ogni sessione
        response.data.sessions.forEach(session => {
          console.log(`📱 Sessione ${session.sessionId}: stato = ${session.status}`);
        });
      } else {
        console.warn('⚠️ Nessuna sessione trovata');
        setSessions([]); // Imposta array vuoto invece di non fare nulla
      }
    } catch (error) {
      console.error('❌ Errore caricamento sessioni:', error);
      setSessions([]); // Imposta array vuoto in caso di errore
      
      if (error instanceof Error && error.message.includes('Timeout')) {
        toast.error('Timeout nel caricamento sessioni. Il backend potrebbe essere occupato.');
      } else {
        toast.error('Errore nel caricare le sessioni WhatsApp');
      }
    }
  }, []);

  const loadContactLists = useCallback(async () => {
    try {
      const response = await apiClient.getContactLists();
      if (response.success && response.data) {
        setContactLists(response.data);
      }
    } catch (error) {
      console.error('Errore caricamento liste:', error);
    }
  }, []);

  const loadAvailableVariables = useCallback(async () => {
    try {
      const response = await apiClient.getWhatsAppTemplateVariables();
      if (response.success && response.data) {
        setAvailableVariables(response.data);
      }
    } catch (error) {
      console.error('Errore caricamento variabili:', error);
    }
  }, []);

  const loadAllContacts = useCallback(async () => {
    try {
      const response = await apiClient.getContacts({ page: 1, limit: 1000 });
      if (response.success && response.data) {
        setAllContacts(response.data.contacts.map(c => ({ 
          _id: c._id, 
          name: c.name, 
          email: c.email 
        })));
      }
    } catch (error) {
      console.error('Errore caricamento contatti:', error);
    }
  }, []);

  const loadAllCampaigns = useCallback(async () => {
    try {
      const response = await apiClient.getWhatsAppCampaigns({ page: 1, limit: 1000 });
      if (response.success && response.data) {
        setAllCampaigns(response.data.campaigns.map((c: WhatsappCampaign) => ({ 
          _id: c._id, 
          name: c.name, 
          status: c.status 
        })));
      }
    } catch (error) {
      console.error('Errore caricamento campagne:', error);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadSessions();
    loadContactLists();
    loadAvailableVariables();
    loadAllContacts();
    loadAllCampaigns();
  }, [loadSessions, loadContactLists, loadAvailableVariables, loadAllContacts, loadAllCampaigns]);

  // ✅ AUTO-REFRESH: Ricarica campagne ogni 10 secondi per aggiornare statistiche
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) { // Solo se non è già in caricamento
        console.log('🔄 Auto-refresh campagne per aggiornare statistiche...');
        loadCampaigns();
      }
    }, 10000); // Ogni 10 secondi

    return () => clearInterval(interval);
  }, [loadCampaigns, isLoading]);

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'resume' | 'cancel') => {
    setIsActioning(campaignId);
    try {
      let response;
      switch (action) {
        case 'start':
          response = await apiClient.startWhatsAppCampaign(campaignId);
          break;
        case 'pause':
          response = await apiClient.pauseWhatsAppCampaign(campaignId);
          break;
        case 'resume':
          response = await apiClient.resumeWhatsAppCampaign(campaignId);
          break;
        case 'cancel':
          response = await apiClient.cancelWhatsAppCampaign(campaignId);
          break;
      }

      if (response.success) {
        toast.success(`Campagna ${action === 'start' ? 'avviata' : action === 'pause' ? 'pausata' : action === 'resume' ? 'ripresa' : 'cancellata'} con successo`);
        await loadCampaigns();
      }
    } catch (error) {
      console.error(`Errore ${action} campagna:`, error);
      toast.error(`Errore nel ${action === 'start' ? 'avviare' : action === 'pause' ? 'pausare' : action === 'resume' ? 'riprendere' : 'cancellare'} la campagna`);
    } finally {
      setIsActioning(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa campagna?')) return;

    try {
      await apiClient.deleteWhatsAppCampaign(campaignId);
      toast.success('Campagna eliminata con successo');
      await loadCampaigns();
    } catch (error) {
      console.error('Errore eliminazione campagna:', error);
      toast.error('Errore nell\'eliminare la campagna');
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionData.name || !newSessionData.sessionId) {
      toast.error('Nome e Session ID sono obbligatori');
      return;
    }

    try {
      console.log('🚀 Creazione sessione:', newSessionData);
      
      // Debug: prima di fare la chiamata
      console.log('🔗 Chiamando API createWhatsAppSession...');
      console.log('🌐 API Base URL:', apiClient.getBaseURL());
      
      const response = await apiClient.createWhatsAppSession(newSessionData);
      
      // Debug: risposta ricevuta
      console.log('📝 Risposta creazione sessione:', response);
      console.log('📊 Response.success:', response.success);
      console.log('📊 Response.data:', response.data);
      console.log('📊 Response.message:', response.message);
      
      if (response.success) {
        toast.success('Sessione WhatsApp creata con successo');
        setShowNewSessionDialog(false);
        
        // Reset form
        setNewSessionData({ name: '', sessionId: '' });
        
        // Ricarica le sessioni per avere l'ultima versione
        await loadSessions();
        
        // CRITICAL FIX: Attendi che il backend generi il QR code
        toast.info('Generazione QR code in corso...', { duration: 3000 });
        
        // Prova a recuperare il QR code più volte con retry
        let retryCount = 0;
        const maxRetries = 20; // 20 tentativi in 20 secondi
        
        const tryGetQrCode = async () => {
          try {
            console.log(`🔄 Tentativo ${retryCount + 1}/${maxRetries} per recuperare QR code...`);
            
            // Prima controlla lo stato della sessione
            const sessionResponse = await apiClient.getWhatsAppSession(newSessionData.sessionId);
            console.log('📊 Stato sessione:', sessionResponse);
            
                         if (sessionResponse.success && sessionResponse.data) {
               const sessionStatus = sessionResponse.data.status;
               console.log(`🔍 Stato attuale sessione: ${sessionStatus}`);
               
               if (sessionStatus === 'qr_ready') {
                 // QR code dovrebbe essere pronto, prova a recuperarlo
                 const qrResponse = await apiClient.getWhatsAppSessionQrCode(newSessionData.sessionId);
                 console.log('📱 Risposta QR code:', qrResponse);
                 
                 if (qrResponse.success && qrResponse.data?.qrCode) {
                   console.log('✅ QR code recuperato con successo!');
                   setQrCodeData(qrResponse.data.qrCode);
                   setSelectedQrSession(newSessionData.sessionId);
          
          // NUOVO: Avvia monitoraggio attivo della connessione
          startQrMonitoring(newSessionData.sessionId);
          
                   toast.success('QR code pronto! Scansiona con WhatsApp per connettere.');
                   return true;
                 }
               } else if (sessionStatus === 'authenticated' || sessionStatus === 'connected') {
                 // Sessione autenticata! Chiudi dialog e aggiorna lista
                 console.log('🎉 Sessione autenticata con successo!');
                 setQrCodeData(null);
                 setSelectedQrSession(null);
                setShowNewSessionDialog(false); // NUOVO: Chiudi anche il dialog di creazione
                 toast.success('WhatsApp connesso con successo!');
                 await loadSessions(); // Ricarica le sessioni
                 return true; // Stop retry
               } else if (sessionStatus === 'connecting') {
                 console.log('⏳ Sessione ancora in connessione, continuo ad aspettare...');
               } else if (sessionStatus === 'error') {
                 console.error('❌ Errore nella sessione WhatsApp');
                 toast.error('Errore nella connessione WhatsApp. Riprova.');
                 return true; // Stop retry
               }
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
              // Riprova dopo 1 secondo (più veloce)
              setTimeout(tryGetQrCode, 1000);
            } else {
              console.warn('⚠️ Timeout recupero QR code. Sessione creata, usa "Mostra QR" manualmente.');
              toast.warning('Sessione creata. Clicca su "Mostra QR" per collegare WhatsApp');
            }
          } catch (error) {
            console.error('❌ Errore durante recupero QR automatico:', error);
            retryCount++;
            if (retryCount < maxRetries) {
              setTimeout(tryGetQrCode, 1500);
            } else {
              toast.warning('Sessione creata. Clicca su "Mostra QR" per collegare WhatsApp');
            }
          }
        };
        
        // Inizia il polling dopo 2 secondi
        setTimeout(tryGetQrCode, 2000);
      }
    } catch (error) {
      console.error('❌ Errore creazione sessione:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      if (error instanceof Error && error.message) {
        toast.error(`Errore nella creazione della sessione: ${error.message}`);
      } else {
        toast.error('Errore nella creazione della sessione');
      }
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignData.name || !newCampaignData.whatsappSessionId || newCampaignData.whatsappSessionId === 'no-sessions' || !newCampaignData.targetList || !newCampaignData.messageTemplate) {
      toast.error('Tutti i campi obbligatori devono essere compilati');
      return;
    }

    try {
      const response = await apiClient.createWhatsAppCampaign(newCampaignData);
      if (response.success) {
        toast.success('Campagna creata con successo');
        setShowNewCampaignDialog(false);
        setNewCampaignData({
          name: '',
          description: '',
          whatsappSessionId: '',
          targetList: '',
          messageTemplate: '',
          messageSequences: [],
          contactFilters: {
            excludeContacts: [],
            excludeFromCampaigns: [],
            excludeContactedWithinDays: undefined
          },
          timing: {
            intervalBetweenMessages: 30,
            schedule: {
              startTime: '09:00',
              endTime: '18:00',
              timezone: 'Europe/Rome'
            }
          }
        });
        await loadCampaigns();
      }
    } catch (error) {
      console.error('Errore creazione campagna:', error);
      toast.error('Errore nella creazione della campagna');
    }
  };

  const handleShowQrCode = async (sessionId: string) => {
    try {
      console.log('🔍 Richiesta QR code per sessione:', sessionId);
      const response = await apiClient.getWhatsAppSessionQrCode(sessionId);
      console.log('📱 Risposta API QR code:', response);
      
      if (response.success && response.data) {
        console.log('✅ QR code ricevuto, apertura dialog...');
        setQrCodeData(response.data.qrCode);
        setSelectedQrSession(sessionId);
        toast.success('QR code caricato!');
      } else {
        console.warn('⚠️ QR code non disponibile:', response.message || 'Nessun dato');
        toast.warning(response.message || 'QR code non disponibile al momento');
      }
    } catch (error) {
      console.error('❌ Errore ottenimento QR:', error);
      toast.error('Errore nel ottenere il QR code: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    }
  };

  const handleSessionAction = async (sessionId: string, action: 'disconnect' | 'reconnect' | 'delete') => {
    try {
      switch (action) {
        case 'disconnect':
          await apiClient.disconnectWhatsAppSession(sessionId);
          toast.success('Sessione disconnessa');
          break;
        case 'reconnect':
          toast.info('🔄 Avvio riconnessione...');
          await apiClient.reconnectWhatsAppSession(sessionId);
          toast.success('✅ Riconnessione avviata! Cercando QR code...');
          
          // ✅ STESSO POLLING DELLA CREAZIONE NUOVA
          let retries = 0;
          const maxRetries = 20; // 20 tentativi in 20 secondi
          
          const tryGetReconnectQrCode = async (): Promise<boolean> => {
            try {
              console.log(`🔍 Tentativo ${retries + 1}/${maxRetries} - Controllo stato sessione riconnessa:`, sessionId);
              const sessionResponse = await apiClient.getWhatsAppSession(sessionId);
              console.log('📊 Stato sessione riconnessa:', sessionResponse);
              
              if (sessionResponse.success && sessionResponse.data) {
                const sessionStatus = sessionResponse.data.status;
                console.log(`🔍 Stato attuale sessione riconnessa: ${sessionStatus}`);
                
                if (sessionStatus === 'qr_ready') {
                  // QR code dovrebbe essere pronto, prova a recuperarlo
                  const qrResponse = await apiClient.getWhatsAppSessionQrCode(sessionId);
                  console.log('📱 Risposta QR code riconnessione:', qrResponse);
                  
                  if (qrResponse.success && qrResponse.data?.qrCode) {
                    console.log('✅ QR code riconnessione recuperato con successo!');
                    setQrCodeData(qrResponse.data.qrCode);
                    setSelectedQrSession(sessionId);
                    
                    // Avvia monitoraggio attivo della riconnessione
                    startQrMonitoring(sessionId);
                    
                    toast.success('QR code pronto! Scansiona con WhatsApp per riconnettere.');
                    return true;
                  }
                } else if (sessionStatus === 'authenticated' || sessionStatus === 'connected') {
                  // Sessione riconnessa! 
                  console.log('🎉 Sessione riconnessa con successo!');
                  toast.success('Sessione riconnessa automaticamente!');
                  return true;
                }
              }
              
              return false;
            } catch (error) {
              console.error('Errore controllo QR riconnessione:', error);
              return false;
            }
          };
          
          // Avvia il polling per il QR della riconnessione
          const pollForReconnectQr = async () => {
            if (await tryGetReconnectQrCode()) {
              return; // QR trovato o sessione connessa
            }
            
            retries++;
            if (retries < maxRetries) {
              setTimeout(pollForReconnectQr, 1000); // Riprova tra 1 secondo
            } else {
              console.warn('❌ Timeout: QR code riconnessione non disponibile dopo', maxRetries, 'tentativi');
              toast.warning('QR code non ancora disponibile. Prova a cliccare "Mostra QR" tra qualche secondo.');
            }
          };
          
          // Inizia il polling dopo 2 secondi (il backend ha bisogno di tempo)
          setTimeout(pollForReconnectQr, 2000);
          break;
        case 'delete':
          if (!confirm('Sei sicuro di voler eliminare questa sessione?')) return;
          await apiClient.deleteWhatsAppSession(sessionId);
          toast.success('Sessione eliminata');
          break;
      }
      await loadSessions();
    } catch (error) {
      console.error(`Errore ${action} sessione:`, error);
      toast.error(`Errore nell'operazione sulla sessione`);
    }
  };

  const handleRefreshSessions = async () => {
    try {
      console.log('🔄 Aggiornamento manuale sessioni...');
      toast.info('Controllo stato sessioni in corso...');
      
      // Chiama l'API per controllare tutte le sessioni
      const response = await fetch('/api/session-monitor/check-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Sessioni aggiornate con successo');
        // Ricarica le sessioni per mostrare i dati aggiornati
        await loadSessions();
      } else {
        throw new Error('Errore nel controllo sessioni');
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento sessioni:', error);
      toast.error('Errore durante l\'aggiornamento delle sessioni');
    }
  };

  const startQrMonitoring = (sessionId: string) => {
    // Ferma monitoraggio precedente se attivo
    if (qrMonitorInterval) {
      clearInterval(qrMonitorInterval);
    }

    console.log(`📡 Avvio monitoraggio QR per sessione: ${sessionId}`);
    
    const interval = setInterval(async () => {
      try {
        const sessionResponse = await apiClient.getWhatsAppSession(sessionId);
        
        if (sessionResponse.success && sessionResponse.data) {
          const status = sessionResponse.data.status;
          console.log(`🔍 Monitor QR - Stato sessione: ${status}`);
          
          if (status === 'authenticated' || status === 'connected') {
            console.log('🎉 QR Monitor - Connessione rilevata!');
            
            // Chiudi dialog e ferma monitoraggio
            setQrCodeData(null);
            setSelectedQrSession(null);
            setShowNewSessionDialog(false);
            clearInterval(interval);
            setQrMonitorInterval(null);
            
            toast.success('WhatsApp connesso con successo!');
            await loadSessions();
          }
        }
      } catch (error) {
        console.error('❌ Errore monitoraggio QR:', error);
      }
    }, 2000); // Controlla ogni 2 secondi

    setQrMonitorInterval(interval);
    
    // Auto-stop dopo 5 minuti
    setTimeout(() => {
      if (qrMonitorInterval === interval) {
        clearInterval(interval);
        setQrMonitorInterval(null);
        console.log('⏰ Timeout monitoraggio QR');
      }
    }, 5 * 60 * 1000);
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const statusConfig = CAMPAIGN_STATUSES.find(s => s.value === status);
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      running: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="secondary" className={colors[status]}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getSessionStatusBadge = (status: string) => {
    const statusConfig = SESSION_STATUSES.find(s => s.value === status);
    const colors = {
      disconnected: 'bg-gray-100 text-gray-800',
      connecting: 'bg-blue-100 text-blue-800',
      qr_ready: 'bg-yellow-100 text-yellow-800',
      authenticated: 'bg-green-100 text-green-800',
      connected: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const insertTemplateVariable = (variable: string) => {
    const newTemplate = newCampaignData.messageTemplate + `{${variable}}`;
    setNewCampaignData(prev => ({ ...prev, messageTemplate: newTemplate }));
  };

  const insertTemplateVariableInSequence = (sequenceId: string, variable: string) => {
    setNewCampaignData(prev => ({
      ...prev,
      messageSequences: prev.messageSequences?.map(seq => 
        seq.id === sequenceId 
          ? { ...seq, messageTemplate: seq.messageTemplate + `{${variable}}` }
          : seq
      ) || []
    }));
  };

  const addMessageSequence = () => {
    const newSequence: MessageSequence = {
      id: `seq_${Date.now()}`,
      messageTemplate: '',
      delayMinutes: 60,
      condition: 'no_response',
      isActive: true
    };
    
    setNewCampaignData(prev => ({
      ...prev,
      messageSequences: [...(prev.messageSequences || []), newSequence]
    }));
  };

  const removeMessageSequence = (sequenceId: string) => {
    setNewCampaignData(prev => ({
      ...prev,
      messageSequences: prev.messageSequences?.filter(seq => seq.id !== sequenceId) || []
    }));
  };

  const updateMessageSequence = (sequenceId: string, updates: Partial<MessageSequence>) => {
    setNewCampaignData(prev => ({
      ...prev,
      messageSequences: prev.messageSequences?.map(seq => 
        seq.id === sequenceId ? { ...seq, ...updates } : seq
      ) || []
    }));
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && campaigns.length === 0 && sessions.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="transition-all duration-300">
        <ModernSidebar />
      </div>

      <main className="pl-16 transition-all duration-300">
        <div className="container mx-auto py-4 px-6 max-w-7xl">
          <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="h-8 w-8" />
                  Campagne WhatsApp
                  <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                    Auto-refresh
                  </div>
                </h1>
                <p className="text-gray-600 mt-2">
              Gestisci le tue campagne di messaggi WhatsApp e le sessioni connesse
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="campaigns">Campagne</TabsTrigger>
              <TabsTrigger value="sessions">Sessioni WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-6">
              {/* Header Campagne */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Cerca campagne..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={(value: CampaignStatus | 'all') => setStatusFilter(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtra per stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      {CAMPAIGN_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Campagna
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Crea Nuova Campagna WhatsApp</DialogTitle>
                      <DialogDescription>
                        Configura una nuova campagna di messaggi WhatsApp
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Nome Campagna</label>
                          <Input
                            value={newCampaignData.name}
                            onChange={(e) => setNewCampaignData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Es. Promozione Primavera"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Sessione WhatsApp</label>
                          <Select 
                            value={newCampaignData.whatsappSessionId} 
                            onValueChange={(value) => setNewCampaignData(prev => ({ ...prev, whatsappSessionId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona sessione" />
                            </SelectTrigger>
                            <SelectContent>
                              {sessions.filter(s => s.status === 'authenticated' || s.status === 'connected').map(session => (
                                <SelectItem key={session.sessionId} value={session.sessionId}>
                                  {session.name} - {session.phoneNumber}
                                </SelectItem>
                              ))}
                              {sessions.filter(s => s.status === 'authenticated' || s.status === 'connected').length === 0 && (
                                <SelectItem value="no-sessions" disabled>
                                  Nessuna sessione attiva. Crea e connetti una sessione prima.
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Descrizione</label>
                        <Input
                          value={newCampaignData.description}
                          onChange={(e) => setNewCampaignData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrizione della campagna"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Lista Contatti</label>
                        <Select 
                          value={newCampaignData.targetList} 
                          onValueChange={(value) => setNewCampaignData(prev => ({ ...prev, targetList: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona lista" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutti i contatti</SelectItem>
                            {contactLists.map(list => (
                              <SelectItem key={list.name} value={list.name}>
                                {list.name} ({list.count} contatti)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* ✅ NUOVI FILTRI DI ESCLUSIONE */}
                      <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Ban className="h-4 w-4" />
                          Filtri di Esclusione
                        </h4>
                        
                        {/* Escludi contatti specifici */}
                        <div>
                          <label className="text-xs font-medium flex items-center gap-1">
                            <UserX className="h-3 w-3" />
                            Escludi contatti specifici
                          </label>
                          <Select 
                            value=""
                            onValueChange={(contactId) => {
                              if (contactId && !newCampaignData.contactFilters?.excludeContacts?.includes(contactId)) {
                                setNewCampaignData(prev => ({
                                  ...prev,
                                  contactFilters: {
                                    ...prev.contactFilters,
                                    excludeContacts: [...(prev.contactFilters?.excludeContacts || []), contactId]
                                  }
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Aggiungi contatto da escludere" />
                            </SelectTrigger>
                            <SelectContent>
                              {allContacts.filter(c => !newCampaignData.contactFilters?.excludeContacts?.includes(c._id)).map(contact => (
                                <SelectItem key={contact._id} value={contact._id}>
                                  {contact.name} {contact.email && `(${contact.email})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newCampaignData.contactFilters?.excludeContacts && newCampaignData.contactFilters.excludeContacts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {newCampaignData.contactFilters.excludeContacts.map(contactId => {
                                const contact = allContacts.find(c => c._id === contactId);
                                return contact ? (
                                  <Badge key={contactId} variant="destructive" className="text-xs">
                                    {contact.name}
                                    <X 
                                      className="h-3 w-3 ml-1 cursor-pointer"
                                      onClick={() => setNewCampaignData(prev => ({
                                        ...prev,
                                        contactFilters: {
                                          ...prev.contactFilters,
                                          excludeContacts: prev.contactFilters?.excludeContacts?.filter(id => id !== contactId) || []
                                        }
                                      }))}
                                    />
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>

                        {/* Escludi da altre campagne */}
                        <div>
                          <label className="text-xs font-medium flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            Escludi contatti presenti in altre campagne
                          </label>
                          <Select 
                            value=""
                            onValueChange={(campaignId) => {
                              if (campaignId && !newCampaignData.contactFilters?.excludeFromCampaigns?.includes(campaignId)) {
                                setNewCampaignData(prev => ({
                                  ...prev,
                                  contactFilters: {
                                    ...prev.contactFilters,
                                    excludeFromCampaigns: [...(prev.contactFilters?.excludeFromCampaigns || []), campaignId]
                                  }
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Aggiungi campagna da cui escludere contatti" />
                            </SelectTrigger>
                            <SelectContent>
                              {allCampaigns.filter(c => !newCampaignData.contactFilters?.excludeFromCampaigns?.includes(c._id)).map(campaign => (
                                <SelectItem key={campaign._id} value={campaign._id}>
                                  {campaign.name} ({campaign.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newCampaignData.contactFilters?.excludeFromCampaigns && newCampaignData.contactFilters.excludeFromCampaigns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {newCampaignData.contactFilters.excludeFromCampaigns.map(campaignId => {
                                const campaign = allCampaigns.find(c => c._id === campaignId);
                                return campaign ? (
                                  <Badge key={campaignId} variant="secondary" className="text-xs">
                                    {campaign.name}
                                    <X 
                                      className="h-3 w-3 ml-1 cursor-pointer"
                                      onClick={() => setNewCampaignData(prev => ({
                                        ...prev,
                                        contactFilters: {
                                          ...prev.contactFilters,
                                          excludeFromCampaigns: prev.contactFilters?.excludeFromCampaigns?.filter(id => id !== campaignId) || []
                                        }
                                      }))}
                                    />
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>

                        {/* Escludi contattati di recente */}
                        <div>
                          <label className="text-xs font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Escludi contatti contattati negli ultimi X giorni
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="365"
                              value={newCampaignData.contactFilters?.excludeContactedWithinDays || ''}
                              onChange={(e) => setNewCampaignData(prev => ({
                                ...prev,
                                contactFilters: {
                                  ...prev.contactFilters,
                                  excludeContactedWithinDays: e.target.value ? parseInt(e.target.value) : undefined
                                }
                              }))}
                              placeholder="0"
                              className="h-8 w-20 text-xs"
                            />
                            <span className="text-xs text-gray-600">giorni</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setNewCampaignData(prev => ({
                                ...prev,
                                contactFilters: {
                                  ...prev.contactFilters,
                                  excludeContactedWithinDays: undefined
                                }
                              }))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Esclude contatti che hanno ricevuto messaggi WhatsApp negli ultimi X giorni
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Template Messaggio Principale</label>
                        <Textarea
                          value={newCampaignData.messageTemplate}
                          onChange={(e) => setNewCampaignData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                          placeholder="Ciao {nome}, sono {utente} di MenuChatCRM..."
                          rows={6}
                        />
                        
                        {/* Variabili disponibili */}
                        {availableVariables && (
                        <div className="mt-3">
                            {/* Variabili Fisse */}
                            <div className="mb-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">Variabili Fisse:</p>
                          <div className="flex flex-wrap gap-2">
                                {availableVariables.fixed.map((variable) => (
                                  <Button 
                                    key={variable.key}
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => insertTemplateVariable(variable.key)}
                                    title={variable.description}
                                  >
                                    +{variable.key}
                            </Button>
                                ))}
                          </div>
                        </div>

                        {/* Variabili Dinamiche */}
                            {availableVariables.dynamic.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">Proprietà Dinamiche dei Contatti:</p>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                  {availableVariables.dynamic.map((variable) => (
                                    <Button 
                                      key={variable.key}
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => insertTemplateVariable(variable.key)}
                                      title={variable.description}
                                    >
                                      +{variable.key}
                            </Button>
                                  ))}
                          </div>
                        </div>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          💡 Le variabili verranno sostituite automaticamente con i dati dei contatti
                        </p>
                      </div>

                      {/* Sequenze di Follow-up */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium">Messaggi di Follow-up</label>
                          <Button type="button" variant="outline" size="sm" onClick={addMessageSequence}>
                            <Plus className="h-4 w-4 mr-1" />
                            Aggiungi Follow-up
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {newCampaignData.messageSequences?.map((sequence, index) => (
                            <div key={sequence.id} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium">Follow-up #{index + 1}</h4>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeMessageSequence(sequence.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Condizione</label>
                                  <Select
                                    value={sequence.condition}
                                    onValueChange={(value: 'no_response' | 'always') => 
                                      updateMessageSequence(sequence.id, { condition: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="no_response">Solo se nessuna risposta</SelectItem>
                                      <SelectItem value="always">Invia sempre</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <label className="text-xs font-medium text-gray-600">Attendi (minuti)</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={sequence.delayMinutes}
                                    onChange={(e) => 
                                      updateMessageSequence(sequence.id, { delayMinutes: parseInt(e.target.value) || 60 })
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-gray-600">Template Messaggio</label>
                                <Textarea
                                  value={sequence.messageTemplate}
                                  onChange={(e) => 
                                    updateMessageSequence(sequence.id, { messageTemplate: e.target.value })
                                  }
                                  placeholder="Messaggio di follow-up..."
                                  rows={3}
                                  className="mt-1"
                                />
                                
                                {/* Variabili per questa sequenza */}
                                {availableVariables && (
                                <div className="mt-2">
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                      {availableVariables.fixed.map((variable) => (
                                        <Button 
                                          key={variable.key}
                                          type="button" 
                                          variant="outline" 
                                          size="sm" 
                                          className="text-xs h-6" 
                                          onClick={() => insertTemplateVariableInSequence(sequence.id, variable.key)}
                                          title={variable.description}
                                        >
                                          +{variable.key}
                                    </Button>
                                      ))}
                                      {availableVariables.dynamic.slice(0, 3).map((variable) => (
                                        <Button 
                                          key={variable.key}
                                          type="button" 
                                          variant="outline" 
                                          size="sm" 
                                          className="text-xs h-6" 
                                          onClick={() => insertTemplateVariableInSequence(sequence.id, variable.key)}
                                          title={variable.description}
                                        >
                                          +{variable.key}
                                    </Button>
                                      ))}
                                  </div>
                                </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {(!newCampaignData.messageSequences || newCampaignData.messageSequences.length === 0) && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              Nessun follow-up configurato. I follow-up permettono di inviare messaggi automatici 
                              dopo un certo tempo se il contatto non risponde.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Configurazione Timing */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Intervallo tra messaggi (secondi)</label>
                          <Input
                            type="number"
                            min="5"
                            max="3600"
                            value={newCampaignData.timing.intervalBetweenMessages}
                            onChange={(e) => setNewCampaignData(prev => ({ 
                              ...prev, 
                              timing: { ...prev.timing, intervalBetweenMessages: Number(e.target.value) }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">Tempo di attesa tra un messaggio e l&apos;altro</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Fascia Oraria di Invio</label>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className="text-xs text-gray-600">Dalle</label>
                          <Input
                                type="time"
                                value={newCampaignData.timing.schedule.startTime}
                            onChange={(e) => setNewCampaignData(prev => ({ 
                              ...prev, 
                                  timing: { 
                                    ...prev.timing, 
                                    schedule: { ...prev.timing.schedule, startTime: e.target.value }
                                  }
                            }))}
                          />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Alle</label>
                              <Input
                                type="time"
                                value={newCampaignData.timing.schedule.endTime}
                                onChange={(e) => setNewCampaignData(prev => ({ 
                                  ...prev, 
                                  timing: { 
                                    ...prev.timing, 
                                    schedule: { ...prev.timing.schedule, endTime: e.target.value }
                                  }
                                }))}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">I messaggi verranno inviati solo in questa fascia oraria (fuso italiano)</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                          Annulla
                        </Button>
                        <Button onClick={handleCreateCampaign}>
                          Crea Campagna
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tabella Campagne */}
          <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Sessione</TableHead>
                        <TableHead>Lista Target</TableHead>
                        <TableHead>Messaggi</TableHead>
                        <TableHead>Creata</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign._id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              {campaign.description && (
                                <div className="text-sm text-gray-500">{campaign.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell>{campaign.whatsappNumber}</TableCell>
                          <TableCell>{campaign.targetList}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{campaign.stats.messagesSent}/{campaign.stats.totalContacts}</div>
                              <div className="text-gray-500">
                                {campaign.stats.repliesReceived} risposte
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.createdAt).toLocaleDateString('it-IT')}
                          </TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedCampaign(campaign);
                                  setShowCampaignDetails(true);
                                }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                  Dettagli
                                </DropdownMenuItem>
                                {campaign.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'start')}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Avvia
                                  </DropdownMenuItem>
                                )}
                                {campaign.status === 'running' && (
                                  <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'pause')}>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pausa
                                  </DropdownMenuItem>
                                )}
                                {campaign.status === 'paused' && (
                                  <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'resume')}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Riprendi
                                  </DropdownMenuItem>
                                )}
                                {['running', 'paused'].includes(campaign.status) && (
                                  <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'cancel')}>
                                    <Square className="h-4 w-4 mr-2" />
                                    Cancella
                                    </DropdownMenuItem>
                                  )}
                                {!['running'].includes(campaign.status) && (
                                  <DropdownMenuItem onClick={() => handleDeleteCampaign(campaign._id)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Elimina
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
            </CardContent>
          </Card>

          {/* Paginazione */}
          {totalPages > 1 && (
                <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Precedente
                </Button>
                <span className="text-sm text-gray-600">
                  Pagina {currentPage} di {totalPages}
                </span>
                <Button
                  variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                    Successiva
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6">
              {/* Header Sessioni */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Sessioni WhatsApp</h3>
                  <p className="text-gray-600">Gestisci le connessioni ai tuoi numeri WhatsApp</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshSessions}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Aggiorna Sessioni
                  </Button>
                <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuova Sessione
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuova Sessione WhatsApp</DialogTitle>
                      <DialogDescription>
                        Collega un nuovo numero WhatsApp per le campagne
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Nome Sessione</label>
                        <Input
                          value={newSessionData.name}
                          onChange={(e) => setNewSessionData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Es. Marketing WhatsApp"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Session ID</label>
                        <Input
                          value={newSessionData.sessionId}
                          onChange={(e) => setNewSessionData(prev => ({ ...prev, sessionId: e.target.value }))}
                          placeholder="Es. marketing-wa"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          ID univoco per identificare questa sessione (solo lettere, numeri e trattini)
                        </p>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                          Annulla
                        </Button>
                        <Button onClick={handleCreateSession}>
                          Crea Sessione
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>

              {/* Griglia Sessioni */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <Card key={session.sessionId} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{session.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {session.status === 'qr_ready' && (
                              <DropdownMenuItem onClick={() => handleShowQrCode(session.sessionId)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                Mostra QR
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleSessionAction(session.sessionId, 'reconnect')}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Riconnetti
                            </DropdownMenuItem>
                            {session.status !== 'disconnected' && (
                              <DropdownMenuItem onClick={() => handleSessionAction(session.sessionId, 'disconnect')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Disconnetti
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleSessionAction(session.sessionId, 'delete')} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{session.phoneNumber}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Stato:</span>
                          {getSessionStatusBadge(session.status)}
                        </div>
                        
                        {session.connectionInfo?.connectedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Connesso:</span>
                            <span className="text-sm">
                              {new Date(session.connectionInfo.connectedAt).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Messaggi inviati:</span>
                          <span className="text-sm font-medium">{session.stats.messagesSent}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Campagne attive:</span>
                          <span className="text-sm font-medium">{session.stats.activeCampaigns}</span>
                        </div>

                        {session.status === 'qr_ready' && (
                          <Button 
                            className="w-full mt-3" 
                            variant="outline"
                            onClick={() => handleShowQrCode(session.sessionId)}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Mostra QR Code
                </Button>
                        )}

                        {/* ✅ NUOVO: Bottone Riconnetti prominente per sessioni disconnesse */}
                        {(session.status === 'disconnected' || session.status === 'error') && (
                          <Button 
                            className="w-full mt-3" 
                            variant="default"
                            onClick={() => handleSessionAction(session.sessionId, 'reconnect')}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            🔄 Riconnetti Sessione
                          </Button>
                        )}

                        {session.status === 'connecting' && (
                          <div className="w-full mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-blue-600">Riconnessione in corso...</p>
                            <p className="text-xs text-blue-500">Controlla il QR code tra qualche secondo</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {sessions.length === 0 && (
                <Card className="text-center py-12">
                  <CardContent>
                    <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna sessione WhatsApp</h3>
                    <p className="text-gray-600 mb-4">
                      Crea la tua prima sessione per iniziare a inviare campagne WhatsApp
                    </p>
                    <Button onClick={() => setShowNewSessionDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Prima Sessione
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Dialog QR Code */}
          <Dialog open={!!selectedQrSession} onOpenChange={() => {
            setSelectedQrSession(null);
            setQrCodeData(null);
            
            // Ferma monitoraggio quando dialog si chiude
            if (qrMonitorInterval) {
              clearInterval(qrMonitorInterval);
              setQrMonitorInterval(null);
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Scansiona QR Code</DialogTitle>
                <DialogDescription>
                  Usa WhatsApp per scansionare questo QR code e connettere la sessione
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center p-6">
                {qrCodeData ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={qrCodeData} 
                      alt="QR Code WhatsApp" 
                      className="w-64 h-64 border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
              </div>
              <p className="text-sm text-gray-600 text-center">
                Il QR code si aggiorna automaticamente ogni 30 secondi
              </p>
            </DialogContent>
          </Dialog>

          {/* Dialog Dettagli Campagna */}
          <Dialog open={showCampaignDetails} onOpenChange={(open) => {
            setShowCampaignDetails(open);
            if (!open) {
              setShowAllMessages(false); // Reset quando si chiude il dialog
              setMessageFilter('all');
              setMessageSearch('');
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dettagli Campagna: {selectedCampaign?.name}</DialogTitle>
                <DialogDescription>
                  Informazioni dettagliate e statistiche della campagna
                </DialogDescription>
              </DialogHeader>
              
              {selectedCampaign && (
                <div className="space-y-6">
                  {/* Statistiche Generali */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedCampaign.stats.messagesSent}
                        </div>
                        <div className="text-sm text-gray-600">Messaggi Inviati</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedCampaign.stats.totalContacts}
                        </div>
                        <div className="text-sm text-gray-600">Contatti Totali</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedCampaign.stats.repliesReceived}
                        </div>
                        <div className="text-sm text-gray-600">Risposte</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedCampaign.stats.errors}
                        </div>
                        <div className="text-sm text-gray-600">Errori</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Informazioni Campagna */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Informazioni Campagna</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Stato</label>
                          <div className="mt-1">{getStatusBadge(selectedCampaign.status)}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Lista Target</label>
                          <div className="mt-1">{selectedCampaign.targetList}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Numero WhatsApp</label>
                          <div className="mt-1">{selectedCampaign.whatsappNumber}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Data Creazione</label>
                          <div className="mt-1">{new Date(selectedCampaign.createdAt).toLocaleDateString('it-IT')}</div>
                        </div>
                      </div>
                      
                      {selectedCampaign.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Descrizione</label>
                          <div className="mt-1 text-sm">{selectedCampaign.description}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timing e Configurazione */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurazione Invio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Intervallo tra Messaggi</label>
                          <div className="mt-1">{selectedCampaign.timing.intervalBetweenMessages} secondi</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Fascia Oraria</label>
                          <div className="mt-1">
                            {selectedCampaign.timing.schedule.startTime} - {selectedCampaign.timing.schedule.endTime}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Template Messaggio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Template Messaggio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                        {selectedCampaign.messageTemplate}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sequenze di Follow-up */}
                  {selectedCampaign.messageSequences && selectedCampaign.messageSequences.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Sequenze di Follow-up ({selectedCampaign.messageSequences.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedCampaign.messageSequences.map((sequence, index) => (
                            <div key={sequence.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Follow-up #{index + 1}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant={sequence.isActive ? "default" : "secondary"}>
                                    {sequence.isActive ? "Attivo" : "Inattivo"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {sequence.delayMinutes}min dopo
                                  </Badge>
                                  <Badge variant="outline">
                                    {sequence.condition === 'no_response' ? 'Solo se nessuna risposta' : 'Sempre'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="bg-gray-50 p-2 rounded text-sm font-mono">
                                {sequence.messageTemplate}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Coda Messaggi */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Stato Messaggi ({selectedCampaign.messageQueue.length})</span>
                        {selectedCampaign.messageQueue.length > 20 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllMessages(!showAllMessages)}
                            className="text-xs"
                          >
                            {showAllMessages ? 'Mostra meno' : 'Mostra tutti'}
                          </Button>
                        )}
                      </CardTitle>
                      <div className="text-sm text-gray-600">
                        {showAllMessages 
                          ? `Visualizzati tutti i ${selectedCampaign.messageQueue.length} messaggi`
                          : `Visualizzati primi ${Math.min(20, selectedCampaign.messageQueue.length)} messaggi`
                        } • Ordinati per data di invio
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Filtri e Ricerca (visibili solo quando si mostrano tutti) */}
                      {showAllMessages && selectedCampaign.messageQueue.length > 10 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <Input
                                placeholder="Cerca per nome, numero o ID contatto..."
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <Select value={messageFilter} onValueChange={(value: any) => setMessageFilter(value)}>
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tutti gli stati</SelectItem>
                                <SelectItem value="pending">In attesa</SelectItem>
                                <SelectItem value="sent">Inviati</SelectItem>
                                <SelectItem value="failed">Falliti</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div className={`space-y-2 overflow-y-auto ${showAllMessages ? 'max-h-96' : 'max-h-60'}`}>
                        {(() => {
                          // Logica di filtraggio e ricerca
                          let filteredMessages = showAllMessages 
                            ? selectedCampaign.messageQueue 
                            : selectedCampaign.messageQueue.slice(0, 20);

                          // Applica filtro stato
                          if (messageFilter !== 'all') {
                            filteredMessages = filteredMessages.filter(m => m.status === messageFilter);
                          }

                          // Applica ricerca testuale
                          if (messageSearch.trim()) {
                            const searchLower = messageSearch.toLowerCase().trim();
                            filteredMessages = filteredMessages.filter(message => {
                              const contact = allContacts.find(c => c._id === message.contactId);
                              return (
                                contact?.name?.toLowerCase().includes(searchLower) ||
                                message.phoneNumber.includes(searchLower) ||
                                message.contactId.toLowerCase().includes(searchLower)
                              );
                            });
                          }

                          return filteredMessages.map((message, index) => {
                          // Cerca il contatto corrispondente nei contatti caricati
                          const contact = allContacts.find(c => c._id === message.contactId);
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg text-sm hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col min-w-0 flex-1">
                                  {contact?.name && (
                                    <span className="font-medium text-gray-900 truncate">
                                      {contact.name}
                                    </span>
                                  )}
                                  <span className="font-mono text-blue-600">
                                    {message.phoneNumber}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ID: {message.contactId.slice(-4)}
                                  </span>
                                </div>
                                {message.sequenceIndex && message.sequenceIndex > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Follow-up #{message.sequenceIndex}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  message.status === 'sent' ? 'default' :
                                  message.status === 'delivered' ? 'default' :
                                  message.status === 'failed' ? 'destructive' :
                                  'secondary'
                                } className="capitalize">
                                  {message.status === 'sent' ? 'Inviato' :
                                   message.status === 'delivered' ? 'Consegnato' :
                                   message.status === 'failed' ? 'Fallito' :
                                   message.status === 'pending' ? 'In Attesa' :
                                   message.status}
                                </Badge>
                                {message.sentAt && (
                                  <span className="text-xs text-gray-500 min-w-max">
                                    {new Date(message.sentAt).toLocaleString('it-IT', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                                                     );
                         });
                        })()}
                        
                        {/* Messaggi filtrati vuoti */}
                        {showAllMessages && messageSearch.trim() && (() => {
                          let filteredMessages = selectedCampaign.messageQueue;
                          if (messageFilter !== 'all') {
                            filteredMessages = filteredMessages.filter(m => m.status === messageFilter);
                          }
                          const searchLower = messageSearch.toLowerCase().trim();
                          filteredMessages = filteredMessages.filter(message => {
                            const contact = allContacts.find(c => c._id === message.contactId);
                            return (
                              contact?.name?.toLowerCase().includes(searchLower) ||
                              message.phoneNumber.includes(searchLower) ||
                              message.contactId.toLowerCase().includes(searchLower)
                            );
                          });
                          return filteredMessages.length === 0;
                        })() && (
                          <div className="text-center text-gray-500 py-8">
                            🔍 Nessun messaggio trovato con i filtri attuali
                          </div>
                        )}

                        {!showAllMessages && selectedCampaign.messageQueue.length > 20 && (
                          <div className="text-center text-sm text-gray-500 py-3 border-t">
                            💬 Altri {selectedCampaign.messageQueue.length - 20} messaggi nascosti
                            <br />
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => setShowAllMessages(true)}
                              className="text-xs mt-1 p-0 h-auto"
                            >
                              Clicca "Mostra tutti" per visualizzarli
                            </Button>
                          </div>
                        )}
                        {selectedCampaign.messageQueue.length === 0 && (
                          <div className="text-center text-gray-500 py-8">
                            📭 Nessun messaggio in coda
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default function WhatsAppCampaignsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <CampaignsContent />;
} 