'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Trash2, Loader2 } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface SequenceAudioRecorderProps {
  existingAudio?: {
    type?: 'voice' | 'image' | 'video' | 'document' | 'audio'; // Include tutti i tipi
    filename: string;
    url: string;
    size?: number;
    duration?: number;
  } | null;
  onAudioRemoved?: () => void;
  disabled?: boolean;
  // 🎤 Callback per audio locale (prima di salvare campagna)
  onAudioReady?: (audioData: {
    voiceFileId: string; // 🎤 ID del VoiceFile salvato
    filename: string;
    size: number;
    duration?: number;
    publicUrl: string; // URL pubblico per accesso
  }) => void;
}

export function SequenceAudioRecorder({
  existingAudio,
  onAudioRemoved,
  disabled = false,
  onAudioReady
}: SequenceAudioRecorderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 🎤 CRITICO: WhatsApp PTT richiede OGG Opus (non WebM!)
      let mimeType = 'audio/ogg'; // Fallback
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'; // Formato nativo WhatsApp PTT ✅
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'; // Fallback se OGG non supportato
      }
      
      console.log(`🎤 Formato registrazione: ${mimeType}`);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // 🎤 Upload automatico su VoiceFile collezione
        uploadVoiceFile(blob, `vocale.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('🎤 Registrazione avviata');
    } catch (error) {
      console.error('Errore accesso microfono:', error);
      toast.error('Impossibile accedere al microfono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast.success('✅ Registrazione completata');
    }
  };


  // 🎤 Upload su VoiceFile collezione
  const uploadVoiceFile = async (blob: Blob, filename: string) => {
    try {
      setIsUploading(true);
      
      // Converti in DataURL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      // Calcola durata
      let duration: number | undefined;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await new Promise<void>((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
              duration = Math.round(audio.duration);
            }
            resolve();
          });
          audio.addEventListener('error', () => resolve());
        });
      }
      
      // Upload su collezione VoiceFile
      const response = await apiClient.uploadVoiceFile(dataUrl, filename, blob.size, duration);
      
      if (response.success && response.data) {
        toast.success('🎤 Vocale salvato!');
        
        // Notifica parent con voiceFileId e URL pubblico
        onAudioReady?.({
          voiceFileId: response.data.voiceFileId,
          filename: response.data.filename,
          size: response.data.size,
          duration: response.data.duration,
          publicUrl: response.data.publicUrl
        });
        
        // Reset locale
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
      }
    } catch (error) {
      console.error('Errore upload voice file:', error);
      toast.error('Errore caricamento vocale');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo file
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/aac'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato non supportato. Usa MP3, OGG, WAV, M4A o WebM');
      return;
    }

    // Valida dimensione (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File troppo grande. Massimo 10 MB');
      return;
    }

    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    toast.success(`📁 File caricato: ${file.name}`);
    
    // 🎤 Upload automatico su VoiceFile collezione
    await uploadVoiceFile(file, file.name);
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    return (bytes / 1024).toFixed(1) + ' KB';
  };


  // Se c'è un audio esistente, mostra quello
  if (existingAudio) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">{existingAudio.filename}</p>
              <p className="text-xs text-green-600">
                {existingAudio.duration ? `${existingAudio.duration}s` : ''} 
                {existingAudio.size ? ` • ${formatSize(existingAudio.size)}` : ''}
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
        <audio controls className="w-full h-8" src={existingAudio.url} />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Messaggio Vocale (opzionale)</span>
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-blue-600 p-2 bg-blue-50 rounded">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Caricamento vocale...</span>
        </div>
      )}

      {!audioBlob && !isUploading && (
        <div className="flex gap-2">
          {!isRecording ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startRecording}
                disabled={disabled}
                className="flex-1"
              >
                <Mic className="h-4 w-4 mr-2" />
                Registra Vocale
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Carica File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-mono text-gray-700">{formatTime(recordingTime)}</span>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopRecording}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          )}
        </div>
      )}


      <p className="text-xs text-gray-500">
        Formati supportati: MP3, OGG, WAV, M4A, WebM • Max 10 MB
      </p>
    </div>
  );
}

