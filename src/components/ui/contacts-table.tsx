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

// Dati mock per il development - verranno sostituiti con chiamate API
const mockContacts: Contact[] = [
  {
    _id: "1",
    name: "Mario Rossi",
    email: "mario.rossi@email.com",
    phone: "+39 123 456 7890",
    lists: ["clienti", "newsletter"],
    properties: {
      company: "Acme Corp",
      notes: "Cliente VIP",
      lastContact: "2024-01-15"
    },
    owner: {
      _id: "owner1",
      firstName: "Marco",
      lastName: "Benvenuti",
      email: "marco@menuchat.com",
      role: "admin"
    },
    createdBy: {
      _id: "creator1",
      firstName: "Federico",
      lastName: "MenuChat",
      email: "federico@menuchat.com"
    },
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-15T15:30:00Z"
  },
  {
    _id: "2", 
    name: "Anna Verdi",
    email: "anna.verdi@company.com",
    phone: "+39 987 654 3210",
    lists: ["prospects", "webinar"],
    properties: {
      company: "Tech Solutions",
      source: "Website",
      interest: "Premium Plan"
    },
    owner: {
      _id: "owner2",
      firstName: "Federico",
      lastName: "MenuChat", 
      email: "federico@menuchat.com",
      role: "manager"
    },
    createdBy: {
      _id: "creator1",
      firstName: "Marco",
      lastName: "Benvenuti",
      email: "marco@menuchat.com"
    },
    createdAt: "2024-01-12T14:20:00Z",
    updatedAt: "2024-01-18T09:15:00Z"
  },
  {
    _id: "3",
    name: "Luca Bianchi", 
    email: "luca.bianchi@startup.io",
    lists: ["clienti", "tech"],
    properties: {
      company: "Innovation Startup",
      role: "CTO",
      budget: "€50,000"
    },
    owner: {
      _id: "owner1",
      firstName: "Marco", 
      lastName: "Benvenuti",
      email: "marco@menuchat.com",
      role: "admin"
    },
    createdBy: {
      _id: "creator2", 
      firstName: "Federico",
      lastName: "MenuChat",
      email: "federico@menuchat.com"
    },
    createdAt: "2024-01-08T16:45:00Z",
    updatedAt: "2024-01-20T11:00:00Z"
  },
  {
    _id: "4",
    name: "Giulia Neri",
    email: "giulia.neri@marketing.com", 
    phone: "+39 555 123 4567",
    lists: ["newsletter", "marketing"],
    properties: {
      company: "Marketing Pro",
      department: "Digital Marketing",
      meetingScheduled: "2024-02-01"
    },
    owner: {
      _id: "owner2",
      firstName: "Federico",
      lastName: "MenuChat",
      email: "federico@menuchat.com", 
      role: "manager"
    },
    createdBy: {
      _id: "creator1",
      firstName: "Marco",
      lastName: "Benvenuti", 
      email: "marco@menuchat.com"
    },
    createdAt: "2024-01-14T08:30:00Z",
    updatedAt: "2024-01-22T14:45:00Z"
  },
  {
    _id: "5",
    name: "Roberto Ferrari",
    email: "roberto.ferrari@finance.com",
    phone: "+39 333 987 6543", 
    lists: ["clienti", "finance"],
    properties: {
      company: "Finance Group",
      position: "CFO",
      dealValue: "€100,000",
      priority: "High"
    },
    owner: {
      _id: "owner1",
      firstName: "Marco",
      lastName: "Benvenuti",
      email: "marco@menuchat.com",
      role: "admin"
    },
    createdBy: {
      _id: "creator1", 
      firstName: "Marco",
      lastName: "Benvenuti",
      email: "marco@menuchat.com"
    },
    createdAt: "2024-01-05T12:15:00Z",
    updatedAt: "2024-01-25T10:30:00Z"
  }
];

const allColumns = [
  "Contact",
  "Email", 
  "Phone",
  "Owner",
  "Lists",
  "Company",
  "Created",
  "Actions"
] as const;

type ContactsTableProps = {
  contacts?: Contact[];
  isLoading?: boolean;
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contactId: string) => void;
  onViewContact?: (contact: Contact) => void;
};

function ContactsTable({ 
  contacts = mockContacts,
  isLoading = false,
  onEditContact,
  onDeleteContact, 
  onViewContact
}: ContactsTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...allColumns]);
  const [searchFilter, setSearchFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = !searchFilter || 
      contact.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchFilter));
    
    const matchesList = !listFilter || 
      contact.lists.some(list => list.toLowerCase().includes(listFilter.toLowerCase()));
    
    const matchesOwner = !ownerFilter ||
      `${contact.owner.firstName} ${contact.owner.lastName}`.toLowerCase().includes(ownerFilter.toLowerCase());

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
    return `${owner.firstName[0]}${owner.lastName[0]}`;
  };

  const getContactInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[1][0]}` : name[0];
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
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Colonne
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {allColumns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={visibleColumns.includes(col)}
                onCheckedChange={() => toggleColumn(col)}
              >
                {col}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {visibleColumns.includes("Contact") && <TableHead className="w-[200px]">Contatto</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="w-[250px]">Email</TableHead>}
            {visibleColumns.includes("Phone") && <TableHead className="w-[150px]">Telefono</TableHead>}
            {visibleColumns.includes("Owner") && <TableHead className="w-[150px]">Proprietario</TableHead>}
            {visibleColumns.includes("Lists") && <TableHead className="w-[150px]">Liste</TableHead>}
            {visibleColumns.includes("Company") && <TableHead className="w-[150px]">Azienda</TableHead>}
            {visibleColumns.includes("Created") && <TableHead className="w-[120px]">Creato</TableHead>}
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
                        {contact.properties.company && (
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
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {contact.email}
                      </a>
                    </div>
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
                {visibleColumns.includes("Company") && (
                  <TableCell>
                    {contact.properties.company ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.properties.company}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
    </div>
  );
}

export default ContactsTable; 