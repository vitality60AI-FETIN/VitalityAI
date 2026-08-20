import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ─── Timestamp → string legível ───
function fmtTs(ts: any): string {
  if (!ts) return "";
  try {
    if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleDateString('pt-BR');
    const sec = ts.seconds ?? ts._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000).toLocaleDateString('pt-BR');
    if (typeof ts === 'string') { const d = new Date(ts); if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR'); }
  } catch { /* */ }
  return "";
}

// ─── SYSTEM INSTRUCTIONS ───
const REPORT_INSTRUCTION = `# VITALITY AI — Motor de Sumarização Clínica
Workflow de passo único. Latência é prioridade máxima.

REGRAS:
1. Baseie-se EXCLUSIVAMENTE nos logs fornecidos. Não invente dados.
2. Zero filler — sem saudações, sem introduções, sem justificativas.
3. Se não houver logs, informe ausência de registros e retorne arrays vazios.

Retorne JSON conforme o schema fornecido.`;

const CHAT_INSTRUCTION = `Você é uma IA analista de saúde geriátrica do Vitality AI. Auxilia cuidadores interpretando dados de idosos em ILPIs.

REGRAS:
1. NÃO é médico. Nunca diagnostique ou prescreva.
2. Baseie-se EXCLUSIVAMENTE nos dados fornecidos. Nunca invente.
3. Se não há registro de hoje, diga claramente.
4. Cite nome do paciente, data e valor exato do dado.
5. Tom acolhedor, claro, sem jargões.
6. Use Markdown: seções com ##, listas com -, **negrito** para destaques.
7. Máximo 400 palavras.`;

export async function POST(req: Request) {
  try {
    // ─── AUTH ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    // ─── RATE LIMIT ───
    const rl = checkRateLimit(decodedToken.uid, { maxRequests: RATE_LIMIT_MAX_REQUESTS, windowMs: RATE_LIMIT_WINDOW_MS });
    if (!rl.allowed) {
      const retry = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Limite excedido. Tente em ${retry}s.`, retryAfter: retry },
        { status: 429, headers: { 'Retry-After': String(retry) } }
      );
    }

    // ─── PARSE BODY ───
    const body = await req.json();
    const { prompt, patients, logs, mode } = body;
    const isChat = mode === "chat";

    // ─── DADOS COMPACTOS ───
    const hoje = new Date().toLocaleDateString('pt-BR');
    const pacientesMin = (patients || []).map((p: any) => `${p.nome || "?"} (${p.idade || "?"}a)`);
    const logsMin = (logs || []).slice(0, 50).map((l: any) => {
      const nome = (patients || []).find((p: any) => p.id === l.pacienteId)?.nome || l.pacienteId || "?";
      return `${nome}|${l.tipoLabel || l.tipo || "?"}|${l.status || "?"}|${fmtTs(l.dataHora) || l.dataTurno || "?"}`;
    });

    // ─── PROMPT ───
    let finalPrompt: string;
    if (isChat) {
      finalPrompt = prompt || "Analise os dados.";
      finalPrompt += `\n\nDATA ATUAL: ${hoje}\nPACIENTES: ${pacientesMin.join(", ")}\nLOGS:\n${logsMin.join("\n")}`;
    } else {
      finalPrompt = `DATA:${hoje}\nPACIENTES:${pacientesMin.join(",")}\nLOGS:\n${logsMin.join("\n")}`;
    }

    // ─── CONFIG ───
    const config: Record<string, unknown> = {
      systemInstruction: isChat ? CHAT_INSTRUCTION : REPORT_INSTRUCTION,
    };

    if (!isChat) {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          resumo_turno: { type: Type.STRING },
          sinais_alerta: { type: Type.ARRAY, items: { type: Type.STRING } },
          acoes_pendentes: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["resumo_turno", "sinais_alerta", "acoes_pendentes"]
      };
    }

    // ─── CALL AI ───
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: finalPrompt,
      config
    });

    const responseText = response.text ?? "";
    console.log("[Vitality AI] response.text:", responseText.substring(0, 300));

    if (!isChat) {
      const aiResult = responseText ? JSON.parse(responseText) : {};
      // Mapear para formato compatível com o frontend existente (AIReport)
      const report = {
        resumo_geral: aiResult.resumo_turno || "Sem dados disponíveis.",
        pontos_atencao: aiResult.sinais_alerta || [],
        recomendacoes_rotina: (aiResult.acoes_pendentes || []).length > 0
          ? [{ paciente: "Geral", data_referencia: new Date().toLocaleDateString('pt-BR'), acoes: aiResult.acoes_pendentes }]
          : [],
      };
      return NextResponse.json({ result: JSON.stringify(report) });
    }

    return NextResponse.json({ result: responseText });
  } catch (error: unknown) {
    console.error('Gemini API error:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao gerar insight';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
