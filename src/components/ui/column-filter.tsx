"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ColumnFilter, FilterCondition, SortDirection } from "@/types/contact";

type ColumnFilterComponentProps = {
  column: string;
  columnDisplayName: string;
  values: (string | number | boolean)[];
  filter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter | null) => void;
  // Props per l'ordinamento
  sortDirection?: SortDirection | null;
  onSortChange: (direction: SortDirection | null) => void;
};

const filterConditions: { value: FilterCondition; label: string; type: 'text' | 'number' | 'select' }[] = [
  { value: 'equals', label: 'È uguale a', type: 'text' },
  { value: 'not_equals', label: 'Non è uguale a', type: 'text' },
  { value: 'contains', label: 'Contiene', type: 'text' },
  { value: 'not_contains', label: 'Non contiene', type: 'text' },
  { value: 'starts_with', label: 'Inizia con', type: 'text' },
  { value: 'is_empty', label: 'È vuoto', type: 'text' },
  { value: 'is_not_empty', label: 'Non è vuoto', type: 'text' },
];

export function ColumnFilterComponent({
  columnDisplayName,
  values,
  filter,
  onFilterChange,
  sortDirection,
  onSortChange,
}: ColumnFilterComponentProps) {
  const [activeTab, setActiveTab] = useState<'values' | 'condition'>('values');
  const [selectedValues, setSelectedValues] = useState<string[]>(
    filter?.type === 'value' ? filter.values || [] : []
  );
  const [conditionType, setConditionType] = useState<FilterCondition>(
    filter?.type === 'condition' ? filter.condition?.type || 'equals' : 'equals'
  );
  const [conditionValue, setConditionValue] = useState<string>(
    filter?.type === 'condition' ? String(filter.condition?.value || '') : ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Valori unici dalla colonna (convertiti a stringa per il confronto)
  const uniqueValues = Array.from(
    new Set(
      values
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(v => String(v))
    )
  ).sort();

  // Valori filtrati in base alla ricerca
  const filteredValues = uniqueValues.filter(value =>
    value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasActiveFilter = !!filter;
  const hasActiveSort = !!sortDirection;

  // Aggiorna lo stato locale quando cambia il filtro esterno
  useEffect(() => {
    if (filter?.type === 'value') {
      setSelectedValues(filter.values || []);
      setActiveTab('values');
    } else if (filter?.type === 'condition') {
      setConditionType(filter.condition?.type || 'equals');
      setConditionValue(String(filter.condition?.value || ''));
      setActiveTab('condition');
    } else {
      setSelectedValues([]);
      setConditionValue('');
    }
  }, [filter]);

  const handleValueToggle = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    setSelectedValues(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedValues(filteredValues);
  };

  const handleClearAll = () => {
    setSelectedValues([]);
  };

  const applyValueFilter = () => {
    if (selectedValues.length === 0) {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: 'value',
        values: selectedValues
      });
    }
  };

  const applyConditionFilter = () => {
    if (!conditionValue && !['is_empty', 'is_not_empty'].includes(conditionType)) {
      onFilterChange(null);
      return;
    }

    onFilterChange({
      type: 'condition',
      condition: {
        type: conditionType,
        value: conditionValue
      }
    });
  };

  const clearFilter = () => {
    setSelectedValues([]);
    setConditionValue('');
    setSearchQuery('');
    onFilterChange(null);
  };

  const handleSortClick = (direction: SortDirection) => {
    if (sortDirection === direction) {
      // Se già ordinato in quella direzione, rimuovi l'ordinamento
      onSortChange(null);
    } else {
      onSortChange(direction);
    }
  };

  const getSortIcon = () => {
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 px-1 flex items-center gap-1 ${
            hasActiveFilter || hasActiveSort
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {hasActiveFilter && <Filter className="h-3 w-3" />}
          {getSortIcon()}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm mb-2">{columnDisplayName}</h4>
          
          {/* Controlli ordinamento */}
          <div className="flex gap-1 mb-3">
            <Button
              variant={sortDirection === 'asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('asc')}
              className="flex-1"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              A → Z
            </Button>
            <Button
              variant={sortDirection === 'desc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortClick('desc')}
              className="flex-1"
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Z → A
            </Button>
          </div>

          {/* Tabs per tipo di filtro */}
          <div className="flex rounded-md bg-gray-100 p-1">
            <button
              className={`flex-1 text-xs py-1 px-2 rounded ${
                activeTab === 'values' 
                  ? 'bg-white shadow-sm font-medium' 
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('values')}
            >
              Filtra per valore
            </button>
            <button
              className={`flex-1 text-xs py-1 px-2 rounded ${
                activeTab === 'condition' 
                  ? 'bg-white shadow-sm font-medium' 
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('condition')}
            >
              Filtra per condizione
            </button>
          </div>
        </div>

        <div className="p-3">
          {activeTab === 'values' ? (
            <>
              {/* Filtro per valore */}
              <Input
                placeholder="Cerca valori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-3 h-8"
              />
              
              <div className="flex gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="flex-1">
                  Seleziona tutto
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll} className="flex-1">
                  Deseleziona tutto
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredValues.map((value) => (
                  <label
                    key={value}
                    className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedValues.includes(value)}
                      onCheckedChange={() => handleValueToggle(value)}
                    />
                    <span className="text-sm flex-1 truncate">{value}</span>
                  </label>
                ))}
                {filteredValues.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Nessun valore trovato
                  </p>
                )}
              </div>

              <DropdownMenuSeparator className="my-3" />
              
              <div className="flex gap-2">
                <Button onClick={applyValueFilter} size="sm" className="flex-1">
                  Applica
                </Button>
                <Button variant="outline" onClick={clearFilter} size="sm">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Filtro per condizione */}
              <Select value={conditionType} onValueChange={(value: FilterCondition) => setConditionType(value)}>
                <SelectTrigger className="mb-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterConditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!['is_empty', 'is_not_empty'].includes(conditionType) && (
                <Input
                  placeholder="Inserisci valore..."
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="mb-3"
                  type={['greater_than', 'less_than', 'greater_equal', 'less_equal'].includes(conditionType) ? 'number' : 'text'}
                />
              )}

              <DropdownMenuSeparator className="my-3" />
              
              <div className="flex gap-2">
                <Button onClick={applyConditionFilter} size="sm" className="flex-1">
                  Applica
                </Button>
                <Button variant="outline" onClick={clearFilter} size="sm">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Badge filtri attivi */}
        {hasActiveFilter && (
          <div className="p-3 border-t bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Filtro attivo:</span>
              <Badge variant="secondary" className="text-xs">
                {filter?.type === 'value' 
                  ? `${filter.values?.length} valori`
                  : `${filterConditions.find(c => c.value === filter?.condition?.type)?.label}`
                }
              </Badge>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 