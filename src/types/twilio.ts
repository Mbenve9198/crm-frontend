export interface TwilioSettings {
  accountSid: string;
  phoneNumber: string;
  isVerified: boolean;
  isEnabled: boolean;
  lastVerified: string | null;
}

export interface TwilioConfigureRequest {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface TwilioVerifyResponse {
  accountName: string;
  accountSid: string;
  phoneNumber: string;
  isVerified: boolean;
  isEnabled: boolean;
}

export interface TwilioTestCallRequest {
  testNumber: string;
}

export interface TwilioTestCallResponse {
  callSid: string;
  status: string;
  to: string;
  from: string;
}

// Tipi per i template WhatsApp
export interface WhatsAppTemplate {
  message: string;
  variables: string[]; // Array delle variabili trovate nel template (es. ['nome', 'email'])
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppTemplateRequest {
  message: string;
}

export interface WhatsAppTemplateResponse {
  success: boolean;
  data?: WhatsAppTemplate;
  message?: string;
} 