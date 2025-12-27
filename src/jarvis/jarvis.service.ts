import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { JARVIS_SYSTEM_PROMPT } from './jarvis.prompt';
import { AskJarvisDto, JarvisResponseDto } from './dto/ask-jarvis.dto';

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private readonly groq: Groq;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly topP: number;

  constructor(private readonly configService: ConfigService) {
    // Inicializar cliente Groq con API key desde variables de entorno
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY no está configurada. Por favor, configura la variable de entorno.',
      );
    }

    this.groq = new Groq({
      apiKey: apiKey,
    });

    // Cargar configuración del modelo desde variables de entorno
    this.model = this.configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
    this.temperature = parseFloat(
      this.configService.get<string>('GROQ_TEMPERATURE', '1'),
    );
    this.maxTokens = parseInt(
      this.configService.get<string>('GROQ_MAX_TOKENS', '1024'),
    );
    this.topP = parseFloat(this.configService.get<string>('GROQ_TOP_P', '1'));

    this.logger.log('JARVIS Service inicializado correctamente');
  }

  /**
   * Detecta el modo de respuesta basado en palabras clave en la pregunta
   * @param question - Pregunta del usuario
   * @returns Modo de respuesta: 'short', 'long', o 'technical'
   */
  private detectResponseMode(question: string): 'short' | 'long' | 'technical' {
    const q = question.toLowerCase();

    if (
      q.includes('en una frase') ||
      q.includes('rápido') ||
      q.includes('resumen') ||
      q.includes('breve') ||
      q.includes('corto') ||
      q.includes('solo') ||
      q.includes('sólo')
    ) {
      return 'short';
    }

    if (
      q.includes('técnico') ||
      q.includes('profundo') ||
      q.includes('detallado') ||
      q.includes('paso a paso') ||
      q.includes('detalladamente') ||
      q.includes('explicación completa') ||
      q.includes('desde cero')
    ) {
      return 'technical';
    }

    return 'long';
  }

  /**
   * Sanitiza el texto para que sea compatible con Alexa
   * Elimina markdown, listas largas y formatea para voz
   * @param text - Texto a sanitizar
   * @returns Texto limpio para Alexa
   */
  private sanitizeForAlexa(text: string): string {
    return text
      .replace(/[*_#`]/g, '') // Eliminar markdown
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Eliminar enlaces markdown
      .replace(/\n+/g, ' ') // Reemplazar saltos de línea con espacios
      .replace(/\s{2,}/g, ' ') // Reemplazar múltiples espacios con uno solo
      .replace(/^\d+\.\s*/gm, '') // Eliminar numeración de listas
      .replace(/^[-*]\s*/gm, '') // Eliminar viñetas
      .trim();
  }

  /**
   * Procesa una pregunta del usuario y devuelve la respuesta de JARVIS
   * @param askDto - DTO con la pregunta y contexto opcional
   * @returns Respuesta estructurada de JARVIS
   */
  async askJarvis(askDto: AskJarvisDto): Promise<JarvisResponseDto> {
    try {
      this.logger.log(`Procesando pregunta: ${askDto.question.substring(0, 50)}...`);

      // Detectar modo de respuesta
      const responseMode = this.detectResponseMode(askDto.question);
      this.logger.debug(`Modo de respuesta detectado: ${responseMode}`);

      // Ajustar el prompt del sistema según el modo
      let systemPrompt = JARVIS_SYSTEM_PROMPT;

      if (responseMode === 'short') {
        systemPrompt += `

Responde en una sola frase clara, directa y concisa. Máximo 20 palabras.
`;
      }

      if (responseMode === 'technical') {
        systemPrompt += `

Responde de forma técnica, estructurada y detallada. Usa ejemplos si es posible.
Organiza la información de manera clara y lógica.
`;
      }

      // Construir mensajes para la conversación
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: askDto.question,
        },
      ];

      // Llamar a la API de Groq
      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        stream: false,
      });

      // Extraer la respuesta del modelo
      let answer =
        chatCompletion.choices[0]?.message?.content ||
        'No se pudo generar una respuesta.';

      // Sanitizar respuesta para Alexa (eliminar markdown, formatear para voz)
      answer = this.sanitizeForAlexa(answer);

      this.logger.log('Respuesta generada exitosamente');

      // Construir respuesta estructurada
      const response: JarvisResponseDto = {
        answer: answer,
        conversationId: askDto.conversationId || undefined,
        timestamp: new Date().toISOString(),
        model: this.model,
      };

      return response;
    } catch (error) {
      this.logger.error(`Error al procesar pregunta: ${error.message}`, error.stack);
      
      if (error instanceof Error) {
        throw new BadRequestException(
          `Error al procesar la solicitud: ${error.message}`,
        );
      }
      
      throw new BadRequestException('Error desconocido al procesar la solicitud');
    }
  }

  /**
   * Procesa una pregunta con streaming (para futuras integraciones)
   * @param askDto - DTO con la pregunta
   * @param onChunk - Callback para cada chunk de respuesta
   */
  async askJarvisStream(
    askDto: AskJarvisDto,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    try {
      this.logger.log(`Procesando pregunta con streaming: ${askDto.question.substring(0, 50)}...`);

      // Detectar modo de respuesta para streaming también
      const responseMode = this.detectResponseMode(askDto.question);
      let systemPrompt = JARVIS_SYSTEM_PROMPT;

      if (responseMode === 'short') {
        systemPrompt += '\n\nResponde en una sola frase clara, directa y concisa. Máximo 20 palabras.';
      }

      if (responseMode === 'technical') {
        systemPrompt += '\n\nResponde de forma técnica, estructurada y detallada. Usa ejemplos si es posible.';
      }

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: askDto.question,
        },
      ];

      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        stream: true,
      });

      // Procesar chunks de respuesta
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      this.logger.error(`Error en streaming: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Error al procesar la solicitud con streaming: ${error.message}`,
      );
    }
  }
}

