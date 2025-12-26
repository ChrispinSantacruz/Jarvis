/**
 * DTOs para las solicitudes de Alexa
 */

export interface AlexaSlot {
  name: string;
  value?: string;
  confirmationStatus?: string;
}

export interface AlexaIntent {
  name: string;
  confirmationStatus?: string;
  slots?: {
    [key: string]: AlexaSlot;
  };
}

export interface AlexaRequest {
  type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest';
  requestId: string;
  timestamp: string;
  locale: string;
  intent?: AlexaIntent;
  reason?: string;
}

export interface AlexaRequestBody {
  version: string;
  session?: {
    sessionId: string;
    application: {
      applicationId: string;
    };
    user?: {
      userId: string;
    };
    new?: boolean;
  };
  context?: {
    System: {
      application: {
        applicationId: string;
      };
      user: {
        userId: string;
      };
    };
  };
  request: AlexaRequest;
}

