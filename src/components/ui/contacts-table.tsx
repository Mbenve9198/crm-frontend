"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { 
  Eye, 
  Mail, 
  Phone, 
  User as UserIcon, 
  Calendar, 
  Edit, 
  Trash2,
  MoreHorizontal,
  Check,
  X,
  Loader2,
  Tag,
  Upload
} from "lucide-react";
import { Contact, User } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { ListManagementDialog } from "./list-management-dialog";
import { PhoneActionDialog } from "./phone-action-dialog";
import { CsvImportDialog } from "./csv-import";
import { getStatusColor, getStatusLabel } from "@/lib/status-utils";

// Colonne fisse base
const baseColumns = [
  "Contact",
  "Email", 
  "Phone",
  "Owner",
  "Lists",
  "Created",
  "Actions"
] as const;

type ContactsTableProps = {
  contacts?: Contact[];
  isLoading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalContacts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchQuery?: string;
  onSearchSubmit?: (query: string) => void;
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contactId: string) => void;
  onViewContact?: (contact: Contact) => void;
  onContactClick?: (contact: Contact) => void;
  onPhoneClick?: (contact: Contact, action: 'call' | 'whatsapp') => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRefresh?: () => void;
  onImportComplete?: () => void;
  currentLimit?: number;
};

// Funzione per estrarre tutte le proprietà dinamiche disponibili
function extractDynamicProperties(contacts: Contact[]): string[] {
  const propertySet = new Set<string>();
  
  contacts.forEach(contact => {
    if (contact.properties) {
      Object.keys(contact.properties).forEach(key => {
        propertySet.add(key);
      });
    }
  });
  
  return Array.from(propertySet).sort();
}

