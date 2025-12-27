/**
 * Utilidades para formatear respuestas de Alexa
 */

/**
 * Formatea una respuesta de texto en formato SSML para Alexa
 * @param text - Texto a convertir a SSML
 * @param shouldEndSession - Si la sesión debe terminar después de esta respuesta
 * @returns Respuesta formateada para Alexa
 */
export function alexaSpeak(
  text: string,
  shouldEndSession: boolean = false,
): any {
  // Limpiar el texto de caracteres especiales que pueden romper SSML
  const cleanText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml: `<speak>${cleanText}</speak>`,
      },
      shouldEndSession,
    },
  };
}

/**
 * Formatea una respuesta de texto simple (PlainText) para Alexa
 * Útil para respuestas cortas o cuando SSML no es necesario
 * @param text - Texto a enviar
 * @param shouldEndSession - Si la sesión debe terminar después de esta respuesta
 * @param includeReprompt - Si se debe incluir un reprompt para mantener la conversación viva
 * @returns Respuesta formateada para Alexa
 */
export function alexaPlainText(
  text: string,
  shouldEndSession: boolean = false,
  includeReprompt: boolean = true,
): any {
  // Asegurar que el texto no sea null/undefined y limpiar caracteres problemáticos
  const cleanText = (text || '').toString().trim();
  
  // Si el texto está vacío después de limpiar, usar un mensaje por defecto
  const finalText = cleanText || 'No se pudo generar una respuesta.';

  const response: any = {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: finalText,
      },
      shouldEndSession,
    },
  };

  // Agregar reprompt para mantener la conversación viva (si no se debe terminar la sesión)
  if (!shouldEndSession && includeReprompt) {
    response.response.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: '¿Deseas hacer otra pregunta?',
      },
    };
  }

  return response;
}

