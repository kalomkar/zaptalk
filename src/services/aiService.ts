import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = 'gemini-3-flash-preview';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const generateAIResponse = async (message: string, history: ChatMessage[] = [], personality?: string) => {
  if (!GEMINI_API_KEY) {
    return 'Assistant: Gemini AI not available (API key missing).';
  }

  const systemInstruction = `You are ZapTalk AI, a high-end messaging assistant. 
  Personality: ${personality || "Helpful, concise, and modern."}
  Style: Use emojis occasionally. Keep responses under 3 sentences unless asked for more.
  Context: Part of a real-time chat super-app.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || 'AI could not generate a response.';
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return `AI Error: ${error.message || 'Unknown error'}`;
  }
};

export const summarizeConversation = async (chatMessages: { text: string; sender: string }[]) => {
  if (!GEMINI_API_KEY) return 'Summary unavailable (API key missing).';

  const textToSummarize = chatMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
  const prompt = `Summarize the following chat conversation into 3 bullet points showing key takeaways and decisions made:\n\n${textToSummarize}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an expert summarizer. Be concise and professional.",
      }
    });
    return response.text || 'Could not summarize.';
  } catch (error: any) {
    return 'Error generating summary.';
  }
};

export const generateSmartReply = async (context: string) => {
  if (!GEMINI_API_KEY) return 'Reply generation unavailable.';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: `Based on the following message, generate 1 natural and clever reply:\n\n${context}` }] }],
      config: {
        systemInstruction: "Generate exactly one reply. No other text.",
      }
    });
    return response.text || 'No reply generated.';
  } catch (error) {
    return 'Error generating reply.';
  }
};

export const generateReplySuggestions = async (lastMessage: string) => {
  if (!GEMINI_API_KEY) return [];

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: "Generate exactly 3 short, natural reply suggestions. Return only the suggestions separated by | (pipe).",
      },
      contents: [{ role: 'user', parts: [{ text: lastMessage }] }],
    });

    const content = response.text || '';
    return content.split('|').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
  } catch (error) {
    return [];
  }
};
