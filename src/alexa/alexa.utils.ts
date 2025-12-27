/**
 * Utilidades para formatear respuestas de Alexa
 */

/**
 * Formatea una respuesta de texto en formato SSML para Alexa
 * @param text - Texto a convertir a SSML
 * @param shouldEndSession - Si la sesión debe terminar después de esta respuesta
 * @param sessionAttributes - Atributos de sesión para mantener contexto
 * @returns Respuesta formateada para Alexa
 */
export function alexaSpeak(
  text: string,
  shouldEndSession: boolean = false,
  sessionAttributes: any = {},
): any {
  // Limpiar el texto de caracteres especiales que pueden romper SSML
  const cleanText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const response: any = {
    version: '1.0',
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml: `<speak><voice name="Miguel">${cleanText}</voice></speak>`,
      },
      shouldEndSession,
    },
  };

  // Agregar reprompt para mantener la conversación viva (si no se debe terminar la sesión)
  if (!shouldEndSession) {
    response.response.reprompt = {
      outputSpeech: {
        type: 'SSML',
        ssml: `<speak><voice name="Miguel">¿Deseas que lo explique con más detalle, te doy un ejemplo, o hacemos otra pregunta?</voice></speak>`,
      },
    };
  }

  return response;
}

/**
 * Formatea una respuesta de texto simple (PlainText) para Alexa
 * Útil para respuestas cortas o cuando SSML no es necesario
 * @param text - Texto a enviar
 * @param shouldEndSession - Si la sesión debe terminar después de esta respuesta
 * @param includeReprompt - Si se debe incluir un reprompt para mantener la conversación viva
 * @param sessionAttributes - Atributos de sesión para mantener contexto
 * @returns Respuesta formateada para Alexa
 */
export function alexaPlainText(
  text: string,
  shouldEndSession: boolean = false,
  includeReprompt: boolean = true,
  sessionAttributes: any = {},
): any {
  // Asegurar que el texto no sea null/undefined y limpiar caracteres problemáticos
  const cleanText = (text || '').toString().trim();
  
  // Si el texto está vacío después de limpiar, usar un mensaje por defecto
  const finalText = cleanText || 'No se pudo generar una respuesta.';

  const response: any = {
    version: '1.0',
    sessionAttributes,
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
        text: '¿Deseas que lo explique con más detalle, te doy un ejemplo, o hacemos otra pregunta?',
      },
    };
  }

  return response;
}
/**
 * Formatea una respuesta con imagen usando APL para Echo Show
 * @param text - Texto a decir
 * @param imageUrl - URL de la imagen
 * @param sessionAttributes - Atributos de sesión para mantener contexto
 * @returns Respuesta formateada para Alexa con imagen
 */
export function alexaImageResponse(
  text: string,
  imageUrl: string,
  sessionAttributes: any = {},
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
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml: `<speak><voice name="Miguel">${cleanText}</voice></speak>`,
      },
      directives: [
        {
          type: 'Alexa.Presentation.APL.RenderDocument',
          document: {
            type: 'APL',
            version: '1.8',
            mainTemplate: {
              items: [
                {
                  type: 'Image',
                  source: imageUrl,
                  width: '100vw',
                  height: '100vh',
                  scale: 'best-fit',
                },
              ],
            },
          },
        },
      ],
      shouldEndSession: true, // Terminar sesión después de mostrar imagen
    },
  };
}
