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
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { 
  Eye, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  Edit, 
  Trash2,
  MoreHorizontal,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Contact } from "@/types/contact";
import { apiClient } from "@/lib/api";

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
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contactId: string) => void;
  onViewContact?: (contact: Contact) => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRefresh?: () => void;
  currentLimit?: number;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedContactIds?: string[];
};

// Funzione per estrarre tutte le proprietà dinamiche disponibili
function extractDynamicProperties(contacts: Contact[]): string[] {
  const propertySet = new Set<string>();
  
  contacts.forEach(contact => {
    if (contact.properties) {
      Object.keys(contact.properties).forEach(key => {
        // Filtriamo chiavi vuote, undefined, null e spazi
        if (key && typeof key === 'string' && key.trim()) {
          propertySet.add(key.trim());
        }
      });
    }
  });
  
  return Array.from(propertySet).sort();
}

function ContactsTable({ 
  contacts = [],
  isLoading = false,
  pagination,
  onEditContact,
  onDeleteContact, 
  onViewContact,
  onPageChange,
  onLimitChange,
  onRefresh,
  currentLimit = 10,
  onSelectionChange,
  selectedContactIds = []
}: ContactsTableProps) {
  // Stato per le proprietà dinamiche caricate dal server
  const [allDynamicProperties, setAllDynamicProperties] = useState<string[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  // Genera colonne dinamiche: usa quelle dal server se disponibili, altrimenti quelle locali come fallback
  const localDynamicProperties = useMemo(() => extractDynamicProperties(contacts), [contacts]);
  const dynamicProperties = useMemo(() => 
    allDynamicProperties.length > 0 ? allDynamicProperties : localDynamicProperties,
    [allDynamicProperties, localDynamicProperties]
  );
  const allColumns = useMemo(() => {
    return [...baseColumns, ...dynamicProperties.filter(prop => prop && prop.trim()).map(prop => `prop_${prop}`)];
  }, [dynamicProperties]);
  
  // Stato per le preferenze tabella
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...baseColumns]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  // Stato per la selezione multipla (sincronizzato con parent)
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set(selectedContactIds));
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Sincronizza selectedContacts con selectedContactIds dal parent
  useEffect(() => {
    setSelectedContacts(new Set(selectedContactIds));
  }, [selectedContactIds]);

  // Notifica il parent quando la selezione cambia (usando useCallback per evitare loop)
  useEffect(() => {
    const selectedArray = Array.from(selectedContacts);
    if (onSelectionChange) {
      onSelectionChange(selectedArray);
    }
  }, [selectedContacts]); // Rimosso onSelectionChange dalle dipendenze per evitare loop

  // Carica le preferenze tabella dell'utente all'avvio
  useEffect(() => {
    const loadTablePreferences = async () => {
      try {
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

  // Log per debug (solo quando cambia allDynamicProperties dal server)
  useEffect(() => {
    if (allDynamicProperties.length > 0) {
      console.log('🔍 Debug ContactsTable - proprietà dinamiche caricate dal server:', allDynamicProperties);
    }
  }, [allDynamicProperties]);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = !searchFilter || 
      contact.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (contact.email && contact.email.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (contact.phone && contact.phone.includes(searchFilter));
    
    const matchesList = !listFilter || 
      (contact.lists && contact.lists.some(list => list.toLowerCase().includes(listFilter.toLowerCase())));
    
    const matchesOwner = !ownerFilter ||
      (contact.owner && `${contact.owner.firstName} ${contact.owner.lastName}`.toLowerCase().includes(ownerFilter.toLowerCase()));

    return matchesSearch && matchesList && matchesOwner;
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

  const getOwnerInitials = (owner: Contact['owner']) => {
    if (!owner || !owner.firstName || !owner.lastName) return '??';
    return `${owner.firstName[0]}${owner.lastName[0]}`;
  };

  const getContactInitials = (name: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[1][0]}` : name[0];
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

  // Salva automaticamente il pageSize quando cambia (solo per currentLimit, non visibleColumns)
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
  }, [currentLimit, preferencesLoaded]); // Rimosso visibleColumns dalle dipendenze

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
    <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Cerca contatti..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-48"
          />
          <Input
            placeholder="Filtra per lista..."
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            className="w-48"
          />
          <Input
            placeholder="Filtra per owner..."
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="w-48"
          />
          
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
                    dynamicProperties
                      .filter(prop => prop && prop.trim())
                      .map((prop) => {
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

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {/* Checkbox per selezionare tutti */}
            <TableHead className="w-[50px]">
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
            {visibleColumns.includes("Contact") && <TableHead className="w-[200px]">Contatto</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="w-[250px]">Email</TableHead>}
            {visibleColumns.includes("Phone") && <TableHead className="w-[150px]">Telefono</TableHead>}
            {visibleColumns.includes("Owner") && <TableHead className="w-[150px]">Proprietario</TableHead>}
            {visibleColumns.includes("Lists") && <TableHead className="w-[150px]">Liste</TableHead>}
            {visibleColumns.includes("Created") && <TableHead className="w-[120px]">Creato</TableHead>}
            {/* Colonne dinamiche per proprietà */}
            {dynamicProperties
              .filter(prop => prop && prop.trim())
              .filter(prop => visibleColumns.includes(`prop_${prop}`))
              .map((prop) => {
                const colKey = `prop_${prop}`;
                return (
                  <TableHead key={colKey} className="w-[150px]">
                    {getColumnDisplayName(colKey)}
                  </TableHead>
                );
              })}
            {visibleColumns.includes("Actions") && <TableHead className="w-[100px]">Azioni</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredContacts.length ? (
            filteredContacts.map((contact) => (
              <TableRow key={contact._id} className={selectedContacts.has(contact._id) ? "bg-blue-50" : ""}>
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
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getContactInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        {contact.properties?.company && (
                          <div className="text-xs text-muted-foreground">
                            {contact.properties.company}
                          </div>
                        )}
                      </div>
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
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {contact.phone}
                        </a>
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
                          <div className="flex items-center gap-2 cursor-pointer">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-secondary text-xs">
                                {getOwnerInitials(contact.owner)}
                              </AvatarFallback>
                            </Avatar>
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
                {dynamicProperties
                  .filter(prop => prop && prop.trim())
                  .filter(prop => visibleColumns.includes(`prop_${prop}`))
                  .map((prop) => {
                    const colKey = `prop_${prop}`;
                    return (
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
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchFilter || listFilter || ownerFilter 
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
    </div>
  );
}

export default ContactsTable; 