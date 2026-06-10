import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const body = await req.json();
    const { prompt, patients, logs } = body;

    const systemInstruction = `Você é um analista de dados especialista em saúde geriátrica atuando em asilos.
Sua tarefa é analisar métricas biomecânicas e nutricionais diárias de idosos.

Regras (Guidelines):
1. Seja direto e objetivo.
2. Não dê diagnósticos médicos, apenas aponte pontos de atenção baseados nos dados.
3. Retorne a resposta estritamente no formato JSON, com as exatas chaves: "resumo_geral" (string), "pontos_atencao" (lista de strings) e "recomendacoes_rotina" (lista de strings).`;

    let finalPrompt = prompt || "Analise os dados dos pacientes e logs e gere o relatório.";
    
    if (patients || logs) {
      finalPrompt += `\n\nDados dos Pacientes:\n${JSON.stringify(patients)}\n\nLogs Recentes:\n${JSON.stringify(logs)}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error('Error with Gemini API:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar insight' }, { status: 500 });
  }
}
