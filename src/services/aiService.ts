import OpenAI from 'openai';

const GROK_API_KEY = (process.env.GROK_API_KEY || (import.meta as any).env.VITE_GROK_API_KEY || '').trim();

const openai = new OpenAI({
  apiKey: GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
  dangerouslyAllowBrowser: true
});

const DEFAULT_MODEL = 'grok-2-latest'; // Fallback to stable model for suggestions
const REASONING_MODEL = 'grok-beta'; // Fallback for general chat

export const generateAIResponse = async (message: string) => {
  if (!GROK_API_KEY || GROK_API_KEY.length < 10) {
    return 'Grok API key is missing or invalid. Please check your Builder Settings (⚙️).';
  }

  try {
    // Try the latest reasoning model requested by the user
    const response = await openai.chat.completions.create({
      model: 'grok-beta', // Using grok-beta/grok-2-latest as x.ai usually aliases reasoning here or uses it for general chat
      messages: [
        { role: 'user', content: message }
      ],
    });

    return response.choices[0].message.content || 'AI could not generate a response.';
  } catch (error: any) {
    console.error('Grok API Error:', error);
    
    if (error.status === 401 || error.status === 400) {
      return `API Key Error: The key you provided appears to be invalid for x.ai. Please ensure you are using a Grok key starting with 'xai-'. (Current prefix: ${GROK_API_KEY.slice(0, 3)}...)`;
    }
    
    return `AI Error: ${error.message || 'Unknown error'}`;
  }
};

export const generateReplySuggestions = async (lastMessage: string) => {
  if (!GROK_API_KEY) return [];

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a chat assistant. Generate 3 short, natural, one-line reply suggestions for the given message. Return only the suggestions separated by |.' 
        },
        { role: 'user', content: lastMessage }
      ],
    });

    const content = response.choices[0].message.content || '';
    return content.split('|').map(s => s.trim()).filter(s => s.length > 0).slice(0, 3);
  } catch (error) {
    console.error('Grok API Error:', error);
    return [];
  }
};
