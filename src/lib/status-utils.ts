import { ContactStatus } from '@/types/contact';

// Mapping dei colori per status con pallini luminosi
export const getStatusColor = (status: ContactStatus): string => {
  const colorMap: Record<ContactStatus, string> = {
    'da contattare': 'bg-gray-500 shadow-gray-500/50',
    'contattato': 'bg-yellow-500 shadow-yellow-500/50',
    'da richiamare': 'bg-orange-500 shadow-orange-500/50',
    'interessato': 'bg-blue-500 shadow-blue-500/50',
    'non interessato': 'bg-red-500 shadow-red-500/50',
    'qr code inviato': 'bg-purple-500 shadow-purple-500/50',
    'free trial iniziato': 'bg-emerald-500 shadow-emerald-500/50',
    'won': 'bg-green-600 shadow-green-600/50',
    'lost': 'bg-gray-500 shadow-gray-500/50'
  };
  
  return colorMap[status] || 'bg-gray-400 shadow-gray-400/50';
};

// Labels leggibili per gli status
export const getStatusLabel = (status: ContactStatus): string => {
  const labelMap: Record<ContactStatus, string> = {
    'da contattare': 'Da contattare',
    'contattato': 'Contattato',
    'da richiamare': 'Da richiamare',
    'interessato': 'Interessato',
    'non interessato': 'Non interessato',
    'qr code inviato': 'QR Code inviato',
    'free trial iniziato': 'Free trial iniziato',
    'won': 'Won',
    'lost': 'Lost'
  };
  
  return labelMap[status] || status;
};

// Stati che richiedono MRR
export const isPipelineStatus = (status: ContactStatus): boolean => {
  return ['interessato', 'qr code inviato', 'free trial iniziato', 'won', 'lost'].includes(status);
};

// Tutti gli status disponibili
export const getAllStatuses = (): ContactStatus[] => {
  return [
    'da contattare',
    'contattato', 
    'da richiamare',
    'interessato',
    'non interessato',
    'qr code inviato',
    'free trial iniziato',
    'won',
    'lost'
  ];
};

// Solo gli status pipeline
export const getPipelineStatuses = (): ContactStatus[] => {
  return [
    'interessato',
    'qr code inviato',
    'free trial iniziato',
    'won',
    'lost'
  ];
};

// Formatta MRR per display
export const formatMRR = (mrr?: number): string => {
  if (!mrr) return '';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(mrr);
}; 