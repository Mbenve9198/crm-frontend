'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Trash2 } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

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
    blob: Blob;
    dataUrl: string;
    filename: string;
    size: number;
    duration?: number;
  }) => void;
}

export function SequenceAudioRecorder({
  existingAudio,
  onAudioRemoved,
  disabled = false,
  onAudioReady
}: SequenceAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 🎤 Usa OGG Opus (migliore compatibilità WhatsApp)
      let mimeType = 'audio/webm'; // Fallback
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'; // Opus è il codec di WhatsApp
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
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
        
        // 🎤 Converti in DataURL e notifica parent
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          
          // Calcola durata
          let duration: number | undefined;
          const audio = new Audio(url);
          await new Promise<void>((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              if (audio.duration && isFinite(audio.duration)) {
                duration = Math.round(audio.duration);
              }
              resolve();
            });
            audio.addEventListener('error', () => resolve());
          });
          
          // Notifica parent con DataURL (no ImageKit!)
          onAudioReady?.({
            blob,
            dataUrl, // Base64 DataURL
            filename: `vocale.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`,
            size: blob.size,
            duration
          });
          
          toast.success('🎤 Vocale pronto!');
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
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
    
    // 🎤 Converti in DataURL e notifica parent
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      
      // Calcola durata
      let duration: number | undefined;
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          if (audio.duration && isFinite(audio.duration)) {
            duration = Math.round(audio.duration);
          }
          resolve();
        });
        audio.addEventListener('error', () => resolve());
      });
      
      // Notifica parent con DataURL
      onAudioReady?.({
        blob: file,
        dataUrl,
        filename: file.name,
        size: file.size,
        duration
      });
      
      toast.success(`📁 File caricato: ${file.name}`);
    };
    reader.readAsDataURL(file);
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

      {!audioBlob && (
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

