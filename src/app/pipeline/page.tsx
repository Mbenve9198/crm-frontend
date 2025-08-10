"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/ui/login-form";
import { ModernSidebar } from "@/components/ui/modern-sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Contact, User, ContactStatus } from "@/types/contact";
import { apiClient } from "@/lib/api";
import { getPipelineStatuses, getStatusLabel, getStatusColor, formatMRR } from "@/lib/status-utils";
import { Users, Euro, TrendingUp } from "lucide-react";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Caricamento pipeline...</p>
      </div>
    </div>
  );
}

function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedOwner]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carica contatti
      const contactsResponse = await apiClient.getContacts({
        page: 1,
        limit: 1000,
        owner: selectedOwner !== "all" ? selectedOwner : undefined
      });

      if (contactsResponse.success) {
        const pipelineContacts = contactsResponse.data.contacts.filter(contact => 
          getPipelineStatuses().includes(contact.status)
        );
        setContacts(pipelineContacts);
      }

      // Carica utenti
      if (users.length === 0) {
        const usersResponse = await apiClient.getUsersForAssignment();
        if (usersResponse.success && usersResponse.data && usersResponse.data.users) {
          setUsers(usersResponse.data.users);
        }
      }
    } catch (error) {
      console.error('Errore caricamento pipeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const contactsByStatus = getPipelineStatuses().reduce((acc, status) => {
    acc[status] = contacts.filter(contact => contact.status === status);
    return acc;
  }, {} as Record<ContactStatus, Contact[]>);

  const getColumnStats = (status: ContactStatus) => {
    const statusContacts = contactsByStatus[status] || [];
    const totalMRR = statusContacts.reduce((sum, contact) => sum + (contact.mrr || 0), 0);
    return { count: statusContacts.length, totalMRR };
  };

  const totalStats = getPipelineStatuses().reduce((acc, status) => {
    const stats = getColumnStats(status);
    acc.count += stats.count;
    acc.totalMRR += stats.totalMRR;
    return acc;
  }, { count: 0, totalMRR: 0 });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar 
        onImportComplete={() => {}}
        onListSelect={() => {}}
        selectedList={null}
      />

      <main className="pl-16">
        <div className="container mx-auto py-8 px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Pipeline Vendite</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-medium">Proprietario:</label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Opportunità</p>
                      <p className="text-2xl font-bold">{totalStats.count}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">MRR Totale</p>
                      <p className="text-2xl font-bold text-green-600">{formatMRR(totalStats.totalMRR)}</p>
                    </div>
                    <Euro className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">MRR Medio</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {totalStats.count > 0 ? formatMRR(totalStats.totalMRR / totalStats.count) : '€0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {getPipelineStatuses().map((status) => {
              const statusContacts = contactsByStatus[status] || [];
              const stats = getColumnStats(status);
              
              return (
                <div key={status}>
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                    <h3 className="font-semibold">{getStatusLabel(status)}</h3>
                    <p className="text-sm">{stats.count} • {formatMRR(stats.totalMRR)}</p>
                  </div>

                  <div className="bg-gray-100 min-h-[400px] p-3 space-y-3 rounded-b-lg">
                    {statusContacts.map((contact) => (
                      <Card key={contact._id} className="bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm">{contact.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{contact.email}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-green-600">
                              {formatMRR(contact.mrr)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {contact.owner.firstName}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Pipeline() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginForm />;
  return <PipelinePage />;
} 