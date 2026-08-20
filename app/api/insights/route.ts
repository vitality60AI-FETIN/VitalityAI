import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ─── CASCATA DE MODELOS ───
// Ordem de prioridade: tenta o primeiro, se falhar (429/503/404) tenta o próximo
const MODEL_CASCADE = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// Erros que ativam o fallback para o próximo modelo
function shouldFallback(error: any): boolean {
  const msg = String(error?.message || error || "").toLowerCase();
  const status = error?.status || error?.code || 0;
  // Rate limit, quota exceeded, model unavailable, server overloaded
  return (
    status === 429 || status === 503 || status === 404 ||
    msg.includes('429') || msg.includes('503') || msg.includes('404') ||
    msg.includes('rate limit') || msg.includes('quota') ||
    msg.includes('resource exhausted') || msg.includes('overloaded') ||
    msg.includes('no longer available') || msg.includes('not found')
  );
}

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

// ─── SYSTEM INSTRUCTION CONVERSACIONAL ───
const CHAT_INSTRUCTION = `Você é o assistente inteligente do Vitality AI, especialista em suporte, fisiologia geriátrica e análise de saúde para cuidadores em ILPIs (Instituições de Longa Permanência para Idosos).
Sua função é analisar os dados de rotina dos residentes e responder às dúvidas da equipe com clareza, empatia e utilidade prática.

REGRAS DE CONDUTA & FORMATO:

1. ESTRUTURA DE "PLANO PERSONALIZADO":
   - Sempre que solicitado um plano, orientação, recomendação ou o "plano do [Nome do Residente]", apresente sob a estrutura de "## Plano Personalizado - [Nome do Residente]".
   - O plano DEVE ser prescritivo e acionável, cobrindo obrigatoriamente 4 pilares:
     a) 🏋️‍♂️ **Exercícios de Força & Equilíbrio**: Especifique a frequência (ex: 2–3x/semana) e tipos de exercícios adequados à mobilidade do residente (ex: treino de sentar-e-levantar, fortalecimento de quadríceps, treino de marcha guiada).
     b) 🥗 **Nutrição & Proteína (Combate à Sarcopenia)**: Recomendações focadas na prevenção da perda de massa muscular, sugerindo fracionamento proteico (ex: reforço proteico no café da manhã e lanches) e adequação de textura.
     c) 💧 **Meta de Hidratação**: Defina uma meta hídrica fracionada diária (ex: 1.5L a 2.0L/dia, fracionados em copos em horários estratégicos).
     d) 🛡️ **Protocolo de Segurança & Prevenção**: Ações específicas para evitar quedas, adaptar ambiente ou monitorar medicamentos e sinais vitais.

2. ELIMINAÇÃO DE REPETIÇÕES GENÉRICAS (PERFIL ÚNICO POR RESIDENTE):
   - NUNCA retorne planos genéricos ou frases idênticas para residentes diferentes (evite clichês como "incentivar atividades leves" ou "porções menores").
   - Cada idoso DEVE ter um plano estritamente individualizado com base no seu perfil (idade, gênero, restrições físicas, condições crônicas e falhas/alertas registrados nos logs recentes).
   - Se o idoso registrou recusa alimentar, enfatize estratégias nutricionais; se teve queda/dor, foque em força de membros inferiores e prevenção de acidentes; se teve insônia/cognitivo alterado, direcione para higiene do sono e estímulos cognitivos.

3. REGRAS GERAIS:
   - NÃO É MÉDICO: Nunca forneça diagnósticos definitivos ou prescrições farmacológicas. Em episódios graves (como quedas com trauma, febre persistente ou broncoaspiração), recomende avaliação médica imediata.
   - FIDELIDADE AOS DADOS: Baseie-se nos dados fornecidos no contexto. Se faltarem informações sobre determinado residente, avise claramente.
   - RASTREABILIDADE: Cite nome, idade e registros relevantes do histórico do idoso.
   - FORMATO: Responda em Português (Brasil) utilizando Markdown estruturado (títulos ##, listas -, negritos). Seja claro, direto e empático (máximo 450 palavras).`;

export async function POST(req: Request) {
  try {
    // ─── AUTH ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
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
    const { prompt, patients, logs } = body;

    // ─── DADOS COMPACTOS E ENRIQUECIDOS ───
    const hoje = new Date().toLocaleDateString('pt-BR');
    const pacientesMin = (patients || []).map((p: any) => `${p.nome || "?"} (${p.idade || "?"}a)`);
    const logsMin = (logs || []).slice(0, 60).map((l: any) => {
      const nome = (patients || []).find((p: any) => p.id === l.pacienteId)?.nome || l.pacienteId || "?";
      const data = fmtTs(l.dataHora) || l.dataTurno || "?";
      const tipo = l.tipoLabel || l.tipo || "?";
      const status = l.status || "?";
      const obs = l.detalhe || l.observacaoTurno || l.observacao || l.resumo || "";
      return obs ? `${nome} | ${tipo}: ${status} (${obs}) | Data: ${data}` : `${nome} | ${tipo}: ${status} | Data: ${data}`;
    });

    // ─── PROMPT FINAL DO AGENTE ───
    let finalPrompt = prompt || "Faça uma síntese situacional da rotina dos residentes.";
    finalPrompt += `\n\nDATA ATUAL: ${hoje}\nPACIENTES CADASTRADOS: ${pacientesMin.join(", ")}\nLOGS RECENTES DE ROTINA:\n${logsMin.join("\n")}`;

    // ─── CONFIG ───
    const config: Record<string, unknown> = {
      systemInstruction: CHAT_INSTRUCTION,
    };

    // ─── CALL AI COM CASCATA DE MODELOS ───
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let responseText = "";
    let lastError: any = null;

    for (const model of MODEL_CASCADE) {
      try {
        console.log(`[Vitality AI] Tentando modelo: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: finalPrompt,
          config
        });
        responseText = response.text ?? "";
        console.log(`[Vitality AI] ✅ Sucesso com ${model} (${responseText.length} chars)`);
        break; // sucesso — sai do loop
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Vitality AI] ❌ ${model} falhou: ${errMsg.substring(0, 120)}`);
        if (shouldFallback(err)) {
          console.log(`[Vitality AI] ↓ Fazendo fallback para próximo modelo...`);
          continue; // tenta o próximo
        }
        // Erro não recuperável (ex: API key inválida) — não tenta mais
        throw err;
      }
    }

    // Se nenhum modelo funcionou
    if (!responseText && lastError) {
      throw lastError;
    }

    return NextResponse.json({ result: responseText });
  } catch (error: unknown) {
    console.error('[Vitality AI] Todos os modelos falharam:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao gerar insight';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

