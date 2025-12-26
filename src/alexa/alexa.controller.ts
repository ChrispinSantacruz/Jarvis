import { Controller, Post, Body, Logger } from '@nestjs/common';
import { JarvisService } from '../jarvis/jarvis.service';

@Controller('alexa')
export class AlexaController {
  private readonly logger = new Logger(AlexaController.name);

  constructor(private readonly jarvisService: JarvisService) {}

  @Post('webhook')
  async handleAlexa(@Body() payload: any) {
    this.logger.log('Solicitud recibida de Alexa');
    
    const intentRequest = payload?.request;

    // LaunchRequest - Cuando el usuario dice "Alexa, abre Jarvis"
    if (intentRequest?.type === 'LaunchRequest') {
      this.logger.log('LaunchRequest recibido');
      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Hola, soy Jarvis. ¿Qué deseas preguntar?',
          },
          shouldEndSession: false,
        },
      };
    }

    // IntentRequest - Cuando el usuario hace una pregunta
    if (intentRequest?.type === 'IntentRequest') {
      this.logger.log(`IntentRequest recibido: ${intentRequest?.intent?.name}`);
      
      const question = intentRequest?.intent?.slots?.question?.value;

      if (!question) {
        this.logger.warn('Pregunta no encontrada en los slots');
        return {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: '¿Sobre qué tema deseas preguntar?',
            },
            shouldEndSession: false,
          },
        };
      }

      try {
        this.logger.log(`Procesando pregunta: ${question}`);
        const jarvisResponse = await this.jarvisService.askJarvis({
          question,
        });

        return {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: jarvisResponse.answer,
            },
            shouldEndSession: false,
          },
        };
      } catch (error) {
        this.logger.error(`Error al procesar pregunta: ${error.message}`);
        return {
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'Lo siento, ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo.',
            },
            shouldEndSession: false,
          },
        };
      }
    }

    // Fallback - Para cualquier otro tipo de solicitud
    this.logger.warn(`Tipo de solicitud no reconocido: ${intentRequest?.type}`);
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'No entendí la solicitud. Por favor, intenta de nuevo.',
        },
        shouldEndSession: true,
      },
    };
  }
}

