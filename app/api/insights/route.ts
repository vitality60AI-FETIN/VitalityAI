import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const body = await req.json();
    const { prompt, patients, logs, mode } = body;

    let systemInstruction = "";
    
    if (mode === "chat") {
      systemInstruction = `Você é um analista de dados especialista em saúde geriátrica atuando em asilos.
Sua tarefa é analisar métricas biomecânicas e nutricionais diárias de idosos.

Regras (Guidelines):
1. Seja direto e objetivo.
2. Não dê diagnósticos médicos, apenas aponte pontos de atenção baseados nos dados.
3. Se fizer uma pergunta sobre algum paciente específico, cite o paciente utilizando os dados fornecidos.
4. Se o assunto for fora dos dados, siga as mesmas regras de tom (direto, sem diagnóstico médico).`;
    } else {
      systemInstruction = `Você é um analista de dados especialista em saúde geriátrica atuando em asilos.
Sua tarefa é analisar métricas biomecânicas e nutricionais diárias de idosos.

Regras (Guidelines):
1. Seja direto e objetivo.
2. Não dê diagnósticos médicos, apenas aponte pontos de atenção baseados nos dados.
3. Retorne a resposta estritamente no formato JSON, com as exatas chaves: "resumo_geral" (string), "pontos_atencao" (lista de strings) e "recomendacoes_rotina" (lista de strings).`;
    }

    let finalPrompt = prompt || "Analise os dados dos pacientes e logs e gere o relatório.";
    
    if (patients || logs) {
      finalPrompt += `\n\nDados dos Pacientes:\n${JSON.stringify(patients)}\n\nLogs Recentes:\n${JSON.stringify(logs)}`;
    }

    const config: any = {
      systemInstruction,
    };

    if (mode !== "chat") {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          resumo_geral: { type: Type.STRING },
          pontos_atencao: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          recomendacoes_rotina: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["resumo_geral", "pontos_atencao", "recomendacoes_rotina"]
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
      config
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error('Error with Gemini API:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar insight' }, { status: 500 });
  }
}
