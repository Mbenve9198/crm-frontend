"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  List,
  Plus,
  Hash,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ContactList } from "@/types/contact";

interface CrmSidebarProps {
  onListSelect?: (listName: string) => void;
  selectedList?: string;
}

export function CrmSidebar({ onListSelect, selectedList }: CrmSidebarProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(true); // Default aperta
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // Carica le liste disponibili
  useEffect(() => {
    const loadLists = async () => {
      try {
        setIsLoadingLists(true);
        console.log('🔍 Caricamento liste contatti...');
        
        const response = await apiClient.getContactLists();
        
        if (response.success && response.data) {
          console.log('✅ Liste caricate:', response.data);
          setLists(response.data);
        }
      } catch (error) {
        console.error('❌ Errore nel caricamento liste:', error);
        // In caso di errore, mantieni array vuoto
        setLists([]);
      } finally {
        setIsLoadingLists(false);
      }
    };

    loadLists();
  }, []);

  // Collegamenti principali della sidebar
  const mainLinks = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Tutti i Contatti",
      href: "#",
      icon: <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
  ];

  // Collegamenti settings (rimuoviamo logout per ora)
  const bottomLinks = [
    {
      label: "Impostazioni",
      href: "/settings",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          {open ? <Logo /> : <LogoIcon />}
          
          {/* Collegamenti principali */}
          <div className="mt-8 flex flex-col gap-2">
            {mainLinks.map((link, idx) => (
              <SidebarLink 
                key={idx} 
                link={link} 
                className={cn(
                  idx === 1 && selectedList === '' && "bg-neutral-200 dark:bg-neutral-700 rounded-md"
                )}
                onClick={idx === 1 ? () => onListSelect?.('') : undefined}
              />
            ))}
          </div>

          {/* Sezione Liste */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
              >
                Liste Contatti
              </motion.span>
              {open && (
                <button 
                  className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                  title="Crea nuova lista"
                >
                  <Plus className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                </button>
              )}
            </div>
            
            {/* Lista delle liste con loading */}
            <div className="flex flex-col gap-1">
              {isLoadingLists ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  <motion.span
                    animate={{
                      display: open ? "inline-block" : "none",
                      opacity: open ? 1 : 0,
                    }}
                    className="text-sm text-neutral-500"
                  >
                    Caricamento...
                  </motion.span>
                </div>
              ) : lists.length > 0 ? (
                lists
                  .filter(list => list && list.name && list.name.trim())
                  .map((list, idx) => (
                    <SidebarLink 
                      key={`list-${idx}`} 
                      link={{
                        label: `${list.name} (${list.count || 0})`,
                        href: "#",
                        icon: <Hash className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
                      }}
                      className={cn(
                        "pl-6", // Indentazione per le liste
                        selectedList === list.name && "bg-neutral-200 dark:bg-neutral-700 rounded-md"
                      )}
                      onClick={() => onListSelect?.(list.name)}
                    />
                  ))
              ) : (
                <motion.div
                  animate={{
                    display: open ? "flex" : "none",
                    opacity: open ? 1 : 0,
                  }}
                  className="items-center gap-2 py-2 text-sm text-neutral-500"
                >
                  <List className="h-4 w-4" />
                  Nessuna lista
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Profilo utente */}
        <div>
          <SidebarLink
            link={{
              label: user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || "Utente",
              href: "#",
              icon: (
                <div className="h-7 w-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                </div>
              ),
            }}
          />
          
          {/* Collegamenti bottom */}
          {bottomLinks.map((link, idx) => (
            <SidebarLink 
              key={`bottom-${idx}`} 
              link={link}
            />
          ))}
          
          {/* Logout separato */}
          <SidebarLink 
            link={{
              label: "Esci",
              href: "#",
              icon: <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            }}
            onClick={logout}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  );
}

export const Logo = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <div className="h-5 w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        MenuChat CRM
      </motion.span>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <div className="h-5 w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </div>
  );
}; 