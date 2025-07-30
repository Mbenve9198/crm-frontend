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
import { useState } from "react";
import { 
  Eye, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  Building, 
  Edit, 
  Trash2,
  MoreHorizontal 
} from "lucide-react";
import { Contact } from "@/types/contact";

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
  onEditContact,
  onDeleteContact, 
  onViewContact,
  onPageChange,
  onLimitChange,
  currentLimit = 10
}: ContactsTableProps) {
  // Genera colonne dinamiche dalle proprietà dei contatti
  const dynamicProperties = extractDynamicProperties(contacts);
  const allColumns = [...baseColumns, ...dynamicProperties.map(prop => `prop_${prop}`)];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...baseColumns]);
  const [searchFilter, setSearchFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

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

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
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
              {dynamicProperties.length > 0 && (
                <>
                  <div className="p-2 text-xs font-medium text-gray-500 border-b">Proprietà Dinamiche</div>
                  {dynamicProperties.map((prop) => {
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
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {visibleColumns.includes("Contact") && <TableHead className="w-[200px]">Contatto</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="w-[250px]">Email</TableHead>}
            {visibleColumns.includes("Phone") && <TableHead className="w-[150px]">Telefono</TableHead>}
            {visibleColumns.includes("Owner") && <TableHead className="w-[150px]">Proprietario</TableHead>}
            {visibleColumns.includes("Lists") && <TableHead className="w-[150px]">Liste</TableHead>}
            {visibleColumns.includes("Created") && <TableHead className="w-[120px]">Creato</TableHead>}
            {/* Colonne dinamiche per proprietà */}
            {dynamicProperties.map((prop) => {
              const colKey = `prop_${prop}`;
              return visibleColumns.includes(colKey) && (
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
              <TableRow key={contact._id}>
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
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center py-8">
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
    </div>
  );
}

export default ContactsTable; 