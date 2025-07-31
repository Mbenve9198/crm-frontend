"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Plus, 
  X, 
  List,
  Loader2,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";
import { ContactList } from "@/types/contact";

interface BulkActionsBannerProps {
  selectedContactIds: string[];
  onClear: () => void;
  onActionComplete?: () => void;
  availableLists?: ContactList[];
}

export function BulkActionsBanner({ 
  selectedContactIds, 
  onClear, 
  onActionComplete,
  availableLists = []
}: BulkActionsBannerProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showListSelection, setShowListSelection] = useState(false);

  const selectedCount = selectedContactIds.length;

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    if (!confirm(`Sei sicuro di voler eliminare ${selectedCount} contatti?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await apiClient.deleteContactsBulk(selectedContactIds);
      console.log(`✅ ${selectedCount} contatti eliminati`);
      onActionComplete?.();
      onClear();
    } catch (error) {
      console.error('❌ Errore nell\'eliminazione bulk:', error);
      alert('Errore nell\'eliminazione dei contatti');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToList = async (listName: string) => {
    try {
      setIsAddingToList(true);
      await apiClient.addContactsToList(selectedContactIds, listName);
      console.log(`✅ ${selectedCount} contatti aggiunti alla lista "${listName}"`);
      onActionComplete?.();
      onClear();
      setShowListSelection(false);
    } catch (error) {
      console.error('❌ Errore nell\'aggiunta alla lista:', error);
      alert('Errore nell\'aggiunta dei contatti alla lista');
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) {
      alert('Inserisci un nome per la lista');
      return;
    }

    try {
      setIsAddingToList(true);
      // Prima crea la lista (implicitamente aggiungendoci i contatti)
      await apiClient.addContactsToList(selectedContactIds, newListName);
      console.log(`✅ Lista "${newListName}" creata con ${selectedCount} contatti`);
      onActionComplete?.();
      onClear();
      setShowCreateList(false);
      setNewListName('');
    } catch (error) {
      console.error('❌ Errore nella creazione della lista:', error);
      alert('Errore nella creazione della lista');
    } finally {
      setIsAddingToList(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-6 py-4 shadow-lg"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {selectedCount} contatti selezionati
            </span>
            
            {/* Azioni principali */}
            <div className="flex items-center gap-2">
              {/* Elimina */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting || isAddingToList}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Elimina
              </Button>

              {/* Aggiungi a lista */}
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowListSelection(!showListSelection)}
                  disabled={isDeleting || isAddingToList}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isAddingToList ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Aggiungi a Lista
                </Button>

                {/* Dropdown liste */}
                {showListSelection && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-full mt-2 bg-white text-gray-900 rounded-lg shadow-lg border min-w-[200px] z-10"
                  >
                    <div className="p-2">
                      {/* Crea nuova lista */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateList(true)}
                        className="w-full justify-start text-left"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Nuova Lista
                      </Button>

                      {/* Separator */}
                      {availableLists.length > 0 && (
                        <div className="border-t my-2" />
                      )}

                      {/* Liste esistenti */}
                      {availableLists.map((list) => (
                        <Button
                          key={list.name}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToList(list.name)}
                          className="w-full justify-start text-left"
                        >
                          <Hash className="h-4 w-4 mr-2" />
                          {list.name} ({list.count})
                        </Button>
                      ))}

                      {availableLists.length === 0 && (
                        <p className="text-sm text-gray-500 p-2">
                          Nessuna lista disponibile
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Chiudi */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal crea nuova lista */}
        {showCreateList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowCreateList(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Crea Nuova Lista
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Lista
                  </label>
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Es: Clienti VIP, Prospect 2024..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateNewList();
                      }
                      if (e.key === 'Escape') {
                        setShowCreateList(false);
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateList(false)}
                    disabled={isAddingToList}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleCreateNewList}
                    disabled={!newListName.trim() || isAddingToList}
                  >
                    {isAddingToList ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <List className="h-4 w-4 mr-2" />
                    )}
                    Crea e Aggiungi
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 