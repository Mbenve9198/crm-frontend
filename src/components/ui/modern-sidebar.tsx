"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Upload, Users, Settings, Menu, List, ChevronDown, ChevronRight, BarChart3, MessageCircle } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/context/AuthContext";
import { CsvImportDialog } from "./csv-import";
import { apiClient } from "@/lib/api";

interface ModernSidebarProps {
  onImportComplete?: () => void;
  onListSelect?: (listName: string | null) => void;
  selectedList?: string | null;
}

type ContactList = {
  name: string;
  count: number;
};

export function ModernSidebar({ onImportComplete, onListSelect, selectedList }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [showLists, setShowLists] = useState(true);

  const menuItems = [
    {
      icon: Users,
      label: "Tutti i Contatti",
      active: pathname === "/" && selectedList === null,
      href: "/",
      onClick: () => onListSelect?.(null),
    },
    {
      icon: BarChart3,
      label: "Pipeline",
      active: pathname === "/pipeline",
      href: "/pipeline",
    },
    {
      icon: MessageCircle,
      label: "Campagne WhatsApp",
      active: pathname === "/whatsapp-campaigns" || pathname.startsWith("/whatsapp-campaigns/"),
      href: "/whatsapp-campaigns",
    },
    {
      icon: Settings,
      label: "Impostazioni",
      active: pathname === "/settings",
      href: "/settings",
    },
  ];

  // Carica le liste quando la sidebar si espande o all'inizio
  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setIsLoadingLists(true);
      const response = await apiClient.getContactLists();
      
      if (response.success && response.data) {
        setLists(response.data);
      }
    } catch (error) {
      console.error('❌ Errore caricamento liste sidebar:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  // Ricarica le liste quando viene completata un'operazione
  useEffect(() => {
    if (onImportComplete) {
      loadLists();
    }
  }, [onImportComplete]);

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-lg border-r transition-all duration-300 ease-in-out z-50 ${
          isExpanded ? "w-64" : "w-16"
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Menu className="h-4 w-4 text-white" />
            </div>
            {isExpanded && (
              <div className="ml-3 transition-opacity duration-200">
                <h1 className="text-lg font-bold text-gray-900">MenuChatCRM</h1>
                <p className="text-xs text-gray-500">Gestione Contatti</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              const content = (
                <>
                  <IconComponent className={`h-5 w-5 ${item.active ? "text-blue-700" : "text-gray-500"}`} />
                  {isExpanded && (
                    <span className="ml-3 text-sm font-medium transition-opacity duration-200">
                      {item.label}
                    </span>
                  )}
                </>
              );
              
              const className = `w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                item.active
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`;

              return (
                <li key={index}>
                  {item.href ? (
                    <Link 
                      href={item.href} 
                      className={className}
                      onClick={item.onClick}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button onClick={item.onClick} className={className}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
            
            {/* Import CSV item */}
            <li>
              <CsvImportDialog onImportComplete={() => { onImportComplete?.(); loadLists(); }}>
                <button
                  className="w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Upload className="h-5 w-5 text-gray-500" />
                  {isExpanded && (
                    <span className="ml-3 text-sm font-medium transition-opacity duration-200">
                      Importa CSV
                    </span>
                  )}
                </button>
              </CsvImportDialog>
            </li>

            {/* Sezione Liste */}
            {isExpanded && (
              <>
                <li className="pt-4">
                  <div className="px-3 pb-2">
                    <div className="border-t border-gray-200"></div>
                  </div>
                </li>
                
                <li>
                  <button
                    onClick={() => setShowLists(!showLists)}
                    className="w-full flex items-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Liste
                    {showLists ? (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronRight className="h-3 w-3 ml-auto" />
                    )}
                  </button>
                </li>

                {showLists && (
                  <>
                    {isLoadingLists ? (
                      <li className="px-6 py-2 text-xs text-gray-500">
                        Caricamento liste...
                      </li>
                    ) : lists.length > 0 ? (
                      lists.map((list) => (
                        <li key={list.name}>
                          <button
                            onClick={() => onListSelect?.(list.name)}
                            className={`w-full flex items-center justify-between px-6 py-2 text-sm rounded-lg transition-all duration-200 ${
                              selectedList === list.name
                                ? "bg-blue-50 text-blue-700 border-l-2 border-blue-500"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <span className="truncate">{list.name}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              selectedList === list.name
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {list.count}
                            </span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-6 py-2 text-xs text-gray-500">
                        Nessuna lista disponibile
                      </li>
                    )}
                  </>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t p-3">
          {/* User Info */}
          <div className={`mb-3 p-3 rounded-lg bg-gray-50 ${!isExpanded && "text-center"}`}>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              {isExpanded && (
                <div className="ml-3 transition-opacity duration-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-200 ${
              !isExpanded && "px-2"
            }`}
          >
            <LogOut className="h-4 w-4" />
            {isExpanded && <span className="text-sm">Esci</span>}
          </Button>
        </div>
      </div>

      {/* Overlay per mobile quando espansa */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
} 