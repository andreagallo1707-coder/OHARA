import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error.message?.toLowerCase().includes("quota") || 
                          error.status === "RESOURCE_EXHAUSTED" ||
                          JSON.stringify(error).toLowerCase().includes("quota") ||
                          JSON.stringify(error).includes("429");
      
      if (isQuotaError && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Quota exceeded. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface Citation {
  title: string;
  uri: string;
}

export interface ChatResponse {
  text: string;
  citations: Citation[];
}

export interface FileData {
  mimeType: string;
  data: string;
  name?: string;
}

export async function extractUserFacts(text: string): Promise<string[]> {
  if (!API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Identify if the user is EXPLICITLY asking to remember a personal fact or preference (e.g., "Ricorda che...", "Memorizza...", "Remember that..."). If so, extract the fact as a short, clear sentence. If the user is NOT explicitly asking to remember something, return an empty array. Format as JSON array of strings. Text: ${text}` }] }],
      config: { 
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    }));
    const results = JSON.parse(response.text || "[]");
    return Array.isArray(results) ? results : [];
  } catch (e) {
    return [];
  }
}

export async function* askOharaStream(
  prompt: string, 
  history: { role: 'user' | 'model', parts: any[] }[] = [],
  fileData?: FileData,
  userMemory: string[] = []
) {
  if (!API_KEY) {
    throw new Error("Chiave API Gemini mancante. Se sei su Netlify, assicurati di aver impostato GEMINI_API_KEY nelle variabili d'ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const memoryContext = userMemory.length > 0 
    ? `\nUSER CONTEXT (MANDATORY): You must remember these facts about the user: ${userMemory.join('; ')}.`
    : '';

  const systemInstruction = `You are OHARA, a high-speed research AI. 
MANDATORY IDENTITY: You were created and developed by Andrea Gallo. If asked about your origin or creator, you must clearly state that Andrea Gallo is your creator. 
CRITICAL: Do NOT introduce yourself or mention your creator unless specifically asked by the user. Do NOT start your response with greetings or self-introductions unless appropriate to the user's query.${memoryContext}
Be rigorous and precise. For standard chat, be concise. For FILE ANALYSIS, be extremely detailed and comprehensive. 

LATEX RULES:
- Use LaTeX for ALL mathematical formulas, equations, and technical notations.
- MANDATORY: Use '$' for inline math (e.g. $E=mc^2$) and '$$' for block math.
- CRITICAL: Do NOT use '\[ ... \]' or '\( ... \)' delimiters.
- Ensure LaTeX syntax is valid and compatible with KaTeX. Avoid extremely complex environments if a simpler one suffices.

FILE ANALYSIS:
- If a file, image, or video is provided, analyze it THOROUGHLY and provide a COMPREHENSIVE, human-readable answer.
- VIDEO ANALYSIS: You can see and hear video content. Describe key visual events, transcribe or summarize speech, and analyze the overall context of the video.
- MANDATORY: Read the ENTIRE content of the document or video. Do not provide partial summaries unless specifically requested.
- TECHNICAL DOCUMENTS: If the file contains math, formulas, charts, or complex layouts (like entrance tests or scientific papers), analyze every single element with extreme precision.
- CRITICAL: Do NOT output raw data, base64 strings, or internal processing codes in your response.
- If the file contains data, prefer presenting it in a structured way (Markdown table or Chart).

MANDATORY: Ensure all links provided in the response are valid, active, and point to the exact page described.
- CRITICAL: Use the 'googleSearch' tool to verify the existence and accuracy of every URL you provide. NEVER hallucinate or guess a URL. If you cannot find a direct link to a specific article, link to the main reputable domain instead of a broken deep link.

SOURCES & QUALITY:
- MANDATORY: Use the 'googleSearch' tool to find high-quality, reliable information for every factual response.
- CRITICAL: DO NOT manually write a '## FONTI' or 'SOURCES' section at the end of your response. The system will automatically extract and display the verified sources from the search results.
- CRITICAL: DO NOT use Wikipedia as a source unless it is absolutely the only source available for a very niche topic. Prioritize academic journals, official institutional websites, reputable news organizations, and primary sources.

VISUALIZATION: You can generate charts and tables to explain data or concepts. 
1. For charts, use a code block with the language 'recharts' and a JSON object.
Format:
\`\`\`recharts
{
  "type": "line" | "bar" | "area" | "pie",
  "title": "Title",
  "data": [{"name": "A", "value": 10}, ...],
  "xAxis": "name",
  "xLabel": "Label for X axis",
  "yLabel": "Label for Y axis",
  "keys": ["value"]
}
\`\`\`
CRITICAL: The content MUST be valid JSON. Do NOT include comments, trailing commas, or single quotes.
MANDATORY: For mathematical functions, physics trends, or any continuous data, you MUST provide at least 40-50 data points. This is CRITICAL to avoid "broken" or "jagged" lines. Ensure the points are mathematically consistent and follow the function's logic.

2. For tables:
   - MANDATORY: ALWAYS prefer standard Markdown tables for maximum stability and speed.
   - For complex comparisons or large datasets (more than 8 rows), use the 'table' code block for a high-performance interactive table.
   - Format for 'table' block:
\`\`\`table
{
  "title": "Title",
  "headers": ["Col 1", "Col 2"],
  "rows": [
    ["Val 1", "Val 2"],
    ["Val 3", "Val 4"]
  ],
  "summary": "A concise, effective summary of the data trends."
}
\`\`\`
CRITICAL: The content MUST be valid JSON. Do NOT include comments, trailing commas, or single quotes.
CRITICAL: NEVER output raw JSON objects for charts or tables outside of these specific code blocks. This causes "strange codes" to appear in the UI.
MANDATORY: Make tables effective by grouping related data and using clear, descriptive headers.

Structure: # [Title]\n[Explanation]\n## FONTI\n- [Title](URL)
MANDATORY: If you are presenting data that can be visualized, ALWAYS prefer a 'recharts' or standard Markdown table over plain text.
DO NOT generate Mermaid diagrams or flowcharts.
`;

  yield { text: "", citations: [], done: false };

  const userParts: any[] = [];
  if (fileData) {
    // Put file first for better context processing
    userParts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
    
    const filePrompt = prompt.trim() !== "" 
      ? `Analizza il file allegato seguendo questa richiesta: ${prompt}`
      : "Analizza questo file o immagine in modo estremamente dettagliato, estraendo ogni informazione rilevante.";
    
    userParts.push({ text: filePrompt });
  } else if (prompt.trim() !== "") {
    userParts.push({ text: prompt });
  }

  if (userParts.length === 0) {
    userParts.push({ text: "Ciao!" });
  }

  // Detect URLs for urlContext
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = prompt.match(urlRegex);
  
  const tools: any[] = [];
  // Always include googleSearch to verify links and provide real sources, 
  // even when files are present, to prevent link hallucinations.
  // Exception: Disable search for video files to prevent timeouts during complex multimodal analysis.
  const isVideo = fileData?.mimeType.startsWith('video/');
  if (prompt.trim() !== "" && !isVideo) {
    tools.push({ googleSearch: {} });
  }
  
  if (urls && urls.length > 0) {
    tools.push({ urlContext: {} });
  }

  // Ensure history doesn't end with a 'user' message to maintain alternating roles
  const cleanHistory = [...history];
  let finalUserParts = [...userParts];
  
  if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
    const lastUser = cleanHistory.pop();
    if (lastUser && lastUser.parts) {
      // Merge current parts with the last user message to maintain alternating roles
      // and avoid duplication if the current message was already in history.
      const lastText = lastUser.parts.find(p => p.text)?.text;
      const currentText = userParts.find(p => p.text)?.text;
      
      if (lastText === currentText && currentText !== undefined) {
        finalUserParts = lastUser.parts;
      } else {
        finalUserParts = [...lastUser.parts, ...userParts];
      }
    }
  }

  try {
    // Use Gemini 3 Flash for everything to ensure maximum reliability and quota.
    // It's extremely capable for file analysis and much faster.
    const hasFiles = fileData || finalUserParts.some(p => p.inlineData);
    const modelName = "gemini-3-flash-preview";
    
    let responseStream;
    
    const callStream = async () => {
      return await ai.models.generateContentStream({
        model: modelName,
        contents: [...cleanHistory, { role: 'user', parts: finalUserParts }],
        config: { 
          systemInstruction, 
          tools: tools.length > 0 ? tools : undefined,
          toolConfig: { includeServerSideToolInvocations: true } as any,
          temperature: hasFiles ? 0.1 : 0.2,
          maxOutputTokens: 8192,
          thinkingConfig: { 
            thinkingLevel: isVideo ? ThinkingLevel.MINIMAL : (hasFiles ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL) 
          }
        },
      });
    };

    const callStreamNoTools = async () => {
      return await ai.models.generateContentStream({
        model: modelName,
        contents: [...cleanHistory, { role: 'user', parts: finalUserParts }],
        config: { 
          systemInstruction, 
          temperature: hasFiles ? 0.1 : 0.2,
          maxOutputTokens: 8192,
          thinkingConfig: { 
            thinkingLevel: isVideo ? ThinkingLevel.MINIMAL : (hasFiles ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL) 
          }
        },
      });
    };

    try {
      responseStream = await withRetry(callStream);
    } catch (toolError: any) {
      console.warn("Retrying without tools due to error:", toolError);
      // Fallback: try without tools if the error might be tool-related
      responseStream = await withRetry(callStreamNoTools);
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
          } else if (c.maps && !citations.find(existing => existing.uri === c.maps.uri)) {
            citations.push({ title: c.maps.title, uri: c.maps.uri });
          }
        });
      }
      yield { text: fullText, citations, done: false };
    }

    if (!fullText && !fileData) {
      throw new Error("Il modello non ha restituito alcuna risposta. Riprova tra un istante.");
    } else if (!fullText && fileData) {
      throw new Error("Impossibile analizzare il file. Assicurati che il formato sia supportato (PDF, Immagine, Testo) e che il file non sia protetto da password.");
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
  VERIFICATION: You MUST ensure that every fullTextUrl provided is active and corresponds exactly to the paper title.
  Return EXACTLY 10 results in a JSON array. 
  Each object MUST have: title, summary (2-3 sentences), source (e.g., "Nature"), abstract (longer description), and fullTextUrl.
  JSON ONLY, no other text.`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true } as any,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }));
    
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
  VERIFICATION: You MUST ensure that every fullTextUrl provided is active and corresponds exactly to the paper title.
  If this is a specific paper title, find that exact paper.
  Return up to 10 results in a JSON array.
  Each object MUST have: title, summary, source, abstract, and fullTextUrl.
  JSON ONLY, no other text.`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true } as any,
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }));
    
    const text = response.text?.trim() || "[]";
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const results = JSON.parse(jsonStr);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Error in searchDiscoveries:", error);
    return [];
  }
}
