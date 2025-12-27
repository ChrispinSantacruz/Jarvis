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
    // Tokens por defecto: 250 para respuestas cortas, se ajusta dinámicamente según el modo
    this.maxTokens = parseInt(
      this.configService.get<string>('GROQ_MAX_TOKENS', '250'),
    );
    this.topP = parseFloat(this.configService.get<string>('GROQ_TOP_P', '1'));

    this.logger.log('JARVIS Service inicializado correctamente');
  }

  /**
   * Detecta el modo de respuesta basado en palabras clave en la pregunta
   * @param question - Pregunta del usuario
   * @returns Modo de respuesta: 'short', 'default', o 'technical'
   */
  private detectResponseMode(question: string): 'short' | 'default' | 'technical' {
    const q = question.toLowerCase();

    // Detectar respuestas cortas (una frase)
    if (
      q.includes('en una frase') ||
      q.includes('una frase') ||
      q.includes('rápido') ||
      q.includes('resumen') ||
      q.includes('breve') ||
      q.includes('corto') ||
      q.includes('solo') ||
      q.includes('sólo') ||
      q.includes('súper breve')
    ) {
      return 'short';
    }

    // Detectar respuestas técnicas/largas (el usuario lo pide explícitamente)
    if (
      q.includes('técnico') ||
      q.includes('técnica') ||
      q.includes('profundo') ||
      q.includes('profunda') ||
      q.includes('detallado') ||
      q.includes('detallada') ||
      q.includes('detalladamente') ||
      q.includes('paso a paso') ||
      q.includes('explicación completa') ||
      q.includes('explicación detallada') ||
      q.includes('explicación técnica') ||
      q.includes('desde cero') ||
      q.includes('estructura') ||
      q.includes('completo') ||
      q.includes('completa') ||
      q.includes('enséñame') ||
      q.includes('enseñame') ||
      q.includes('investiga') ||
      q.includes('analiza') ||
      q.includes('análisis') ||
      q.includes('arquitectura') ||
      q.includes('cómo funciona') ||
      q.includes('como funciona') ||
      q.includes('funcionamiento') ||
      q.includes('implementación') ||
      q.includes('implementacion')
    ) {
      return 'technical';
    }

    // Por defecto: respuesta corta (2 frases máximo)
    return 'default';
  }

  /**
   * Normaliza la pregunta del usuario para corregir problemas de pronunciación de Alexa
   * Convierte "punto j s" → "js", "node punto j s" → "node.js", etc.
   * @param question - Pregunta a normalizar
   * @returns Pregunta normalizada
   */
  private normalizeQuestion(question: string): string {
    let normalized = question.toLowerCase().trim();

    // Normalizar pronunciaciones comunes de tecnologías
    normalized = normalized
      .replace(/\bpunto j s\b/g, 'js')
      .replace(/\bpunto js\b/g, '.js')
      .replace(/\bj s\b/g, 'js')
      .replace(/\bpunto\s+/g, '.')
      .replace(/\s+punto\b/g, '.')
      .replace(/\bpunto\b/g, '.');

    // Normalizar nombres de tecnologías comunes
    normalized = normalized
      .replace(/\bnode punto j s\b/g, 'node.js')
      .replace(/\bnode j s\b/g, 'node.js')
      .replace(/\breact punto j s\b/g, 'react.js')
      .replace(/\bvue punto j s\b/g, 'vue.js')
      .replace(/\bangular punto j s\b/g, 'angular.js')
      .replace(/\btypescript\b/g, 'typescript')
      .replace(/\bjavascript\b/g, 'javascript');

    // Limpiar espacios múltiples
    normalized = normalized.replace(/\s{2,}/g, ' ').trim();

    return normalized;
  }

  /**
   * Limita la longitud del texto para que sea adecuado para voz (45-60 segundos)
   * Aproximadamente 300-400 palabras o 2000 caracteres
   * @param text - Texto a limitar
   * @returns Texto limitado
   */
  private limitForVoice(text: string, maxChars: number = 2000): string {
    if (text.length <= maxChars) {
      return text;
    }

    // Truncar en el último punto, signo de interrogación o exclamación antes del límite
    const truncated = text.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    const lastExclamation = truncated.lastIndexOf('!');
    
    const lastPunctuation = Math.max(lastSentence, lastQuestion, lastExclamation);
    
    if (lastPunctuation > maxChars * 0.7) {
      // Si encontramos puntuación cerca del límite, cortar ahí
      return truncated.substring(0, lastPunctuation + 1) + ' ¿Deseas que continúe?';
    }

    // Si no, cortar en el último espacio
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.8) {
      return truncated.substring(0, lastSpace) + '... ¿Deseas que continúe?';
    }

    return truncated + '...';
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
      // Normalizar la pregunta antes de procesarla
      const normalizedQuestion = this.normalizeQuestion(askDto.question);
      this.logger.log(`Pregunta original: ${askDto.question.substring(0, 50)}...`);
      this.logger.log(`Pregunta normalizada: ${normalizedQuestion.substring(0, 50)}...`);

      // Detectar modo de respuesta usando la pregunta normalizada
      const responseMode = this.detectResponseMode(normalizedQuestion);
      this.logger.debug(`Modo de respuesta detectado: ${responseMode}`);

      // Ajustar tokens según el modo de respuesta
      let maxTokensForRequest = this.maxTokens;
      if (responseMode === 'short') {
        maxTokensForRequest = 100; // Una frase corta
      } else if (responseMode === 'technical') {
        maxTokensForRequest = 1024; // Respuesta técnica detallada
      } else {
        maxTokensForRequest = 250; // Default: 2 frases
      }

      // Ajustar el prompt del sistema según el modo
      let systemPrompt = JARVIS_SYSTEM_PROMPT;

      if (responseMode === 'short') {
        systemPrompt += `

INSTRUCCIÓN ESPECÍFICA: Responde en UNA SOLA FRASE clara, directa y concisa. Máximo 20 palabras. Sin explicaciones adicionales.
`;
      } else if (responseMode === 'technical') {
        systemPrompt += `

INSTRUCCIÓN ESPECÍFICA: Responde de forma técnica, estructurada y detallada. Usa ejemplos si es posible. Organiza la información de manera clara y lógica. Puedes incluir conceptos técnicos, arquitectura, implementación y mejores prácticas.
`;
      } else {
        // Modo default: 2 frases máximo
        systemPrompt += `

INSTRUCCIÓN ESPECÍFICA: Responde en MÁXIMO 2 FRASES claras y directas. Sé conciso pero completo. NO des listas largas ni explicaciones extensas.
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
          content: normalizedQuestion,
        },
      ];

      // Llamar a la API de Groq con tokens ajustados
      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        temperature: this.temperature,
        max_tokens: maxTokensForRequest,
        top_p: this.topP,
        stream: false,
      });

      // Extraer la respuesta del modelo
      let answer =
        chatCompletion.choices[0]?.message?.content ||
        'No se pudo generar una respuesta.';

      // Sanitizar respuesta para Alexa (eliminar markdown, formatear para voz)
      answer = this.sanitizeForAlexa(answer);

      // Limitar longitud para voz (45-60 segundos ≈ 2000 caracteres)
      answer = this.limitForVoice(answer, 2000);

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
      // Normalizar la pregunta antes de procesarla
      const normalizedQuestion = this.normalizeQuestion(askDto.question);
      this.logger.log(`Procesando pregunta con streaming: ${normalizedQuestion.substring(0, 50)}...`);

      // Detectar modo de respuesta para streaming también
      const responseMode = this.detectResponseMode(normalizedQuestion);
      let systemPrompt = JARVIS_SYSTEM_PROMPT;

      if (responseMode === 'short') {
        systemPrompt += '\n\nResponde en una sola frase clara, directa y concisa. Máximo 20 palabras.';
      }

      if (responseMode === 'technical') {
        systemPrompt += '\n\nResponde de forma técnica, estructurada y detallada. Usa ejemplos si es posible.';
      }

      // Normalizar pregunta para streaming también
      const normalizedQuestion = this.normalizeQuestion(askDto.question);

      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: normalizedQuestion,
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

