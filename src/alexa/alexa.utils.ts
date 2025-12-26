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
 * @returns Respuesta formateada para Alexa
 */
export function alexaPlainText(
  text: string,
  shouldEndSession: boolean = false,
): any {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: text,
      },
      shouldEndSession,
    },
  };
}

