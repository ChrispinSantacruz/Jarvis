import { Controller, Post, Body, Logger } from '@nestjs/common';
import { JarvisService } from '../jarvis/jarvis.service';
import { alexaSpeak } from './alexa.utils';

@Controller('alexa')
export class AlexaController {
  private readonly logger = new Logger(AlexaController.name);

  constructor(private readonly jarvisService: JarvisService) {}

  @Post('webhook')
  async handleAlexa(@Body() payload: any) {
    this.logger.log('Solicitud recibida de Alexa');
    
    const request = payload?.request;

    // LaunchRequest - Cuando el usuario dice "Alexa, abre Jarvis"
    if (request?.type === 'LaunchRequest') {
      this.logger.log('LaunchRequest recibido');
      return alexaSpeak(
        'Hola, soy Jarvis. ¿Qué deseas preguntar?',
        false,
      );
    }

    // IntentRequest - Cuando el usuario hace una pregunta
    if (request?.type === 'IntentRequest') {
      this.logger.log(`IntentRequest recibido: ${request?.intent?.name}`);
      
      const intent = request?.intent;

      // Manejar AskJarvisIntent
      if (intent?.name === 'AskJarvisIntent') {
        const question = intent?.slots?.question?.value;

        if (!question) {
          this.logger.warn('Pregunta no encontrada en los slots');
          return alexaSpeak(
            'No entendí la pregunta. Por favor, intenta nuevamente.',
            false,
          );
        }

        try {
          this.logger.log(`Procesando pregunta: ${question}`);
          const jarvisResponse = await this.jarvisService.askJarvis({
            question,
          });

          // Devolver respuesta en formato SSML
          return alexaSpeak(jarvisResponse.answer, false);
        } catch (error) {
          this.logger.error(`Error al procesar pregunta: ${error.message}`, error.stack);
          return alexaSpeak(
            'Lo siento, ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo.',
            false,
          );
        }
      }

      // Manejar otros intents si es necesario
      this.logger.warn(`Intent no reconocido: ${intent?.name}`);
      return alexaSpeak(
        'No puedo procesar esa solicitud. Por favor, intenta hacer una pregunta.',
        false,
      );
    }

    // Fallback - Para cualquier otro tipo de solicitud
    this.logger.warn(`Tipo de solicitud no reconocido: ${request?.type}`);
    return alexaSpeak(
      'No entendí la solicitud. Por favor, intenta de nuevo.',
      true,
    );
  }
}

