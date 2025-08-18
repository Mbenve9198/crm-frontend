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
  Loader2,
  MoreHorizontal,
  QrCode,
  Smartphone,
  RefreshCw
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
  CreateCampaignRequest
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
    timing: {
      intervalBetweenMessages: 30,
      messagesPerHour: 60
    }
  });

  // Stati per QR Code
  const [selectedQrSession, setSelectedQrSession] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

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
      }
    } catch (error) {
      console.error('❌ Errore caricamento sessioni:', error);
      toast.error('Errore nel caricare le sessioni WhatsApp');
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

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadSessions();
    loadContactLists();
  }, [loadSessions, loadContactLists]);

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
        const maxRetries = 8; // 8 tentativi in 12 secondi
        
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
                  toast.success('QR code pronto! Scansiona con WhatsApp per connettere.');
                  return true;
                }
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
              // Riprova dopo 1.5 secondi
              setTimeout(tryGetQrCode, 1500);
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
    if (!newCampaignData.name || !newCampaignData.whatsappSessionId || !newCampaignData.targetList || !newCampaignData.messageTemplate) {
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
          timing: {
            intervalBetweenMessages: 30,
            messagesPerHour: 60
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
          await apiClient.reconnectWhatsAppSession(sessionId);
          toast.success('Riconnessione avviata');
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
                  <DialogContent className="max-w-2xl">
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
                              {sessions.filter(s => s.status === 'connected').map(session => (
                                <SelectItem key={session.sessionId} value={session.sessionId}>
                                  {session.name} - {session.phoneNumber}
                                </SelectItem>
                              ))}
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

                      <div>
                        <label className="text-sm font-medium">Template Messaggio</label>
                        <Textarea
                          value={newCampaignData.messageTemplate}
                          onChange={(e) => setNewCampaignData(prev => ({ ...prev, messageTemplate: e.target.value }))}
                          placeholder="Ciao {nome}, sono {utente} di MenuChatCRM..."
                          rows={4}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => insertTemplateVariable('nome')}>
                            +nome
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => insertTemplateVariable('email')}>
                            +email
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => insertTemplateVariable('telefono')}>
                            +telefono
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <div>
                          <label className="text-sm font-medium">Messaggi per ora</label>
                          <Input
                            type="number"
                            min="1"
                            max="200"
                            value={newCampaignData.timing.messagesPerHour}
                            onChange={(e) => setNewCampaignData(prev => ({ 
                              ...prev, 
                              timing: { ...prev.timing, messagesPerHour: Number(e.target.value) }
                            }))}
                          />
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
                                <DropdownMenuItem onClick={() => {}}>
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