'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/ui/login-form';
import { WhatsappCampaign, CampaignStatus, CAMPAIGN_STATUSES } from '@/types/whatsapp';
import Link from 'next/link';

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
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isActioning, setIsActioning] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, [currentPage, statusFilter]);

  const loadCampaigns = async () => {
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
  };

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
        toast.success(`Campagna ${getActionLabel(action)} con successo`);
        loadCampaigns();
      } else {
        toast.error(response.message || `Errore ${getActionLabel(action)} campagna`);
      }
    } catch (error) {
      console.error(`Errore ${action} campagna:`, error);
      toast.error(`Errore ${getActionLabel(action)} campagna`);
    } finally {
      setIsActioning(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa campagna?')) {
      return;
    }

    setIsActioning(campaignId);
    try {
      const response = await apiClient.deleteWhatsAppCampaign(campaignId);
      if (response.success) {
        toast.success('Campagna eliminata con successo');
        loadCampaigns();
      } else {
        toast.error(response.message || 'Errore nell\'eliminazione della campagna');
      }
    } catch (error) {
      console.error('Errore eliminazione campagna:', error);
      toast.error('Errore nell\'eliminazione della campagna');
    } finally {
      setIsActioning(null);
    }
  };

  const getActionLabel = (action: string): string => {
    const labels = {
      start: 'avviata',
      pause: 'pausata',
      resume: 'ripresa',
      cancel: 'cancellata'
    };
    return labels[action as keyof typeof labels] || action;
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const config = {
      draft: { label: 'Bozza', variant: 'secondary' as const, icon: Edit },
      scheduled: { label: 'Programmata', variant: 'default' as const, icon: Clock },
      running: { label: 'In Esecuzione', variant: 'default' as const, icon: Play, className: 'bg-green-100 text-green-800' },
      paused: { label: 'Pausata', variant: 'secondary' as const, icon: Pause },
      completed: { label: 'Completata', variant: 'default' as const, icon: CheckCircle, className: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancellata', variant: 'destructive' as const, icon: XCircle }
    };

    const { label, variant, icon: Icon, className } = config[status];
    return (
      <Badge variant={variant} className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getActionButtons = (campaign: WhatsappCampaign) => {
    const actions = [];

    if (campaign.status === 'draft' || campaign.status === 'scheduled') {
      actions.push(
        <Button
          key="start"
          size="sm"
          onClick={() => handleCampaignAction(campaign._id, 'start')}
          disabled={isActioning === campaign._id}
          className="bg-green-600 hover:bg-green-700"
        >
          <Play className="h-4 w-4 mr-1" />
          Avvia
        </Button>
      );
    }

    if (campaign.status === 'running') {
      actions.push(
        <Button
          key="pause"
          size="sm"
          variant="outline"
          onClick={() => handleCampaignAction(campaign._id, 'pause')}
          disabled={isActioning === campaign._id}
        >
          <Pause className="h-4 w-4 mr-1" />
          Pausa
        </Button>
      );
    }

    if (campaign.status === 'paused') {
      actions.push(
        <Button
          key="resume"
          size="sm"
          onClick={() => handleCampaignAction(campaign._id, 'resume')}
          disabled={isActioning === campaign._id}
          className="bg-green-600 hover:bg-green-700"
        >
          <Play className="h-4 w-4 mr-1" />
          Riprendi
        </Button>
      );
    }

    if (['running', 'paused', 'scheduled'].includes(campaign.status)) {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() => handleCampaignAction(campaign._id, 'cancel')}
          disabled={isActioning === campaign._id}
        >
          <Square className="h-4 w-4 mr-1" />
          Cancella
        </Button>
      );
    }

    return actions;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar moderna */}
      <div className="transition-all duration-300">
        <ModernSidebar />
      </div>

      {/* Main content con padding-left per la sidebar */}
      <main className="pl-16 transition-all duration-300">
        <div className="container mx-auto py-4 px-6 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                  Campagne WhatsApp
                </h1>
                <p className="text-gray-600 mt-2">
                  Gestisci le tue campagne di messaggistica WhatsApp outbound
                </p>
              </div>
              <Link href="/whatsapp-campaigns/new">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Campagna
                </Button>
              </Link>
            </div>
          </div>

          {/* Filtri e ricerca */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Cerca campagne..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CampaignStatus | 'all')}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Stato" />
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
              </div>
            </CardContent>
          </Card>

          {/* Tabella campagne */}
          <Card>
            <CardHeader>
              <CardTitle>Le tue campagne</CardTitle>
              <CardDescription>
                {filteredCampaigns.length} campagne trovate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna campagna trovata
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {campaigns.length === 0 
                      ? "Inizia creando la tua prima campagna WhatsApp"
                      : "Prova a modificare i filtri di ricerca"
                    }
                  </p>
                  {campaigns.length === 0 && (
                    <Link href="/whatsapp-campaigns/new">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Prima Campagna
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Lista Target</TableHead>
                        <TableHead>Contatti</TableHead>
                        <TableHead>Inviati</TableHead>
                        <TableHead>Risposte</TableHead>
                        <TableHead>Sessione</TableHead>
                        <TableHead>Ultima Modifica</TableHead>
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
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {campaign.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(campaign.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {campaign.targetList}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{campaign.stats.totalContacts}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{campaign.stats.messagesSent}</div>
                              <div className="text-gray-500">
                                {campaign.stats.messagesDelivered} consegnati
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{campaign.stats.repliesReceived}</span>
                              {campaign.stats.repliesReceived > 0 && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-mono">{campaign.whatsappSessionId}</div>
                              <div className="text-gray-500">{campaign.whatsappNumber}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {new Date(campaign.updatedAt).toLocaleDateString('it-IT')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Azioni rapide */}
                              <div className="flex gap-1">
                                {getActionButtons(campaign)}
                              </div>
                              
                              {/* Menu azioni aggiuntive */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/whatsapp-campaigns/${campaign._id}`}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Visualizza
                                    </Link>
                                  </DropdownMenuItem>
                                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/whatsapp-campaigns/${campaign._id}/edit`}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Modifica
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  {campaign.status !== 'running' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteCampaign(campaign._id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Elimina
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Precedente
                </Button>
                <span className="text-sm text-gray-600">
                  Pagina {currentPage} di {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Successivo
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function WhatsAppCampaignsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mostra loading durante la verifica dell'autenticazione
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se non autenticato, mostra il form di login
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Se autenticato, mostra le campagne
  return <CampaignsContent />;
} 