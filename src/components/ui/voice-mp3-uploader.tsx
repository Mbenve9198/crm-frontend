'use client';

import React, { useState, useRef } from 'react';
import { Upload, Trash2, Loader2, Music } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface VoiceMp3UploaderProps {
  existingAudio?: {
    type?: 'voice' | 'image' | 'video' | 'document' | 'audio';
    filename: string;
    url: string;
    voiceFileId?: string;
    size?: number;
    duration?: number;
    caption?: string;
  } | null;
  onAudioRemoved?: () => void;
  disabled?: boolean;
  onAudioReady?: (audioData: {
    voiceFileId: string;
    filename: string;
    size: number;
    duration?: number;
    publicUrl: string;
  }) => void;
}

export function VoiceMp3Uploader({
  existingAudio,
  onAudioRemoved,
  disabled = false,
  onAudioReady
}: VoiceMp3UploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida che sia MP3
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3' && !file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('❌ Solo file MP3 sono supportati per note vocali WhatsApp');
      return;
    }

    // Valida dimensione (16 MB max per WhatsApp)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 16 MB per WhatsApp');
      return;
    }

    try {
      setIsUploading(true);
      
      // Converti in DataURL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      // Calcola durata
      let duration: number | undefined;
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      
      await new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          if (audio.duration && isFinite(audio.duration)) {
            duration = Math.round(audio.duration);
          }
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
      });
      
      // Upload su VoiceFile collezione
      const response = await apiClient.uploadVoiceFile(dataUrl, file.name, file.size, duration);
      
      if (response.success && response.data) {
        toast.success(`🎤 Vocale MP3 caricato! (${(file.size / 1024).toFixed(0)} KB)`);
        
        // Notifica parent
        onAudioReady?.({
          voiceFileId: response.data.voiceFileId,
          filename: response.data.filename,
          size: response.data.size,
          duration: response.data.duration,
          publicUrl: response.data.publicUrl
        });
      }
    } catch (error) {
      console.error('Errore upload MP3:', error);
      toast.error('Errore durante il caricamento del vocale');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Se c'è un audio esistente, mostralo
  if (existingAudio) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">{existingAudio.filename}</p>
              <p className="text-xs text-green-600">
                {existingAudio.duration && `${existingAudio.duration}s`}
                {existingAudio.size && ` • ${(existingAudio.size / 1024).toFixed(0)} KB`}
                {' • MP3'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAudioRemoved?.();
              toast.success('🗑️ Vocale rimosso');
            }}
            disabled={disabled}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {existingAudio.url && (
          <audio controls className="w-full h-8 mt-2" src={existingAudio.url} />
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Nota Vocale WhatsApp (solo MP3)</span>
      </div>

      {isUploading ? (
        <div className="flex items-center gap-2 text-blue-600 p-3 bg-blue-50 rounded">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Caricamento vocale...</span>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Carica File MP3
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,.mp3"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>✅ Solo file <strong>MP3</strong> (formato WhatsApp PTT)</p>
        <p>📏 Massimo 16 MB • Consigliato: 30-60 secondi</p>
        <p>🎤 Inviato come <strong>nota vocale</strong> (non audio)</p>
      </div>
    </div>
  );
}


