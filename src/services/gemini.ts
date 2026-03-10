import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

export interface Citation {
  title: string;
  uri: string;
}

export interface ChatResponse {
  text: string;
  citations: Citation[];
  keyTerms?: { term: string; definition: string }[];
}

export interface FileData {
  mimeType: string;
  data: string;
  name?: string;
}

export async function* askOharaStream(
  prompt: string, 
  history: { role: 'user' | 'model', parts: any[] }[] = [],
  fileData?: FileData
) {
  if (!API_KEY) {
    throw new Error("Chiave API Gemini mancante. Se sei su Netlify, assicurati di aver impostato GEMINI_API_KEY nelle variabili d'ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const systemInstruction = `You are OHARA, a high-speed research AI. 
Be concise but rigorous. Use LaTeX for formulas. 
If a file or image is provided, analyze it thoroughly.
Structure: # [Title]\n[Explanation]\n## SOURCES\n- [Title](URL)`;

  yield { text: "", citations: [], done: false };

  const userParts: any[] = [];
  if (prompt.trim() !== "") {
    userParts.push({ text: prompt });
  }
  
  if (fileData) {
    userParts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
    // If no text prompt was provided with the file, add a default one
    if (prompt.trim() === "") {
      userParts.push({ text: "Analizza questo file o immagine in dettaglio." });
    }
  }

  if (userParts.length === 0) {
    userParts.push({ text: "Ciao!" });
  }

  // Detect URLs for urlContext
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = prompt.match(urlRegex);
  
  const tools: any[] = [];
  // Only use googleSearch if there is a text prompt and NO file (to avoid conflicts)
  if (prompt.trim() !== "" && !prompt.toLowerCase().includes("analizza questo file") && !fileData) {
    tools.push({ googleSearch: {} });
  }
  
  if (urls && urls.length > 0) {
    tools.push({ urlContext: {} });
  }

  // Ensure history doesn't end with a 'user' message to maintain alternating roles
  const cleanHistory = [...history];
  const finalUserParts = [...userParts];
  
  if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
    const lastUser = cleanHistory.pop();
    if (lastUser && lastUser.parts) {
      finalUserParts.unshift(...lastUser.parts);
    }
  }

  try {
    const modelName = "gemini-3-flash-preview";
    let responseStream;
    
    try {
      responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: [...cleanHistory, { role: 'user', parts: finalUserParts }],
        config: { 
          systemInstruction, 
          tools: tools.length > 0 ? tools : undefined,
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });
    } catch (toolError: any) {
      console.warn("Retrying without tools due to error:", toolError);
      // Fallback: try without tools if the error might be tool-related
      responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: [...cleanHistory, { role: 'user', parts: finalUserParts }],
        config: { 
          systemInstruction, 
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });
    }

    let fullText = "";
    let citations: Citation[] = [];

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
      }
      
      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((c: any) => {
          if (c.web && !citations.find(existing => existing.uri === c.web.uri)) {
            citations.push({ title: c.web.title, uri: c.web.uri });
          }
        });
      }
      yield { text: fullText, citations, done: false };
    }
    yield { text: fullText, citations, done: true };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("La chiave API Gemini non è valida. Controlla di averla copiata correttamente su Netlify.");
    }
    if (error.message?.includes("quota")) {
      throw new Error("Hai esaurito la quota gratuita di Gemini. Riprova tra un minuto.");
    }
    throw error;
  }
}

export async function extractGlossaryTerms(text: string): Promise<{ term: string; definition: string }[]> {
  if (!API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Extract up to 5 key scientific terms from this text and provide a 1-sentence definition for each. Format as JSON array of objects with 'term' and 'definition'. Text: ${text}` }] }],
      config: { 
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

export interface Discovery {
  title: string;
  summary: string;
  source: string;
  abstract?: string;
  fullTextUrl?: string;
}

export async function getDailyDiscoveries(): Promise<Discovery[]> {
  if (!API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const topics = ["Physics", "Chemistry", "Biology", "Quantum", "Space", "Medicine", "Materials", "Energy"];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  const prompt = `Search Google for the 10 most recent and significant scientific breakthroughs or papers published in the last 48 hours (Current time: ${new Date().toISOString()}). Focus on: ${randomTopic}.
  MANDATORY: Use the googleSearch tool.
  SOURCES: APS (Physical Review), ACS, Nature, Science, Cell, arXiv.
  Return EXACTLY 10 results in a JSON array. 
  Each object MUST have: title, summary (2-3 sentences), source (e.g., "Nature"), abstract (longer description), and fullTextUrl.
  JSON ONLY, no other text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
        maxOutputTokens: 3000,
      },
    });
    
    const text = response.text?.trim() || "[]";
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const results = JSON.parse(jsonStr);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Error in getDailyDiscoveries:", error);
    return [];
  }
}

export async function searchDiscoveries(query: string): Promise<Discovery[]> {
  if (!API_KEY || !query.trim()) return [];
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Search Google for scientific papers or discoveries related to: "${query}".
  MANDATORY: Use the googleSearch tool to find REAL papers from APS, ACS, Nature, Science, or arXiv.
  If this is a specific paper title, find that exact paper.
  Return up to 10 results in a JSON array.
  Each object MUST have: title, summary, source, abstract, and fullTextUrl.
  JSON ONLY, no other text.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        maxOutputTokens: 3000,
      },
    });
    
    const text = response.text?.trim() || "[]";
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const results = JSON.parse(jsonStr);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Error in searchDiscoveries:", error);
    return [];
  }
}
