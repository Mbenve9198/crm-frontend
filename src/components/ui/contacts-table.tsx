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
  Upload,
  UserCheck
} from "lucide-react";
import { Contact, User } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { ListManagementDialog } from "./list-management-dialog";
import { PhoneActionDialog } from "./phone-action-dialog";
import { CsvImportDialog } from "./csv-import";
import { CallDialog } from "./call-dialog";
import { BulkChangeOwnerDialog } from "./bulk-change-owner-dialog";
import { getStatusColor, getStatusLabel } from "@/lib/status-utils";
import { ColumnFilterComponent } from "./column-filter";
import { useTableFilters } from "@/hooks/useTableFilters";

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
  const [, setIsLoadingPreferences] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  // Stati per ricerca
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || "");
  
  // Stato per gli utenti disponibili per il filtro owner
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // 📋 NUOVO: Stato per tutte le liste disponibili (caricato da API separata)
  const [allAvailableLists, setAllAvailableLists] = useState<string[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // Carica tutte le liste disponibili (una sola volta)
  useEffect(() => {
    const loadAllLists = async () => {
      try {
        setIsLoadingLists(true);
        const response = await apiClient.getContactLists();
        
        if (response.success && response.data) {
          const listNames = response.data.map((list: { name: string; count: number }) => list.name);
          setAllAvailableLists(listNames);
          console.log('✅ Liste caricate:', listNames.length);
        }
      } catch (error) {
        console.error('❌ Errore caricamento liste:', error);
      } finally {
        setIsLoadingLists(false);
      }
    };

    loadAllLists();
  }, []);

  // Hook per gestire filtri e ordinamento locali
  const {
    filteredContacts: localFilteredContacts,
    columnValues,
    columnFilters,
    sorting,
    activeFiltersCount,
    hasActiveSort,
    handleFilterChange,
    handleSortChange,
    clearAllFilters,
  } = useTableFilters({ 
    contacts: contacts, 
    dynamicProperties 
  });

  // Stato per la selezione multipla
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [showChangeOwnerDialog, setShowChangeOwnerDialog] = useState(false);
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

  // Filtraggio combinato: owner filter + filtri locali
  const allFilteredContacts = localFilteredContacts.filter((contact) => {
    const matchesOwner = !ownerFilter || ownerFilter === "all" || (contact.owner && contact.owner._id === ownerFilter);
    return matchesOwner;
  });

  // Paginazione lato client sui dati filtrati
  const startIndex = ((pagination?.currentPage || 1) - 1) * currentLimit;
  const endIndex = startIndex + currentLimit;
  // 🚀 NUOVO: Decidi se usare paginazione client (con filtri) o server (senza filtri)
  const hasActiveFilters = activeFiltersCount > 0 || hasActiveSort || (ownerFilter && ownerFilter !== "all");
  
  let filteredContacts;
  let calculatedPagination;
  
  if (hasActiveFilters) {
    // CON FILTRI: Paginazione client-side sui contatti caricati
    filteredContacts = allFilteredContacts.slice(startIndex, endIndex);
    calculatedPagination = {
      currentPage: pagination?.currentPage || 1,
      totalPages: Math.ceil(allFilteredContacts.length / currentLimit),
      totalContacts: allFilteredContacts.length,
      hasNext: endIndex < allFilteredContacts.length,
      hasPrev: (pagination?.currentPage || 1) > 1
    };
  } else {
    // SENZA FILTRI: Usa paginazione dal backend
    filteredContacts = allFilteredContacts; // Nessun slice, già paginati dal server
    calculatedPagination = pagination || {
      currentPage: 1,
      totalPages: 1,
      totalContacts: contacts.length,
      hasNext: false,
      hasPrev: false
    };
  }

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
    // Seleziona TUTTI i contatti filtrati, non solo quelli della pagina corrente
    const allContactIds = allFilteredContacts.map(contact => contact._id);
    setSelectedContacts(new Set(allContactIds));
  };

  const selectPageContacts = () => {
    // Seleziona solo i contatti della pagina corrente
    const pageContactIds = filteredContacts.map(contact => contact._id);
    setSelectedContacts(prev => {
      const newSelection = new Set(prev);
      pageContactIds.forEach(id => newSelection.add(id));
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  // Controlla se tutti i contatti filtrati sono selezionati
  const isAllFilteredSelected = allFilteredContacts.length > 0 && allFilteredContacts.every(contact => selectedContacts.has(contact._id));
  // Controlla se tutti i contatti della pagina corrente sono selezionati
  const isCurrentPageSelected = filteredContacts.length > 0 && filteredContacts.every(contact => selectedContacts.has(contact._id));
  const isSomeSelected = selectedContacts.size > 0;
  
  // Conta quanti contatti sono selezionati nella pagina corrente
  const selectedInCurrentPage = filteredContacts.filter(contact => selectedContacts.has(contact._id)).length;

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

  // Gestione completamento cambio owner
  const handleChangeOwnerComplete = () => {
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
          {/* Controlli filtri attivi */}
          {(activeFiltersCount > 0 || hasActiveSort) && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                {activeFiltersCount > 0 && `${activeFiltersCount} filtri`}
                {activeFiltersCount > 0 && hasActiveSort && ' • '}
                {hasActiveSort && 'ordinamento attivo'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="h-6 px-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3 mr-1" />
                Rimuovi
              </Button>
            </div>
          )}

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
      <div className="relative max-h-[75vh] overflow-y-auto overflow-x-auto border rounded-lg bg-white">
        <Table className="w-full relative">
        <TableHeader>
          <TableRow>
            {/* Checkbox per selezionare tutti */}
            <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[50px] border-b-2 border-gray-300 backdrop-blur-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
              <input
                type="checkbox"
                      checked={isCurrentPageSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedInCurrentPage > 0 && !isCurrentPageSelected;
                        }
                      }}
                onChange={(e) => {
                  if (e.target.checked) {
                          selectPageContacts();
                  } else {
                    clearSelection();
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isCurrentPageSelected 
                        ? "Deseleziona tutti i contatti" 
                        : selectedInCurrentPage > 0 
                          ? "Seleziona tutti i contatti in questa pagina"
                          : "Seleziona tutti i contatti in questa pagina"
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            {visibleColumns.includes("Contact") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[200px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Contatto</span>
                  <ColumnFilterComponent
                    column="Contact"
                    columnDisplayName="Contatto"
                    values={columnValues['Contact'] || []}
                    filter={columnFilters['Contact']}
                    onFilterChange={(filter) => handleFilterChange('Contact', filter)}
                    sortDirection={sorting?.column === 'Contact' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Contact', direction)}
                  />
                </div>
              </TableHead>
            )}
            {visibleColumns.includes("Email") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[250px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Email</span>
                  <ColumnFilterComponent
                    column="Email"
                    columnDisplayName="Email"
                    values={columnValues['Email'] || []}
                    filter={columnFilters['Email']}
                    onFilterChange={(filter) => handleFilterChange('Email', filter)}
                    sortDirection={sorting?.column === 'Email' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Email', direction)}
                  />
                </div>
              </TableHead>
            )}
            {visibleColumns.includes("Phone") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Telefono</span>
                  <ColumnFilterComponent
                    column="Phone"
                    columnDisplayName="Telefono"
                    values={columnValues['Phone'] || []}
                    filter={columnFilters['Phone']}
                    onFilterChange={(filter) => handleFilterChange('Phone', filter)}
                    sortDirection={sorting?.column === 'Phone' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Phone', direction)}
                  />
                </div>
              </TableHead>
            )}
            {visibleColumns.includes("Owner") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Proprietario</span>
                  <ColumnFilterComponent
                    column="Owner"
                    columnDisplayName="Proprietario"
                    values={columnValues['Owner'] || []}
                    filter={columnFilters['Owner']}
                    onFilterChange={(filter) => handleFilterChange('Owner', filter)}
                    sortDirection={sorting?.column === 'Owner' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Owner', direction)}
                  />
                </div>
              </TableHead>
            )}
            {visibleColumns.includes("Lists") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Liste</span>
                  <ColumnFilterComponent
                    column="Lists"
                    columnDisplayName="Liste"
                    values={allAvailableLists.length > 0 ? allAvailableLists : (columnValues['Lists'] || [])} 
                    filter={columnFilters['Lists']}
                    onFilterChange={(filter) => handleFilterChange('Lists', filter)}
                    sortDirection={sorting?.column === 'Lists' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Lists', direction)}
                  />
                </div>
              </TableHead>
            )}
            {visibleColumns.includes("Created") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[120px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                <div className="flex items-center justify-between">
                  <span>Creato</span>
                  <ColumnFilterComponent
                    column="Created"
                    columnDisplayName="Creato"
                    values={columnValues['Created'] || []}
                    filter={columnFilters['Created']}
                    onFilterChange={(filter) => handleFilterChange('Created', filter)}
                    sortDirection={sorting?.column === 'Created' ? sorting.direction : null}
                    onSortChange={(direction) => handleSortChange('Created', direction)}
                  />
                </div>
              </TableHead>
            )}
            {/* Colonne dinamiche per proprietà */}
            {dynamicProperties.map((prop) => {
              const colKey = `prop_${prop}`;
              return visibleColumns.includes(colKey) && (
                <TableHead key={colKey} className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[150px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                  <div className="flex items-center justify-between">
                    <span>{getColumnDisplayName(colKey)}</span>
                    <ColumnFilterComponent
                      column={colKey}
                      columnDisplayName={getColumnDisplayName(colKey)}
                      values={columnValues[colKey] || []}
                      filter={columnFilters[colKey]}
                      onFilterChange={(filter) => handleFilterChange(colKey, filter)}
                      sortDirection={sorting?.column === colKey ? sorting.direction : null}
                      onSortChange={(direction) => handleSortChange(colKey, direction)}
                    />
                  </div>
                </TableHead>
              );
            })}
            {visibleColumns.includes("Actions") && (
              <TableHead className="sticky top-0 bg-gray-100 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3),0_4px_16px_-4px_rgba(0,0,0,0.2),0_2px_8px_-2px_rgba(0,0,0,0.15)] z-20 w-[100px] border-b-2 border-gray-300 backdrop-blur-sm font-semibold">
                Azioni
              </TableHead>
            )}
            
            {/* Colonna Status sempre visibile e fissa a destra */}
            <TableHead className="sticky top-0 right-0 bg-gray-100 border-l-2 border-gray-400 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_4px_16px_-4px_rgba(0,0,0,0.3),0_2px_8px_-2px_rgba(0,0,0,0.2),-8px_0_16px_-8px_rgba(0,0,0,0.15)] w-[140px] z-30 border-b-2 border-gray-300 backdrop-blur-sm">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-gray-800">Status</span>
                <ColumnFilterComponent
                  column="Status"
                  columnDisplayName="Status"
                  values={columnValues['Status'] || []}
                  filter={columnFilters['Status']}
                  onFilterChange={(filter) => handleFilterChange('Status', filter)}
                  sortDirection={sorting?.column === 'Status' ? sorting.direction : null}
                  onSortChange={(direction) => handleSortChange('Status', direction)}
                />
              </div>
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
                          {contact.phone && (
                            <CallDialog 
                              contact={contact}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start w-full"
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Chiama
                                </Button>
                              }
                            />
                          )}
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
                    {searchQuery || (ownerFilter && ownerFilter !== "all") || activeFiltersCount > 0
                      ? "Nessun contatto trovato con i filtri applicati"
                      : "Nessun contatto presente"
                    }
                  </p>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-2"
                    >
                      Rimuovi tutti i filtri
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {/* Banner informativo per filtri con grandi dataset */}
      {hasActiveFilters && pagination && pagination.totalContacts > currentLimit && (
        <div className="px-2 py-2 bg-amber-50 border border-amber-200 rounded-lg mx-2 mb-2">
          <p className="text-xs text-amber-800">
            ⚠️ I filtri funzionano solo sui contatti caricati in questa pagina ({contacts.length}/{pagination.totalContacts} totali).
            Usa la <strong>ricerca</strong> per cercare in tutto il database.
          </p>
        </div>
      )}

      {/* Controlli di paginazione */}
      {calculatedPagination && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Pagina {calculatedPagination.currentPage} di {calculatedPagination.totalPages} 
            ({calculatedPagination.totalContacts} contatti{activeFiltersCount > 0 || hasActiveSort ? ' filtrati' : ' totali'})
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(calculatedPagination.currentPage - 1)}
              disabled={!calculatedPagination.hasPrev}
            >
              ← Precedente
            </Button>
            
            {/* Numeri di pagina */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, calculatedPagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, calculatedPagination.currentPage - 2) + i;
                if (pageNum > calculatedPagination.totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === calculatedPagination.currentPage ? "default" : "outline"}
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
              onClick={() => onPageChange?.(calculatedPagination.currentPage + 1)}
              disabled={!calculatedPagination.hasNext}
            >
              Successiva →
            </Button>
          </div>
        </div>
      )}

      {/* Banner selezione tutti i risultati */}
      {isSomeSelected && !isAllFilteredSelected && selectedInCurrentPage === filteredContacts.length && calculatedPagination.totalPages > 1 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3">
            <span className="text-sm text-blue-700">
              {selectedContacts.size} contatti selezionati in questa pagina.
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={selectAllContacts}
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
            >
              Seleziona tutti i {calculatedPagination.totalContacts} contatti filtrati
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
                {isAllFilteredSelected && calculatedPagination.totalContacts > filteredContacts.length && (
                  <span className="text-blue-600"> (tutti i risultati filtrati)</span>
                )}
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
                variant="outline"
                size="sm"
                onClick={() => setShowChangeOwnerDialog(true)}
                disabled={isBulkDeleting}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Cambia Proprietario
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

      {/* Dialog cambio proprietario */}
      <BulkChangeOwnerDialog
        open={showChangeOwnerDialog}
        onOpenChange={setShowChangeOwnerDialog}
        selectedContacts={selectedContacts}
        onComplete={handleChangeOwnerComplete}
      />

      {/* Dialog per azioni telefono */}
      {selectedContactForPhone && (
        <PhoneActionDialog
          open={showPhoneDialog}
          onOpenChange={setShowPhoneDialog}
          contact={selectedContactForPhone}
          onAction={handlePhoneAction}
        />
      )}
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