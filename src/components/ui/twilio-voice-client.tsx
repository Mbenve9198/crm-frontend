'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Badge } from './badge';
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

interface TwilioVoiceClientProps {
  onCallStart?: (call: Call) => void;
  onCallEnd?: (call: Call) => void;
}

interface CallStatus {
  isConnected: boolean;
  callSid?: string;
  direction?: 'incoming' | 'outgoing';
  from?: string;
  to?: string;
  duration: number;
}

export function TwilioVoiceClient({ onCallStart, onCallEnd }: TwilioVoiceClientProps) {
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>({
    isConnected: false,
    duration: 0
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Inizializza il device Twilio
  const initializeDevice = async () => {
    try {
      setIsInitializing(true);
      
      // Ottieni access token dal backend
      const response = await fetch('/api/calls/access-token', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero dell\'access token');
      }

      const { data } = await response.json();
      
      // Crea il device
      const newDevice = new Device(data.accessToken, {
        logLevel: 'debug'
      });

      // Event listeners per il device
      newDevice.on('ready', () => {
        console.log('🎙️ Twilio Device pronto');
        setIsReady(true);
        toast.success('Telefono browser pronto');
      });

      newDevice.on('error', (error) => {
        console.error('❌ Errore Twilio Device:', error);
        toast.error(`Errore telefono: ${error.message}`);
        setIsReady(false);
      });

      newDevice.on('incoming', (call) => {
        console.log('📞 Chiamata in arrivo:', call.parameters);
        handleIncomingCall(call);
      });

      newDevice.on('disconnect', () => {
        console.log('🔌 Device disconnesso');
        setIsReady(false);
        toast.error('Telefono disconnesso');
      });

      // Registra il device
      await newDevice.register();
      setDevice(newDevice);
      
    } catch (error) {
      console.error('Errore inizializzazione device:', error);
      toast.error('Errore nell\'inizializzazione del telefono');
      setIsReady(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // Gestisce le chiamate in arrivo
  const handleIncomingCall = (call: Call) => {
    setCurrentCall(call);
    setCallStatus({
      isConnected: false,
      callSid: call.parameters.CallSid,
      direction: 'incoming',
      from: call.parameters.From,
      to: call.parameters.To,
      duration: 0
    });
    setShowCallDialog(true);

    // Event listeners per la chiamata
    call.on('accept', () => {
      console.log('✅ Chiamata accettata');
      setCallStatus(prev => ({ ...prev, isConnected: true }));
      startDurationTimer();
      onCallStart?.(call);
    });

    call.on('disconnect', () => {
      console.log('🔚 Chiamata terminata');
      handleCallEnd(call);
    });

    call.on('cancel', () => {
      console.log('❌ Chiamata cancellata');
      handleCallEnd(call);
    });

    call.on('error', (error) => {
      console.error('❌ Errore chiamata:', error);
      toast.error(`Errore chiamata: ${error.message}`);
      handleCallEnd(call);
    });
  };

  // Accetta una chiamata in arrivo
  const acceptCall = () => {
    if (currentCall) {
      currentCall.accept();
      toast.success('Chiamata accettata');
    }
  };

  // Rifiuta una chiamata in arrivo
  const rejectCall = () => {
    if (currentCall) {
      currentCall.reject();
      toast.success('Chiamata rifiutata');
      handleCallEnd(currentCall);
    }
  };

  // Termina la chiamata corrente
  const hangupCall = () => {
    if (currentCall) {
      currentCall.disconnect();
      toast.success('Chiamata terminata');
    }
  };

  // Gestisce la fine della chiamata
  const handleCallEnd = (call: Call) => {
    setCurrentCall(null);
    setCallStatus({
      isConnected: false,
      duration: 0
    });
    setShowCallDialog(false);
    setIsMuted(false);
    stopDurationTimer();
    onCallEnd?.(call);
  };

  // Toggle mute
  const toggleMute = () => {
    if (currentCall) {
      currentCall.mute(!isMuted);
      setIsMuted(!isMuted);
      toast.success(isMuted ? 'Audio attivato' : 'Audio disattivato');
    }
  };

  // Timer per la durata della chiamata
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallStatus(prev => ({
        ...prev,
        duration: prev.duration + 1
      }));
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = undefined;
    }
  };

  // Formatta la durata
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inizializza il device al mount
  useEffect(() => {
    if (user && !device && !isInitializing) {
      initializeDevice();
    }

    // Cleanup al unmount
    return () => {
      if (device) {
        device.destroy();
      }
      stopDurationTimer();
    };
  }, [user]);

  // Cleanup timer
  useEffect(() => {
    return () => stopDurationTimer();
  }, []);

  return (
    <>
      {/* Indicatore stato device */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={isReady ? "default" : "secondary"}>
          {isReady ? '🎙️ Telefono Pronto' : isInitializing ? '🔄 Inizializzazione...' : '❌ Telefono Non Disponibile'}
        </Badge>
        {!isReady && !isInitializing && (
          <Button size="sm" variant="outline" onClick={initializeDevice}>
            Riconnetti
          </Button>
        )}
      </div>

      {/* Dialog per chiamata attiva */}
      <Dialog open={showCallDialog} onOpenChange={(open) => { if (!open && !callStatus.isConnected) rejectCall(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {callStatus.direction === 'incoming' ? 'Chiamata in Arrivo' : 'Chiamata in Corso'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informazioni chiamata */}
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {callStatus.direction === 'incoming' ? callStatus.from : callStatus.to}
              </div>
              <Badge variant={callStatus.isConnected ? "default" : "secondary"}>
                {callStatus.isConnected ? 'Connesso' : 'In Arrivo'}
              </Badge>
              {callStatus.isConnected && (
                <div className="text-2xl font-mono">
                  {formatDuration(callStatus.duration)}
                </div>
              )}
            </div>

            {/* Controlli chiamata */}
            <div className="flex justify-center gap-4">
              {!callStatus.isConnected && callStatus.direction === 'incoming' && (
                <>
                  <Button
                    onClick={acceptCall}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Phone className="h-5 w-5" />
                    Accetta
                  </Button>
                  <Button
                    onClick={rejectCall}
                    variant="destructive"
                    size="lg"
                  >
                    <PhoneOff className="h-5 w-5" />
                    Rifiuta
                  </Button>
                </>
              )}

              {callStatus.isConnected && (
                <>
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    {isMuted ? 'Disattiva' : 'Muta'}
                  </Button>
                  <Button
                    onClick={hangupCall}
                    variant="destructive"
                    size="lg"
                  >
                    <PhoneOff className="h-5 w-5" />
                    Termina
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 