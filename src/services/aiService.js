import { openai } from "../config/ai.js";
import { createHttpError } from "../utils/httpError.js";

const SYSTEM_PROMPT = `
Eres un tutor educativo de ClassManager para estudiantes.
Tu objetivo es ayudar al estudiante a aprender sin entregar la respuesta final.

Reglas obligatorias:
- No escribas soluciones finales listas para copiar.
- No resuelvas ejercicios completos cuando el estudiante pida "la respuesta", "hazlo", "resuelvelo" o algo similar.
- Explica conceptos, propone pasos, da pistas, preguntas guia y ejemplos parecidos, pero no identicos a la tarea.
- Trabaja de forma socratica: da un paso o una pista por turno y luego invita al estudiante a intentar ese paso.
- Si el estudiante no ha intentado resolver, no avances a toda la solucion; pide primero un intento corto o el siguiente paso que cree correcto.
- Si el estudiante comparte un intento parcial, corrige solo lo necesario y despues pide que continue por su cuenta.
- Si el estudiante insiste en que le des la respuesta final, rechaza con amabilidad y redirige a un siguiente paso concreto.
- Si el estudiante comparte un intento, revisalo y orientalo con retroalimentacion concreta.
- Manten un tono amable, claro y breve.
- Responde siempre en espanol.
- Cuando falte contexto, pide el enunciado o el intento del estudiante.
- Tu meta es acompanar hasta que el estudiante llegue por si mismo a la respuesta.
`;

const normalizeMessages = (messages = []) =>
  (Array.isArray(messages) ? messages : [])
    .filter((message) => ["user", "assistant"].includes(message?.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content ?? "").slice(0, 1200),
    }))
    .slice(-8);

const buildLocalTutorReply = (message) => {
  const lower = String(message ?? "").toLowerCase();

  if (lower.includes("respuesta") || lower.includes("hazme") || lower.includes("resuelv")) {
    return "No te voy a dar la respuesta final, pero si te ayudo a sacarla. Primero dime que te pide exactamente el ejercicio y cual crees que seria el primer paso.";
  }

  if (lower.includes("conclusion")) {
    return "Para construir la conclusion, retoma tu idea principal, menciona la evidencia mas importante y cierra explicando que aprendiste. Escribe una version corta con tus palabras y te digo como mejorarla.";
  }

  if (lower.includes("introduccion") || lower.includes("inicio")) {
    return "Empieza presentando el tema, el objetivo de la tarea y la idea que vas a defender. Escribe una primera frase de introduccion y te ayudo a pulirla.";
  }

  if (lower.includes("metodo") || lower.includes("procedimiento")) {
    return "Explica el procedimiento por pasos: que hiciste primero, que criterio usaste y por que. Dime cual seria tu paso 1 y revisamos si vas bien.";
  }

  return "Te ayudo sin resolverte la tarea completa. Empecemos asi: 1) que te piden, 2) que datos tienes, 3) cual crees que es el primer paso. Escríbeme tu intento y avanzamos desde ahi.";
};

export const generateTutorReply = async ({ message, messages = [] }) => {
  const cleanMessage = String(message ?? "").trim();
  if (!cleanMessage) {
    throw createHttpError(400, "Escribe una duda para poder ayudarte.");
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildLocalTutorReply(cleanMessage);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.45,
      max_tokens: 450,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...normalizeMessages(messages),
        { role: "user", content: cleanMessage.slice(0, 1200) },
      ],
    });

    return completion.choices?.[0]?.message?.content?.trim() || buildLocalTutorReply(cleanMessage);
  } catch (error) {
    console.error("Error al llamar OpenAI:", error.message);
    return buildLocalTutorReply(cleanMessage);
  }
};

const ADMIN_SYSTEM_PROMPT = `
Eres el asistente institucional de ClassManager para administradores.
Puedes responder sin las restricciones pedagogicas del modo estudiante.

Reglas:
- Responde en espanol.
- Se claro, util y directo.
- Puedes redactar respuestas completas, propuestas, resúmenes, mensajes, analisis y explicaciones.
- Si el modo solicitado es "profesor", responde como apoyo docente.
- Si el modo solicitado es "estudiante", responde como si estuvieras simulando una consulta de estudiante, pero sin la restriccion de ocultar respuestas finales.
- Si falta contexto, pide solo lo necesario.
`;

