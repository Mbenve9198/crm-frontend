'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

interface SequenceAudioRecorderProps {
  campaignId?: string;
  sequenceId: string;
  existingAudio?: {
    type?: 'voice' | 'image' | 'video' | 'document';
    filename: string;
    url: string;
    size?: number;
    duration?: number;
  } | null;
  onAudioUploaded?: (attachment: {
    type: 'voice' | 'image' | 'video' | 'document';
    filename: string;
    url: string;
    size: number;
    duration?: number;
  }) => void;
  onAudioRemoved?: () => void;
  disabled?: boolean;
  // 🎤 NUOVO: Callback per audio locale (prima di salvare campagna)
  onAudioReady?: (audioData: {
    blob: Blob;
    dataUrl: string;
    filename: string;
    size: number;
    duration?: number;
  }) => void;
}

export function SequenceAudioRecorder({
  campaignId,
  sequenceId,
  existingAudio,
  onAudioUploaded,
  onAudioRemoved,
  disabled = false,
  onAudioReady
}: SequenceAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // 🎤 NUOVO: Converti in Base64 e notifica il parent
        await convertAndNotify(blob, 'vocale.webm');
        
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

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    chunksRef.current = [];
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
    
    // 🎤 NUOVO: Converti in Base64 e notifica il parent
    await convertAndNotify(file, file.name);
    
    toast.success(`📁 File caricato: ${file.name}`);
  };

  const uploadAudio = async () => {
    if (!audioBlob || !campaignId) {
      toast.error('Salva prima la campagna per caricare l\'audio');
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      const filename = audioBlob instanceof File ? audioBlob.name : `vocale-${Date.now()}.webm`;
      formData.append('audio', audioBlob, filename);

      // Calcola durata (se possibile)
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
              formData.append('duration', Math.round(audio.duration).toString());
            }
            resolve(true);
          });
          audio.addEventListener('error', () => resolve(true));
        });
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-campaigns/${campaignId}/sequences/${sequenceId}/audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('🎤 Vocale caricato con successo!');
        // Assicura che il tipo sia corretto
        const attachment = {
          ...data.data.attachment,
          type: 'voice' as const
        };
        onAudioUploaded?.(attachment);
        deleteRecording();
      } else {
        throw new Error(data.message || 'Errore upload audio');
      }
    } catch (error) {
      console.error('Errore upload audio:', error);
      toast.error('Errore durante il caricamento dell\'audio');
    } finally {
      setIsUploading(false);
    }
  };

  const removeExistingAudio = async () => {
    if (!campaignId || !existingAudio) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-campaigns/${campaignId}/sequences/${sequenceId}/audio`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('🗑️ Vocale rimosso');
        onAudioRemoved?.();
      } else {
        throw new Error(data.message || 'Errore rimozione audio');
      }
    } catch (error) {
      console.error('Errore rimozione audio:', error);
      toast.error('Errore durante la rimozione dell\'audio');
    }
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

  // 🎤 Converte Blob in Base64 DataURL e notifica il parent
  const convertAndNotify = async (blob: Blob, filename: string) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        
        // Calcola durata se possibile
        let duration: number | undefined;
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          await new Promise<void>((res) => {
            audio.addEventListener('loadedmetadata', () => {
              if (audio.duration && isFinite(audio.duration)) {
                duration = Math.round(audio.duration);
              }
              res();
            });
            audio.addEventListener('error', () => res());
          });
        }

        // Notifica il parent con i dati audio
        onAudioReady?.({
          blob,
          dataUrl,
          filename,
          size: blob.size,
          duration
        });

        resolve();
      };
      reader.readAsDataURL(blob);
    });
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
            onClick={removeExistingAudio}
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

      {audioBlob && audioUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={playAudio}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1">
              <audio controls className="w-full h-8" src={audioUrl} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deleteRecording}
              disabled={isUploading}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>

          {campaignId ? (
            <Button
              type="button"
              onClick={uploadAudio}
              disabled={isUploading || disabled}
              className="w-full"
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Salva Vocale su Server
                </>
              )}
            </Button>
          ) : (
            <p className="text-xs text-green-600 text-center">
              ✅ Vocale pronto! Verrà salvato quando crei la campagna
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Formati supportati: MP3, OGG, WAV, M4A, WebM • Max 10 MB
      </p>
    </div>
  );
}