function ContactsTable({ 
  contacts = [],
  isLoading = false,
  pagination,
  searchQuery = "",
  onSearchSubmit,
  onEditContact,
  onDeleteContact, 
  onViewContact,
  onContactClick,
  onPhoneClick,
  onPageChange,
  onLimitChange,
  onRefresh,
  onImportComplete,
  currentLimit = 10
}: ContactsTableProps) {
  // Stato per le proprietà dinamiche caricate dal server
  const [allDynamicProperties, setAllDynamicProperties] = useState<string[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  // Genera colonne dinamiche: usa quelle dal server se disponibili, altrimenti quelle locali come fallback
  const localDynamicProperties = extractDynamicProperties(contacts);
  const dynamicProperties = allDynamicProperties.length > 0 ? allDynamicProperties : localDynamicProperties;
  const allColumns = useMemo(() => [...baseColumns, ...dynamicProperties.map(prop => `prop_${prop}`)], [dynamicProperties]);
  
  // Stato per le preferenze tabella
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...baseColumns]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  // Stati per ricerca
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || "");
  
  // Stato per gli utenti disponibili per il filtro owner
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Stato per la selezione multipla
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [selectedContactForPhone, setSelectedContactForPhone] = useState<Contact | null>(null);

  // Carica le preferenze tabella dell'utente all'avvio
  useEffect(() => {
    const loadTablePreferences = async () => {
      try {
        setIsLoadingPreferences(true);
        console.log('🔍 Caricamento preferenze tabella utente...');
        
        const response = await apiClient.getTablePreferences();
        
        if (response.success && response.data?.tablePreferences?.contacts) {
          const { visibleColumns: savedColumns } = response.data.tablePreferences.contacts;
          
          if (savedColumns && Array.isArray(savedColumns) && savedColumns.length > 0) {
            setVisibleColumns(savedColumns);
            console.log('✅ Preferenze tabella caricate:', savedColumns);
          }
        }
        
        setPreferencesLoaded(true);
      } catch (error) {
        console.error('❌ Errore nel caricamento preferenze tabella:', error);
        // In caso di errore, usa i valori di default
        setPreferencesLoaded(true);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadTablePreferences();
  }, []); // Carica solo una volta al montaggio

  // Carica le proprietà dinamiche dal server all'avvio
  useEffect(() => {
    const loadDynamicProperties = async () => {
      try {
        setIsLoadingProperties(true);
        console.log('🔍 Caricamento proprietà dinamiche dal server...');
        
        const response = await apiClient.getDynamicProperties();
        if (response.success && response.data) {
          console.log('✅ Proprietà dinamiche caricate:', response.data.properties);
          setAllDynamicProperties(response.data.properties);
        } else {
          console.warn('⚠️ Fallback alle proprietà locali');
        }
      } catch (error) {
        console.error('❌ Errore caricamento proprietà dinamiche:', error);
        console.warn('⚠️ Usando proprietà locali come fallback');
      } finally {
        setIsLoadingProperties(false);
      }
    };

    loadDynamicProperties();
  }, []);

  // Carica gli utenti disponibili per il filtro owner
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        console.log('👥 Caricamento utenti per filtro owner...');
        
        const response = await apiClient.getUsersForAssignment();
        if (response.success && response.data?.users) {
          console.log('✅ Utenti caricati:', response.data.users.length);
          setAvailableUsers(response.data.users);
        }
      } catch (error) {
        console.error('❌ Errore caricamento utenti:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // Log per debug
  useEffect(() => {
    console.log('🔍 Debug ContactsTable:');
    console.log('  - allDynamicProperties (server):', allDynamicProperties);
    console.log('  - localDynamicProperties (local):', localDynamicProperties);
    console.log('  - dynamicProperties (used):', dynamicProperties);
    console.log('  - allColumns:', allColumns);
  }, [allDynamicProperties, localDynamicProperties, dynamicProperties, allColumns]);

  // Reset stato ricerca quando arrivano nuovi contatti dal server
  useEffect(() => {
    if (!isLoading && isSearching) {
      setIsSearching(false);
    }
  }, [contacts, isLoading, isSearching]);

  // Filtraggio solo owner (search gestito completamente dal server)
  const filteredContacts = contacts.filter((contact) => {
    const matchesOwner = !ownerFilter || ownerFilter === "all" || (contact.owner && contact.owner._id === ownerFilter);
    return matchesOwner;
  });

  const toggleColumn = async (col: string) => {
    const newVisibleColumns = visibleColumns.includes(col)
      ? visibleColumns.filter((c) => c !== col)
      : [...visibleColumns, col];
    
    // Aggiorna lo stato locale immediatamente
    setVisibleColumns(newVisibleColumns);
    
    // Salva le preferenze solo se sono già state caricate
    if (preferencesLoaded) {
      try {
        await apiClient.updateTablePreferences({
          contacts: {
            visibleColumns: newVisibleColumns,
            pageSize: currentLimit
          }
        });
        console.log('✅ Preferenze colonne salvate:', newVisibleColumns);
      } catch (error) {
        console.error('❌ Errore nel salvataggio preferenze colonne:', error);
        // Non interrompiamo l'UX per errori di salvataggio
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };



  // Funzione per ottenere il valore di una proprietà dinamica
  const getPropertyValue = (contact: Contact, propertyName: string): string => {
    if (!contact.properties || !contact.properties[propertyName]) return '-';
    const value = contact.properties[propertyName];
    return typeof value === 'string' ? value : String(value);
  };

  // Funzione per il nome visualizzato della colonna
  const getColumnDisplayName = (columnKey: string): string => {
    if (columnKey.startsWith('prop_')) {
      const propName = columnKey.replace('prop_', '');
      return propName.charAt(0).toUpperCase() + propName.slice(1);
    }
    return columnKey;
  };

  // Salva automaticamente il pageSize quando cambia
  useEffect(() => {
    if (preferencesLoaded && currentLimit !== 10) { // Solo se diverso dal default
      const savePageSize = async () => {
        try {
          await apiClient.updateTablePreferences({
            contacts: {
              visibleColumns,
              pageSize: currentLimit
            }
          });
          console.log('✅ Preferenze pageSize salvate:', currentLimit);
        } catch (error) {
          console.error('❌ Errore nel salvataggio preferenze pageSize:', error);
        }
      };

      savePageSize();
    }
  }, [currentLimit, preferencesLoaded, visibleColumns]);

  // Funzioni per la selezione multipla
  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(contactId)) {
        newSelection.delete(contactId);
      } else {
        newSelection.add(contactId);
      }
      return newSelection;
    });
  };

  const selectAllContacts = () => {
    const allContactIds = filteredContacts.map(contact => contact._id);
    setSelectedContacts(new Set(allContactIds));
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  const isAllSelected = filteredContacts.length > 0 && filteredContacts.every(contact => selectedContacts.has(contact._id));
  const isSomeSelected = selectedContacts.size > 0;

  // Gestione eliminazione bulk
  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;

    const confirmMessage = `Sei sicuro di voler eliminare ${selectedContacts.size} contatti selezionati? Questa azione non può essere annullata.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsBulkDeleting(true);
      const contactIds = Array.from(selectedContacts);
      
      console.log('🗑️ Eliminazione bulk di', contactIds.length, 'contatti');
      const response = await apiClient.deleteContactsBulk(contactIds);
      
      if (response.success && response.data) {
        const { deletedCount, unauthorizedCount, unauthorizedContacts } = response.data;
        
        // Messaggio di successo
        let message = `✅ Eliminati ${deletedCount} contatti con successo.`;
        if (unauthorizedCount > 0) {
          message += `\n⚠️ Non hai i permessi per eliminare ${unauthorizedCount} contatti.`;
          if (unauthorizedContacts.length > 0) {
            message += `\nContatti non autorizzati: ${unauthorizedContacts.join(', ')}`;
          }
        }
        
        alert(message);
        
        // Pulisce la selezione e ricarica i dati
        clearSelection();
        // Trigger refresh della tabella
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(response.message || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('❌ Errore eliminazione bulk:', error);
      alert(`❌ Errore durante l'eliminazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Gestione completamento dialog liste
  const handleListManagementComplete = () => {
    // Pulisce la selezione e ricarica i dati
    clearSelection();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Gestione click su numero telefono
  const handlePhoneClick = (contact: Contact, e: React.MouseEvent) => {
    e.preventDefault(); // Previeni l'azione di default del link
    setSelectedContactForPhone(contact);
    setShowPhoneDialog(true);
  };

  const handlePhoneAction = (action: 'call' | 'whatsapp') => {
    if (selectedContactForPhone && onPhoneClick) {
      onPhoneClick(selectedContactForPhone, action);
    }
  };

  if (isLoading) {
    return (
      <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Caricamento contatti...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Input
              placeholder="Cerca contatti (premi Enter)..."
              value={inputValue}
              onChange={(e) => {
                // Solo aggiorna il valore input, NO filtro
                setInputValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsSearching(true);
                  onSearchSubmit?.(inputValue);
                }
              }}
              className="w-60"
            />
            {/* Indicatori di stato */}
            {isSearching ? (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            ) : inputValue.length > 0 ? (
              <div className="absolute right-3 top-3 text-gray-400">
                <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Enter</kbd>
              </div>
            ) : null}
          </div>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtra per proprietario..." />
            </SelectTrigger>
            <SelectContent className="w-64">
              <SelectItem value="all">Tutti i proprietari</SelectItem>
              {isLoadingUsers ? (
                <SelectItem value="loading" disabled>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    <span>Caricamento...</span>
                  </div>
                </SelectItem>
              ) : Array.isArray(availableUsers) && availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span className="truncate flex-1">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({user.role})
                      </span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  Nessun utente disponibile
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          {/* Selettore items per pagina */}
          <select
            value={currentLimit}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={10}>10 per pagina</option>
            <option value={25}>25 per pagina</option>
            <option value={50}>50 per pagina</option>
            <option value={100}>100 per pagina</option>
          </select>
        </div>

        <div className="flex gap-2">
          {/* Pulsante Importa CSV */}
          <CsvImportDialog onImportComplete={onImportComplete}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importa CSV
            </Button>
          </CsvImportDialog>
          
          {/* Pulsante Colonne */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Colonne ({visibleColumns.length}/{allColumns.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 max-h-80 overflow-y-auto">
              <div className="p-2 text-xs font-medium text-gray-500 border-b">Colonne Base</div>
              {baseColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
              {(dynamicProperties.length > 0 || isLoadingProperties) && (
                <>
                  <div className="p-2 text-xs font-medium text-gray-500 border-b">
                    Proprietà Dinamiche
                    {isLoadingProperties && " (caricamento...)"}
                    {!isLoadingProperties && allDynamicProperties.length > 0 && ` (${allDynamicProperties.length} dal server)`}
                  </div>
                  {isLoadingProperties ? (
                    <div className="p-2 text-xs text-gray-400">Caricamento proprietà...</div>
                  ) : (
                    dynamicProperties.map((prop) => {
                      const colKey = `prop_${prop}`;
                      return (
                        <DropdownMenuCheckboxItem
                          key={colKey}
                          checked={visibleColumns.includes(colKey)}
                          onCheckedChange={() => toggleColumn(colKey)}
                        >
                          {getColumnDisplayName(colKey)}
                        </DropdownMenuCheckboxItem>
                      );
                    })
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Container con scroll per la tabella */}
      <div className="relative max-h-[70vh] overflow-y-auto overflow-x-auto border rounded-lg bg-white">
        <Table className="w-full">
        <TableHeader>
          <TableRow>
            {/* Checkbox per selezionare tutti */}
            <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[50px] border-b-2 border-gray-200 backdrop-blur-sm">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectAllContacts();
                  } else {
                    clearSelection();
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </TableHead>
            {visibleColumns.includes("Contact") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[200px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Contatto</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[250px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Email</TableHead>}
            {visibleColumns.includes("Phone") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Telefono</TableHead>}
            {visibleColumns.includes("Owner") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Proprietario</TableHead>}
            {visibleColumns.includes("Lists") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Liste</TableHead>}
            {visibleColumns.includes("Created") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[120px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Creato</TableHead>}
            {/* Colonne dinamiche per proprietà */}
            {dynamicProperties.map((prop) => {
              const colKey = `prop_${prop}`;
              return visibleColumns.includes(colKey) && (
                <TableHead key={colKey} className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">
                  {getColumnDisplayName(colKey)}
                </TableHead>
              );
            })}
            {visibleColumns.includes("Actions") && <TableHead className="sticky top-0 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[100px] border-b-2 border-gray-200 backdrop-blur-sm font-semibold">Azioni</TableHead>}
            
            {/* Colonna Status sempre visibile e fissa a destra */}
            <TableHead className="sticky top-0 right-0 bg-white border-l-2 border-gray-300 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_4px_16px_-4px_rgba(0,0,0,0.3),0_2px_8px_-2px_rgba(0,0,0,0.2),-8px_0_16px_-8px_rgba(0,0,0,0.15)] w-[140px] z-30 border-b-2 border-gray-200 backdrop-blur-sm">
              <div className="font-bold text-gray-900 px-1">Status</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredContacts.length ? (
            filteredContacts.map((contact, index) => (
              <TableRow 
                key={contact._id} 
                className={`${
                  selectedContacts.has(contact._id) 
                    ? "bg-blue-100 hover:bg-blue-150" 
                    : index % 2 === 0 
                      ? "bg-white hover:bg-gray-50" 
                      : "bg-gray-50 hover:bg-gray-100"
                } transition-all duration-200 ${isSearching ? 'opacity-80' : 'opacity-100'}`}
                style={{ 
                  animationDelay: `${index * 20}ms`,
                  animation: !isSearching ? 'fadeInUp 0.3s ease-out forwards' : 'none'
                }}
              >
                {/* Checkbox per selezione singola */}
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact._id)}
                    onChange={() => toggleContactSelection(contact._id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableCell>
                {visibleColumns.includes("Contact") && (
                  <TableCell className="font-medium w-[200px]">
                    <div className="min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="font-medium truncate cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => onContactClick?.(contact)}
                              >
                                {contact.name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs break-words">{contact.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {contact.properties?.company && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate cursor-help">
                                  {contact.properties.company}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs break-words">{contact.properties.company}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("Email") && (
                  <TableCell>
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.includes("Phone") && (
                  <TableCell>
                    {contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <button
                          onClick={(e) => handlePhoneClick(contact, e)}
                          className="text-blue-600 hover:text-blue-800 underline hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                        >
                          {contact.phone}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.includes("Owner") && (
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-pointer">
                            <span className="text-sm">
                              {contact.owner.firstName} {contact.owner.lastName}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-semibold">{contact.owner.firstName} {contact.owner.lastName}</p>
                            <p className="text-xs text-muted-foreground">{contact.owner.email}</p>
                            <p className="text-xs">Ruolo: {contact.owner.role}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                )}
                {visibleColumns.includes("Lists") && (
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.lists.slice(0, 2).map((list, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {list}
                        </Badge>
                      ))}
                      {contact.lists.length > 2 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs cursor-pointer">
                                +{contact.lists.length - 2}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="font-medium">Tutte le liste:</p>
                                {contact.lists.map((list, idx) => (
                                  <p key={idx} className="text-xs">{list}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("Created") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(contact.createdAt)}</span>
                    </div>
                  </TableCell>
                )}
                {/* Celle per proprietà dinamiche */}
                {dynamicProperties.map((prop) => {
                  const colKey = `prop_${prop}`;
                  return visibleColumns.includes(colKey) && (
                    <TableCell key={colKey}>
                      <span className="text-sm">{getPropertyValue(contact, prop)}</span>
                    </TableCell>
                  );
                })}
                {visibleColumns.includes("Actions") && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => onViewContact?.(contact)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizza
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => onEditContact?.(contact)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => onDeleteContact?.(contact._id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
                          </Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
                
                {/* Colonna Status sempre visibile e fissa a destra */}
                <TableCell className="sticky right-0 bg-white border-l-2 border-gray-200 shadow-[0_0_20px_-5px_rgba(0,0,0,0.2),0_8px_16px_-8px_rgba(0,0,0,0.15),0_4px_8px_-4px_rgba(0,0,0,0.1)] min-w-[140px] z-10">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(contact.status)}`} />
                    <span className="text-sm font-medium text-gray-800">{getStatusLabel(contact.status)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="bg-white hover:bg-gray-50">
              <TableCell colSpan={visibleColumns.length + 2} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || (ownerFilter && ownerFilter !== "all")
                      ? "Nessun contatto trovato con i filtri applicati"
                      : "Nessun contatto presente"
                    }
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {/* Controlli di paginazione */}
      {pagination && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.currentPage} di {pagination.totalPages} 
            ({pagination.totalContacts} contatti totali)
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              ← Precedente
            </Button>
            
            {/* Numeri di pagina */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Successiva →
            </Button>
          </div>
        </div>
      )}

      {/* Banner azioni bulk */}
      {isSomeSelected && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-6 py-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-blue-600" />
              <span className="font-medium">
                {selectedContacts.size} contatto{selectedContacts.size !== 1 ? 'i' : ''} selezionato{selectedContacts.size !== 1 ? 'i' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={isBulkDeleting}
              >
                <X className="h-4 w-4 mr-1" />
                Deseleziona
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowListDialog(true)}
                disabled={isBulkDeleting}
              >
                <Tag className="h-4 w-4 mr-1" />
                Gestisci Liste
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Elimina {selectedContacts.size}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog gestione liste */}
      <ListManagementDialog
        open={showListDialog}
        onOpenChange={setShowListDialog}
        selectedContacts={selectedContacts}
        onComplete={handleListManagementComplete}
      />

      {/* Dialog per azioni telefono */}
      <PhoneActionDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        phoneNumber={selectedContactForPhone?.phone || ''}
        contactName={selectedContactForPhone?.name || ''}
        onAction={handlePhoneAction}
      />
    </div>
  );
}

export default ContactsTable;

// CSS per le animazioni smooth
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
} 