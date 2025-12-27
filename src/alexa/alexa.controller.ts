import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { JarvisService } from '../jarvis/jarvis.service';
import { alexaSpeak } from './alexa.utils';

@Controller('alexa')
export class AlexaController {
  private readonly logger = new Logger(AlexaController.name);

  constructor(private readonly jarvisService: JarvisService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleAlexa(@Body() payload: any) {
    try {
      this.logger.log('Solicitud recibida de Alexa');
      this.logger.debug(`Payload completo: ${JSON.stringify(payload)}`);
      
      const request = payload?.request;

      if (!request) {
        this.logger.error('Request no encontrado en el payload');
        const sessionAttributes = payload?.session?.attributes || {};
        const response = alexaSpeak(
          'Error: No se recibió una solicitud válida. ¿Puedes intentarlo de nuevo?',
          false,
          sessionAttributes,
        );
        this.logger.debug(`No request response: ${JSON.stringify(response)}`);
        return response;
      }

      // LaunchRequest - Cuando el usuario dice "Alexa, abre Jarvis"
      if (request.type === 'LaunchRequest') {
        this.logger.log('LaunchRequest recibido');
        const sessionAttributes = payload?.session?.attributes || {};
        const response = alexaSpeak(
          'Hola, soy Jarvis. ¿Qué deseas preguntar?',
          false,
          sessionAttributes,
        );
        this.logger.debug(`LaunchRequest response: ${JSON.stringify(response)}`);
        return response;
      }

      // IntentRequest - Cuando el usuario hace una pregunta
      if (request.type === 'IntentRequest') {
        this.logger.log(`IntentRequest recibido: ${request?.intent?.name}`);
        
        const intent = request?.intent;

        if (!intent) {
          this.logger.warn('Intent no encontrado en la solicitud');
          const sessionAttributes = payload?.session?.attributes || {};
          return alexaSpeak(
            'No pude identificar tu solicitud. Por favor, intenta nuevamente.',
            false,
            sessionAttributes,
          );
        }

        // Función helper para procesar cualquier pregunta
        const processQuestion = async (slotName: string, defaultMessage: string) => {
          // Obtener atributos de sesión existentes
          const sessionAttributes = payload?.session?.attributes || {};

          const questionSlot = intent?.slots?.[slotName];
          let question = questionSlot?.value || 
                        questionSlot?.slotValue?.value || 
                        null;

          this.logger.debug(`Slot ${slotName} recibido: ${JSON.stringify(questionSlot)}`);
          this.logger.debug(`Pregunta extraída: ${question}`);

          if (!question || question.trim() === '') {
            this.logger.warn(`${slotName} no encontrado o vacío en los slots`);
            return alexaSpeak(
              'No entendí la pregunta. ¿Puedes repetirla?',
              false,
              sessionAttributes,
            );
          }

          try {
            this.logger.log(`Procesando pregunta: ${question}`);
            const jarvisResponse = await this.jarvisService.askJarvis({
              question: question.trim(),
            });

            if (!jarvisResponse || !jarvisResponse.answer) {
              this.logger.error('Respuesta vacía de JarvisService');
              return alexaSpeak(
                'Lo siento, no pude generar una respuesta. Por favor, intenta con otra pregunta.',
                false,
                sessionAttributes,
              );
            }

            // La respuesta ya viene limitada y sanitizada del servicio
            let answer = jarvisResponse.answer || '';
            
            // Actualizar atributos de sesión con la última pregunta y respuesta
            const updatedSessionAttributes = {
              ...sessionAttributes,
              lastQuestion: question.trim(),
              lastAnswer: answer,
              lastTimestamp: new Date().toISOString(),
            };
            
            // Devolver respuesta en formato PlainText con reprompt y atributos de sesión
            const alexaResponse = alexaSpeak(answer, false, updatedSessionAttributes);
            this.logger.debug(`Respuesta a enviar a Alexa: ${JSON.stringify(alexaResponse)}`);
            
            return alexaResponse;
          } catch (error) {
            this.logger.error(`Error al procesar pregunta: ${error.message}`, error.stack);
            return alexaSpeak(
              'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.',
              false,
              sessionAttributes,
            );
          }
        };

        // Manejar AskJarvisIntent
        if (intent.name === 'AskJarvisIntent') {
          return await processQuestion(
            'question',
            'No entendí la pregunta. Por favor, intenta nuevamente con una pregunta clara.'
          );
        }

        // Manejar CompareIntent
        if (intent.name === 'CompareIntent') {
          const sessionAttributes = payload?.session?.attributes || {};
          const comparison = intent?.slots?.comparison?.value || 
                            intent?.slots?.comparison?.slotValue?.value || 
                            null;
          
          if (!comparison || comparison.trim() === '') {
            return alexaSpeak(
              'No entendí qué quieres comparar. Por favor, intenta nuevamente.',
              false,
              sessionAttributes,
            );
          }

          const question = `Compara y explica las diferencias entre: ${comparison.trim()}`;
          try {
            this.logger.log(`Procesando comparación: ${question}`);
            const jarvisResponse = await this.jarvisService.askJarvis({ question });
            
            if (!jarvisResponse || !jarvisResponse.answer) {
              return alexaSpeak(
                'Lo siento, no pude generar una comparación. Por favor, intenta con otra pregunta.',
                false,
                sessionAttributes,
              );
            }

            let answer = jarvisResponse.answer || '';
            if (answer.length > 7000) {
              answer = answer.substring(0, 7000) + '...';
            }

            const updatedSessionAttributes = {
              ...sessionAttributes,
              lastQuestion: question,
              lastAnswer: answer,
              lastTimestamp: new Date().toISOString(),
            };

            return alexaSpeak(answer, false, updatedSessionAttributes);
          } catch (error) {
            this.logger.error(`Error en CompareIntent: ${error.message}`, error.stack);
            return alexaSpeak(
              'Lo siento, ocurrió un error al procesar la comparación. Por favor, intenta de nuevo.',
              false,
              sessionAttributes,
            );
          }
        }

        // Manejar TeachIntent
        if (intent.name === 'TeachIntent') {
          const sessionAttributes = payload?.session?.attributes || {};
          const topic = intent?.slots?.topic?.value || 
                       intent?.slots?.topic?.slotValue?.value || 
                       null;
          
          if (!topic || topic.trim() === '') {
            return alexaSpeak(
              'No entendí sobre qué tema quieres aprender. Por favor, intenta nuevamente.',
              false,
              sessionAttributes,
            );
          }

          const question = `Enséñame sobre ${topic.trim()} desde cero, de forma clara y estructurada.`;
          try {
            this.logger.log(`Procesando enseñanza: ${question}`);
            const jarvisResponse = await this.jarvisService.askJarvis({ question });
            
            if (!jarvisResponse || !jarvisResponse.answer) {
              return alexaSpeak(
                'Lo siento, no pude generar una explicación. Por favor, intenta con otro tema.',
                false,
                sessionAttributes,
              );
            }

            let answer = jarvisResponse.answer || '';
            if (answer.length > 7000) {
              answer = answer.substring(0, 7000) + '...';
            }

            const updatedSessionAttributes = {
              ...sessionAttributes,
              lastQuestion: question,
              lastAnswer: answer,
              lastTimestamp: new Date().toISOString(),
            };

            return alexaSpeak(answer, false, updatedSessionAttributes);
          } catch (error) {
            this.logger.error(`Error en TeachIntent: ${error.message}`, error.stack);
            return alexaSpeak(
              'Lo siento, ocurrió un error al procesar la solicitud. Por favor, intenta de nuevo.',
              false,
              sessionAttributes,
            );
          }
        }

        // Manejar ResearchIntent
        if (intent.name === 'ResearchIntent') {
          const sessionAttributes = payload?.session?.attributes || {};
          const topic = intent?.slots?.topic?.value || 
                       intent?.slots?.topic?.slotValue?.value || 
                       null;
          
          if (!topic || topic.trim() === '') {
            return alexaSpeak(
              'No entendí sobre qué tema quieres que investigue. Por favor, intenta nuevamente.',
              false,
              sessionAttributes,
            );
          }

          const question = `Haz un análisis y resumen completo sobre: ${topic.trim()}`;
          try {
            this.logger.log(`Procesando investigación: ${question}`);
            const jarvisResponse = await this.jarvisService.askJarvis({ question });
            
            if (!jarvisResponse || !jarvisResponse.answer) {
              return alexaSpeak(
                'Lo siento, no pude generar un análisis. Por favor, intenta con otro tema.',
                false,
                sessionAttributes,
              );
            }

            let answer = jarvisResponse.answer || '';
            if (answer.length > 7000) {
              answer = answer.substring(0, 7000) + '...';
            }

            const updatedSessionAttributes = {
              ...sessionAttributes,
              lastQuestion: question,
              lastAnswer: answer,
              lastTimestamp: new Date().toISOString(),
            };

            return alexaSpeak(answer, false, updatedSessionAttributes);
          } catch (error) {
            this.logger.error(`Error en ResearchIntent: ${error.message}`, error.stack);
            return alexaSpeak(
              'Lo siento, ocurrió un error al procesar la investigación. Por favor, intenta de nuevo.',
              false,
              sessionAttributes,
            );
          }
        }

        // Manejar OpinionIntent
        if (intent.name === 'OpinionIntent') {
          const sessionAttributes = payload?.session?.attributes || {};
          const topic = intent?.slots?.topic?.value || 
                       intent?.slots?.topic?.slotValue?.value || 
                       null;
          
          if (!topic || topic.trim() === '') {
            return alexaSpeak(
              'No entendí sobre qué quieres mi opinión. Por favor, intenta nuevamente.',
              false,
              sessionAttributes,
            );
          }

          const question = `Dame tu opinión técnica y profesional sobre: ${topic.trim()}`;
          try {
            this.logger.log(`Procesando opinión: ${question}`);
            const jarvisResponse = await this.jarvisService.askJarvis({ question });
            
            if (!jarvisResponse || !jarvisResponse.answer) {
              return alexaSpeak(
                'Lo siento, no pude generar una opinión. Por favor, intenta con otro tema.',
                false,
                sessionAttributes,
              );
            }

            let answer = jarvisResponse.answer || '';
            if (answer.length > 7000) {
              answer = answer.substring(0, 7000) + '...';
            }

            const updatedSessionAttributes = {
              ...sessionAttributes,
              lastQuestion: question,
              lastAnswer: answer,
              lastTimestamp: new Date().toISOString(),
            };

            return alexaSpeak(answer, false, updatedSessionAttributes);
          } catch (error) {
            this.logger.error(`Error en OpinionIntent: ${error.message}`, error.stack);
            return alexaSpeak(
              'Lo siento, ocurrió un error al procesar la solicitud. Por favor, intenta de nuevo.',
              false,
              sessionAttributes,
            );
          }
        }

        // Manejar AMAZON.HelpIntent
        if (intent.name === 'AMAZON.HelpIntent') {
          const sessionAttributes = payload?.session?.attributes || {};
          return alexaSpeak(
            'Puedes preguntarme sobre cualquier tema técnico, pedirme que compare conceptos, que te enseñe algo, que investigue un tema, o que te dé mi opinión. Por ejemplo: "pregunta qué es inteligencia artificial" o "enséñame sobre programación".',
            false,
            sessionAttributes,
          );
        }

        // Manejar AMAZON.StopIntent y AMAZON.CancelIntent
        if (intent.name === 'AMAZON.StopIntent' || intent.name === 'AMAZON.CancelIntent') {
          return alexaSpeak('Hasta luego.', true);
        }

        // Manejar otros intents si es necesario
        this.logger.warn(`Intent no reconocido: ${intent.name}`);
        const sessionAttributes = payload?.session?.attributes || {};
        const response = alexaSpeak(
          'No puedo procesar esa solicitud. Por favor, intenta hacer una pregunta.',
          false,
          sessionAttributes,
        );
        this.logger.debug(`Unknown intent response: ${JSON.stringify(response)}`);
        return response;
      }

      // SessionEndedRequest - Manejo silencioso
      if (request.type === 'SessionEndedRequest') {
        this.logger.log('SessionEndedRequest recibido (manejo silencioso)');
        // Respuesta mínima requerida por Alexa
        return {
          version: '1.0',
          response: {
            shouldEndSession: true,
          },
        };
      }

      // Fallback - Para cualquier otro tipo de solicitud
      this.logger.warn(`Tipo de solicitud no reconocido: ${request.type}`);
      const sessionAttributes = payload?.session?.attributes || {};
      const response = alexaSpeak(
        'No entendí la solicitud. Por favor, intenta de nuevo.',
        false,
        sessionAttributes,
      );
      this.logger.debug(`Fallback response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      // Catch general para cualquier error no manejado
      this.logger.error(`Error crítico en handleAlexa: ${error.message}`, error.stack);
      const response = alexaSpeak(
        'Ocurrió un error procesando tu solicitud. Por favor, intenta más tarde.',
        true,
      );
      this.logger.debug(`Critical error response: ${JSON.stringify(response)}`);
      return response;
    }
  }
}

