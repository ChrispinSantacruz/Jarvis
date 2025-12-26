# JARVIS Backend

Backend profesional para asistente inteligente JARVIS, diseñado para integrarse con Amazon Alexa mediante una Custom Skill.

## 🎯 Características

- **Arquitectura limpia y modular** con NestJS y TypeScript
- **Integración con Groq** para modelos LLM avanzados
- **API REST** lista para recibir solicitudes desde Alexa
- **Personalidad definida** para JARVIS (técnica, precisa, elegante)
- **Preparado para producción** con manejo de errores y validación
- **Configuración flexible** mediante variables de entorno

## 📋 Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x o yarn >= 1.22.x
- Cuenta de Groq con API key

## 🚀 Instalación

1. **Clonar o navegar al proyecto:**
```bash
cd jarvis
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Copiar el archivo de ejemplo
cp env.example .env

# Editar .env y agregar tu API key de Groq
GROQ_API_KEY=tu_api_key_aqui
```

## ⚙️ Configuración

Edita el archivo `.env` con tus valores:

```env
# Groq API Configuration

# Server Configuration
PORT=3000
NODE_ENV=development

# Model Configuration
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=1
GROQ_MAX_TOKENS=1024
GROQ_TOP_P=1
```

## 🏃 Ejecución

### Desarrollo
```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### Producción
```bash
# Compilar
npm run build

# Ejecutar
npm run start:prod
```

## 📡 API Endpoints

### POST /jarvis/ask

Hacer una pregunta a JARVIS.

**Request:**
```json
{
  "question": "Explica cómo funciona un sistema de autenticación JWT",
  "conversationId": "optional-conversation-id",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "answer": "Un sistema de autenticación JWT (JSON Web Token) funciona mediante...",
  "conversationId": "optional-conversation-id",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "model": "llama-3.3-70b-versatile"
}
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3000/jarvis/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuál es la diferencia entre REST y GraphQL?"
  }'
```

### POST /jarvis/health

Health check del servicio.

**Response:**
```json
{
  "status": "ok",
  "service": "JARVIS Backend",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /alexa/webhook

Endpoint para recibir solicitudes de Amazon Alexa.

**Request (LaunchRequest):**
```json
{
  "version": "1.0",
  "session": {
    "sessionId": "amzn1.echo-api.session.test123",
    "application": {
      "applicationId": "amzn1.ask.skill.test123"
    },
    "new": true
  },
  "request": {
    "type": "LaunchRequest",
    "requestId": "amzn1.echo-api.request.test123",
    "timestamp": "2024-01-15T10:30:00Z",
    "locale": "es-ES"
  }
}
```

**Request (IntentRequest):**
```json
{
  "version": "1.0",
  "session": {
    "sessionId": "amzn1.echo-api.session.test123",
    "application": {
      "applicationId": "amzn1.ask.skill.test123"
    }
  },
  "request": {
    "type": "IntentRequest",
    "requestId": "amzn1.echo-api.request.test123",
    "timestamp": "2024-01-15T10:30:00Z",
    "locale": "es-ES",
    "intent": {
      "name": "AskJarvisIntent",
      "slots": {
        "question": {
          "value": "qué es inteligencia artificial"
        }
      }
    }
  }
}
```

**Response (formato SSML requerido por Alexa):**
```json
{
  "version": "1.0",
  "response": {
    "outputSpeech": {
      "type": "SSML",
      "ssml": "<speak>La inteligencia artificial es...</speak>"
    },
    "shouldEndSession": false
  }
}
```

**Nota importante:** Alexa requiere respuestas en formato SSML, no PlainText. El controlador automáticamente convierte todas las respuestas a SSML usando la función utilitaria `alexaSpeak()`.

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3000/alexa/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0",
    "request": {
      "type": "IntentRequest",
      "intent": {
        "name": "AskJarvisIntent",
        "slots": {
          "question": {
            "value": "qué es inteligencia artificial"
          }
        }
      }
    }
  }'
```

## 🏗️ Estructura del Proyecto

```
jarvis/
├── src/
│   ├── main.ts                 # Punto de entrada de la aplicación
│   ├── app.module.ts           # Módulo raíz de NestJS
│   ├── jarvis/
│   │   ├── jarvis.module.ts    # Módulo de JARVIS
│   │   ├── jarvis.controller.ts # Controlador REST
│   │   ├── jarvis.service.ts   # Lógica de negocio
│   │   ├── jarvis.prompt.ts    # Prompt del sistema
│   │   └── dto/
│   │       └── ask-jarvis.dto.ts # DTOs de request/response
│   ├── alexa/
│   │   ├── alexa.module.ts     # Módulo de Alexa
│   │   ├── alexa.controller.ts # Controlador de Alexa webhook
│   │   └── dto/
│   │       └── alexa-request.dto.ts # DTOs de solicitudes Alexa
├── examples/
│   ├── test-request.http       # Ejemplos de requests REST
│   └── alexa-test-request.http  # Ejemplos de requests Alexa
├── env.example                 # Ejemplo de variables de entorno
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Tecnologías Utilizadas

- **NestJS**: Framework Node.js para aplicaciones escalables
- **TypeScript**: Tipado estático
- **Groq SDK**: Cliente para modelos LLM
- **class-validator**: Validación de DTOs
- **@nestjs/config**: Gestión de variables de entorno

## 🎭 Personalidad de JARVIS

JARVIS está configurado con una personalidad específica:

- **Inteligente y técnico**: Respuestas precisas y estructuradas
- **Profesional**: Tono serio y elegante
- **Humor sutil**: Comentarios breves y elegantes cuando es apropiado
- **Claro y conciso**: Sin relleno, preferencia por la claridad
- **Orientado a ingeniería**: Especializado en software, arquitectura, IA, cloud

## 🔮 Integraciones

### ✅ Implementado

- **Amazon Alexa Custom Skill**: Endpoint `/alexa/webhook` listo para recibir requests
  - Soporta `LaunchRequest` e `IntentRequest`
  - Integrado con el servicio JARVIS
  - Respuestas en formato compatible con Alexa

### 🚀 Próximas Integraciones

- **Amazon Polly**: Síntesis de voz con voz masculina
- **SSML**: Respuestas con formato SSML para mejor pronunciación
- **Echo Show**: Soporte para respuestas con imágenes
- **Contexto conversacional**: Memoria de conversación entre sesiones
- **Autenticación**: Seguridad para endpoints públicos

## 🐛 Manejo de Errores

El servicio incluye:

- Validación automática de DTOs
- Manejo de errores de API de Groq
- Logging estructurado
- Respuestas de error claras

## 📝 Scripts Disponibles

```bash
npm run build          # Compilar TypeScript
npm run start          # Iniciar en modo producción
npm run start:dev      # Iniciar en modo desarrollo (watch)
npm run start:debug    # Iniciar en modo debug
npm run lint           # Ejecutar linter
npm run test           # Ejecutar tests
npm run test:watch     # Tests en modo watch
```

## 🚢 Despliegue

### Render

1. Conecta tu repositorio a Render
2. Configura las variables de entorno en el dashboard
3. Render detectará automáticamente el proyecto Node.js

### Railway

1. Conecta tu repositorio a Railway
2. Agrega las variables de entorno
3. Railway construirá y desplegará automáticamente

## 📄 Licencia

MIT

## 👨‍💻 Desarrollo

Este proyecto está diseñado para ingenieros de software senior. El código está comentado y sigue las mejores prácticas de NestJS y arquitectura limpia.

---

**JARVIS está listo para asistir.**

