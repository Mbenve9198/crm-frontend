"use client";

import { useState } from "react";
import { User, LogOut, Upload, Users, Settings, Home, Menu, X } from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/context/AuthContext";
import { CsvImportDialog } from "./csv-import";

interface ModernSidebarProps {
  onImportComplete?: () => void;
}

export function ModernSidebar({ onImportComplete }: ModernSidebarProps) {
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    {
      icon: Home,
      label: "Dashboard",
      active: true,
    },
    {
      icon: Users,
      label: "Contatti",
      active: false,
    },
    {
      icon: Settings,
      label: "Impostazioni",
      active: false,
    },
  ];

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
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <li key={index}>
                  <button
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      item.active
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 ${item.active ? "text-blue-700" : "text-gray-500"}`} />
                    {isExpanded && (
                      <span className="ml-3 text-sm font-medium transition-opacity duration-200">
                        {item.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            
            {/* Import CSV item */}
            <li>
              <CsvImportDialog onImportComplete={onImportComplete}>
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