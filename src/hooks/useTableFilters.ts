import { useState, useMemo, useCallback } from 'react';
import { Contact, ColumnFilter, SortDirection, SortingState } from '@/types/contact';

type UseTableFiltersProps = {
  contacts: Contact[];
  dynamicProperties: string[];
};

export function useTableFilters({ contacts, dynamicProperties }: UseTableFiltersProps) {
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [sorting, setSorting] = useState<SortingState | null>(null);

  // Ottiene il valore di una colonna per un contatto
  const getContactValue = useCallback((contact: Contact, column: string): string => {
    switch (column) {
      case 'Contact':
        return contact.name;
      case 'Email':
        return contact.email || '';
      case 'Phone':
        return contact.phone || '';
      case 'Owner':
        return `${contact.owner.firstName} ${contact.owner.lastName}`;
      case 'Lists':
        return contact.lists.join(', ');
      case 'Created':
        return new Date(contact.createdAt).toLocaleDateString('it-IT');
      case 'Status':
        return contact.status;
      default:
        // Proprietà dinamica
        if (column.startsWith('prop_')) {
          const propName = column.replace('prop_', '');
          return String(contact.properties?.[propName] || '');
        }
        return '';
    }
  }, []);

  // Applica un filtro a un valore - CONDIZIONI SEMPLIFICATE
  const applyFilter = useCallback((value: string, filter: ColumnFilter): boolean => {
    if (filter.type === 'value') {
      return filter.values?.includes(value) ?? true;
    }
    
    if (filter.type === 'condition' && filter.condition) {
      const { type, value: filterValue } = filter.condition;
      
      switch (type) {
        case 'equals':
          return value === filterValue;
        case 'not_equals':
          return value !== filterValue;
        case 'contains':
          return value.toLowerCase().includes(String(filterValue).toLowerCase());
        case 'not_contains':
          return !value.toLowerCase().includes(String(filterValue).toLowerCase());
        case 'starts_with':
          return value.toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'is_empty':
          return value === '' || value === null || value === undefined;
        case 'is_not_empty':
          return value !== '' && value !== null && value !== undefined;
        default:
          return true;
      }
    }
    
    return true;
  }, []);

  // Confronta due valori per l'ordinamento
  const compareValues = useCallback((a: string, b: string): number => {
    // Prova a parsare come numeri
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    
    // Prova a parsare come date
    const dateA = new Date(a);
    const dateB = new Date(b);
    
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Confronto come stringhe
    return a.localeCompare(b, 'it-IT', { sensitivity: 'base' });
  }, []);

  // Estrae i valori per ogni colonna
  const columnValues = useMemo(() => {
    const values: Record<string, (string | number | boolean)[]> = {};
    
    // Colonne base
    values['Contact'] = contacts.map(c => c.name);
    values['Email'] = contacts.map(c => c.email || '');
    values['Phone'] = contacts.map(c => c.phone || '');
    values['Owner'] = contacts.map(c => `${c.owner.firstName} ${c.owner.lastName}`);
    values['Lists'] = contacts.flatMap(c => c.lists);
    values['Created'] = contacts.map(c => new Date(c.createdAt).toLocaleDateString('it-IT'));
    values['Status'] = contacts.map(c => c.status);

    // Proprietà dinamiche
    dynamicProperties.forEach(prop => {
      const colKey = `prop_${prop}`;
      values[colKey] = contacts.map(c => c.properties?.[prop] || '');
    });

    return values;
  }, [contacts, dynamicProperties]);

  // Applica filtri ai contatti
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      return Object.entries(columnFilters).every(([column, filter]) => {
        const value = getContactValue(contact, column);
        return applyFilter(value, filter);
      });
    });
  }, [contacts, columnFilters, getContactValue, applyFilter]);

  // Applica ordinamento ai contatti filtrati
  const sortedAndFilteredContacts = useMemo(() => {
    if (!sorting) return filteredContacts;

    return [...filteredContacts].sort((a, b) => {
      const aValue = getContactValue(a, sorting.column);
      const bValue = getContactValue(b, sorting.column);
      
      const result = compareValues(aValue, bValue);
      return sorting.direction === 'desc' ? -result : result;
    });
  }, [filteredContacts, sorting, getContactValue, compareValues]);

  // Gestori per aggiornare filtri e ordinamento
  const handleFilterChange = useCallback((column: string, filter: ColumnFilter | null) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (filter) {
        newFilters[column] = filter;
      } else {
        delete newFilters[column];
      }
      return newFilters;
    });
  }, []);

  const handleSortChange = useCallback((column: string, direction: SortDirection | null) => {
    if (direction) {
      setSorting({ column, direction });
    } else {
      setSorting(null);
    }
  }, []);

  // Contatori per i filtri attivi
  const activeFiltersCount = Object.keys(columnFilters).length;
  const hasActiveSort = !!sorting;

  // Resetta tutti i filtri
  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setSorting(null);
  }, []);

  return {
    // Dati
    filteredContacts: sortedAndFilteredContacts,
    columnValues,
    columnFilters,
    sorting,
    
    // Contatori
    activeFiltersCount,
    hasActiveSort,
    
    // Gestori
    handleFilterChange,
    handleSortChange,
    clearAllFilters,
    
    // Utilities
    getContactValue,
  };
} 