export const generateAdminReply = async ({
  message,
  messages = [],
  mode = "profesor",
}) => {
  const cleanMessage = String(message ?? "").trim();
  const normalizedMode = String(mode || "profesor").toLowerCase();

  if (!cleanMessage) {
    throw createHttpError(400, "Escribe una pregunta para probar el asistente.");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw createHttpError(
      503,
      "La IA del panel admin no esta configurada. Agrega OPENAI_API_KEY y reinicia el servidor.",
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `${ADMIN_SYSTEM_PROMPT}\nModo actual: ${normalizedMode}.`,
        },
        ...normalizeMessages(messages),
        { role: "user", content: cleanMessage.slice(0, 1400) },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw createHttpError(
        502,
        "La IA no devolvio contenido para el panel admin. Intenta de nuevo.",
      );
    }

    return reply;
  } catch (error) {
    console.error("Error al llamar OpenAI en modo admin:", error.message);
    if (error?.status && error?.message) {
      throw error;
    }

    throw createHttpError(
      502,
      "No se pudo obtener respuesta de OpenAI para el panel admin. Revisa la API key, el modelo y el servidor.",
    );
  }
};

const TEACHER_SYSTEM_PROMPT = `
Eres el asistente docente de ClassManager.
Tu funcion es ayudar a profesores a planear, revisar y comunicar mejor.

Reglas:
- Responde siempre en espanol.
- Puedes redactar respuestas completas y utilizables.
- Ayuda con rubricas, retroalimentacion, preguntas de defensa, mensajes para estudiantes, planeacion breve, criterios de evaluacion y mejora de actividades.
- Si el profesor comparte una entrega o una idea, ofrece analisis practico y accionable.
- Si falta contexto, pide solo lo necesario.
- Manten un tono claro, profesional y util.
`;

const buildLocalTeacherReply = (message) => {
  const lower = String(message ?? "").toLowerCase();

  if (lower.includes("rubrica") || lower.includes("rúbrica")) {
    return "Puedo ayudarte con una rubrica. Dime la tarea, los criterios que quieres evaluar y la escala que usas, por ejemplo de 1 a 5 o de bajo a alto.";
  }

  if (lower.includes("retroaliment") || lower.includes("feedback")) {
    return "Puedo redactar una retroalimentacion docente clara. Enviame el trabajo del estudiante o un resumen de sus fortalezas y errores, y te propongo un comentario listo para usar.";
  }

  if (lower.includes("preguntas") || lower.includes("defensa")) {
    return "Puedo generar preguntas de defensa. Dime el tema o pega la entrega del estudiante y te propongo preguntas para validar comprension.";
  }

  if (lower.includes("mensaje") || lower.includes("aviso")) {
    return "Puedo redactar un mensaje para tu grupo o para un estudiante. Dime el objetivo, el tono y los puntos clave que quieres incluir.";
  }

  return "Puedo apoyarte como docente con rubricas, comentarios, preguntas de defensa, planeacion breve y mensajes para estudiantes. Escribe lo que necesitas y te propongo una version util.";
};

export const generateTeacherReply = async ({ message, messages = [] }) => {
  const cleanMessage = String(message ?? "").trim();
  if (!cleanMessage) {
    throw createHttpError(400, "Escribe una consulta para el asistente docente.");
  }

  if (!process.env.OPENAI_API_KEY) {
    return buildLocalTeacherReply(cleanMessage);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.55,
      max_tokens: 500,
      messages: [
        { role: "system", content: TEACHER_SYSTEM_PROMPT },
        ...normalizeMessages(messages),
        { role: "user", content: cleanMessage.slice(0, 1400) },
      ],
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      buildLocalTeacherReply(cleanMessage)
    );
  } catch (error) {
    console.error("Error al llamar OpenAI en modo docente:", error.message);
    return buildLocalTeacherReply(cleanMessage);
  }
};
