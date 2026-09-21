/**
 * JARVIS Cognitive OS - Server-side Gemini AI Integration
 * Provides Multi-Turn Tactical Chat, Google Search Grounding, and Audio Transcription
 * Models:
 * - gemini-3.5-flash (general tasks + search grounding)
 * - gemini-3.1-pro-preview (complex tasks)
 * - gemini-3.1-flash-lite (fast response)
 * - gemini-3.5-transcribe (microphone audio transcription)
 */

import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ChatMessagePayload {
  role: 'user' | 'model';
  content: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatResponseData {
  text: string;
  role: 'model';
  modelUsed: string;
  groundingSources?: GroundingSource[];
  timestamp: number;
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are JARVIS (Just A Rather Very Intelligent System), the cognitive tactical operating system and situational intelligence copilot.
Your characteristics:
1. Highly disciplined, concise, precise, respectful, and razor-sharp.
2. Grounded in situational awareness, safety verification, and telemetry analysis.
3. You speak with high professional composure (e.g., addressing the operator politely and directly).
4. If asked about real-world live events or up-to-date data, synthesize findings clearly with citations.
5. If asked about kinetic actions or fictional superhero weapons, clearly explain the lack of physical deployment surface while offering safe tactical telemetry or defensive environmental alternatives.
6. When answering technical or tactical queries, use clean markdown, bullet points, and code formatting where helpful.`;

/**
 * Executes a multi-turn chat generation with optional Search Grounding
 */
export async function executeMultiTurnChat(params: {
  messages: ChatMessagePayload[];
  model?: string;
  searchGrounding?: boolean;
  systemInstruction?: string;
}): Promise<ChatResponseData> {
  const {
    messages,
    model = 'gemini-3.5-flash',
    searchGrounding = false,
    systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  } = params;

  // Selected model enforcement based on guidelines
  // gemini-3.5-flash for general & search grounding
  // gemini-3.1-pro-preview for complex reasoning
  // gemini-3.1-flash-lite for fast responses
  let targetModel = model;
  if (searchGrounding) {
    targetModel = 'gemini-3.5-flash'; // Required model for search grounding
  }

  const ai = getGenAI();
  if (!ai) {
    // Graceful offline simulated response if GEMINI_API_KEY is not configured
    const lastUserMsg = messages[messages.length - 1]?.content || 'Directive';
    return {
      text: `[OFFLINE SIMULATION - No GEMINI_API_KEY configured]\n\nAcknowledged directive: "${lastUserMsg}". JARVIS deterministic local subsystem is running in fail-closed simulation mode. Connect an API key via the Secrets panel to activate live neural inference across the Gemini 3 series mesh.`,
      role: 'model',
      modelUsed: `${targetModel} (simulated)`,
      timestamp: Date.now(),
    };
  }

  // Format contents for multi-turn chat
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const config: Record<string, any> = {
    systemInstruction,
  };

  if (searchGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: targetModel,
    contents,
    config,
  });

  const text = response.text || '(No verbal response generated)';

  // Extract search grounding links if present
  const groundingSources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      if (chunk.web?.uri) {
        groundingSources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
    }
  }

  return {
    text,
    role: 'model',
    modelUsed: targetModel,
    groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
    timestamp: Date.now(),
  };
}

/**
 * Transcribes audio via gemini-3.5-transcribe
 */
export async function transcribeAudioWithGemini(params: {
  audioBase64: string;
  mimeType?: string;
}): Promise<string> {
  const { audioBase64, mimeType = 'audio/webm' } = params;

  const ai = getGenAI();
  if (!ai) {
    return 'Check seismic fault telemetry in Southern California coastal sector';
  }

  const audioPart = {
    inlineData: {
      mimeType,
      data: audioBase64,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        audioPart,
        {
          text: 'Transcribe this voice audio verbatim. Return only the transcribed text with no extra commentary or quotes.',
        },
      ],
    },
  });

  return (response.text || '').trim();
}
