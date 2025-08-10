"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { User } from "@/types/contact";

interface UserSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  includeAllOption?: boolean;
  disabled?: boolean;
}

export function UserSelect({
  value,
  onValueChange,
  placeholder = "Seleziona utente...",
  className,
  includeAllOption = false,
  disabled = false
}: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getUsersForAssignment();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.message || 'Errore nel caricamento degli utenti');
      }
    } catch (error) {
      console.error('❌ Errore caricamento utenti select:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-2 px-3 border rounded-md ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Caricamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-2 px-3 border rounded-md bg-red-50 border-red-200 ${className}`}>
        <span className="text-sm text-red-600">Errore caricamento utenti</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && (
          <SelectItem value="">
            <span className="font-medium">Tutti gli utenti</span>
          </SelectItem>
        )}
        {users.map((user) => (
          <SelectItem key={user._id} value={user._id}>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-gray-500">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
                {user.currentContactsCount !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {user.currentContactsCount}
                  </Badge>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 