import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // Tenta obter a chave de variáveis de ambiente do Vite (VITE_API_KEY) ou Node (API_KEY)
  // @ts-ignore - Ignora erro de tipo se import.meta não existir em alguns ambientes
  const apiKey = import.meta.env?.VITE_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API_KEY not found. Please set VITE_API_KEY in your .env file.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const askAiTutor = async (question: string, subject: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Erro: Chave de API não configurada. Por favor, configure a VITE_API_KEY no arquivo .env.";

  try {
    const model = "gemini-2.5-flash";
    const systemInstruction = `Você é um tutor especialista em concursos públicos no Brasil. 
    O aluno está estudando: ${subject}.
    Responda de forma didática, concisa e motivadora. 
    Se a pergunta for sobre legislação, cite o artigo relevante se possível.`;

    const response = await ai.models.generateContent({
      model,
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Desculpe, não consegui processar sua dúvida no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao conectar com o Tutor IA.";
  }
};