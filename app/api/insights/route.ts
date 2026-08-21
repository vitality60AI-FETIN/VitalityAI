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

// ─── Timestamp → string legível com hora ───
function fmtTs(ts: any): string {
  if (!ts) return "";
  try {
    let d: Date | null = null;
    if (typeof ts?.toDate === 'function') d = ts.toDate();
    else if (typeof (ts.seconds ?? ts._seconds) === 'number') d = new Date((ts.seconds ?? ts._seconds) * 1000);
    else if (typeof ts === 'string') { const parsed = new Date(ts); if (!isNaN(parsed.getTime())) d = parsed; }
    
    if (d) {
      const dateStr = d.toLocaleDateString('pt-BR');
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return timeStr && timeStr !== '00:00' ? `${dateStr} ${timeStr}` : dateStr;
    }
  } catch { /* */ }
  return "";
}

// ─── SYSTEM INSTRUCTION CONVERSACIONAL ───
const CHAT_INSTRUCTION = `Você é o assistente inteligente do Vitality AI, especialista em suporte, fisiologia geriátrica, triagem clínica e análise de risco para cuidadores e equipes de ILPIs (Instituições de Longa Permanência para Idosos).
Sua função é analisar com rigor absoluto os dados de rotina dos residentes e responder às dúvidas da equipe com máxima precisão, clareza, empatia e utilidade prática.

REGRAS CRÍTICAS DE AUDITORIA DE RISCO & CONDUTA:

1. TRIAGEM RIGOROSA DE RISCOS E ALERTAS (TOLERÂNCIA ZERO A FALSOS POSITIVOS):
   - Examine minuciosamente todos os registros (logs) e observações dos cuidadores.
   - Qualquer status de "Recusou", "Parcial", "Não Realizado", "Ausente", "Alterado", "Ruim", ou notas contendo dor, queda, febre, recusa alimentar/hídrica, ausência de medicação, agitação ou insônia DEVE SER IMEDIATAMENTE CLASSIFICADO COMO RISCO / ALERTA (🚨 [ALERTA DE RISCO]).
   - É STRICTAMENTE PROIBIDO descrever o dia ou quadro de um residente como "positivo", "estável", "sem alterações" ou "seguro" se houver QUALQUER recusa ou intercorrência registrada no período analisado.
   - Se um residente teve registros mistos (ex: almoçou bem, mas recusou o jantar ou recusou a medicação), DESTAQUE A RECUSA/INTERCORRÊNCIA COMO PONTO PRINCIPAL DE ATENÇÃO. Não amacie ou omita registros negativos.

2. CORRELAÇÃO TEMPORAL PRECISA:
   - Verifique sempre a DATA ATUAL fornecida e compare com a data dos registros (Data e Turno).
   - Quando o usuário perguntar por "ontem", "hoje", "últimos dias" ou uma data específica, filtre estritamente os logs correspondentes a esse período. Se a pergunta for sobre "ontem", indique explicitamente os fatos ocorridos na data de ontem.
   - Se não houver logs registrados para um determinado residente na data solicitada, informe claramente: "Sem registros cadastrados para a data X".

3. ESTRUTURA DE RESPOSTA PARA CONSULTAS DE RISCO / SITUAÇÃO GERAL:
   Quando a pergunta for sobre riscos, atenção, segurança ou resumo geral da instituição, estruture a resposta obrigatoriamente nesta ordem:
   
   🚨 **Residentes com Alertas / Riscos Detectados**:
   - Liste cada idoso em alerta citando Nome, Idade, Data/Hora exata, Categoria (Alimentação, Medicação, Hidratação, etc.), Status exato e as Notas do Cuidador na íntegra. Explique o risco fisiológico geriátrico associado (ex: risco de desidratação, sarcopenia, hipoglicemia, descontinuidade terapêutica).

   ✅ **Residentes sem Alertas Registrados**:
   - Resumo objetivo dos idosos que cumpriram 100% das rotinas planejadas sem recusas ou intercorrências.

   ⚠️ **Lacunas de Informação**:
   - Identifique residentes cadastrados que não possuem registros no período consultado.

   🛡️ **Recomendações & Ações Preventivas Imediatas**:
   - Oriente a equipe sobre condutas imediatas de manejo para cada risco identificado (ex: fracionamento hídrico, reoferta alimentar com ajuste de textura, checagem de sinais vitais, notificação da enfermagem/médico).

4. ESTRUTURA DE "PLANO PERSONALIZADO" (quando solicitado):
   - Sempre que solicitado um plano, orientação específica ou "plano do [Nome]", apresente sob o título "## Plano Personalizado - [Nome do Residente]".
   - O plano DEVE cobrir obrigatoriamente 4 pilares prescritivos e individualizados com base nos alertas recentes:
     a) 🏋️‍♂️ **Exercícios de Força & Equilíbrio**: Frequência e tipos específicos adequados à mobilidade.
     b) 🥗 **Nutrição & Proteína (Combate à Sarcopenia)**: Estratégias nutricionais focadas em recusas recentes ou prevenção de perda muscular.
     c) 💧 **Meta de Hidratação**: Meta diária fracionada (ex: 1.5L a 2.0L/dia).
     d) 🛡️ **Protocolo de Segurança & Prevenção**: Prevenção de quedas, adequação de ambiente e monitoramento.

5. REGRAS GERAIS:
   - NÃO É MÉDICO: Nunca forneça diagnósticos definitivos ou prescrições farmacológicas. Em episódios graves (como quedas com trauma, febre persistente, dor intensa ou broncoaspiração), recomende avaliação médica imediata.
   - FIDELIDADE ABSOLUTA AOS DADOS: Baseie-se unicamente nos dados fornecidos. Não invente ou presuma hábitos saudáveis que não constem nos logs.
   - FORMATO: Responda em Português (Brasil) utilizando Markdown limpo e bem estruturado.`;

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

    // ─── DADOS COMPACTOS E ENRIQUECIDOS DE FORMA ORDENADA ───
    const hoje = new Date().toLocaleDateString('pt-BR');
    const pacientesMin = (patients || []).map((p: any) => `${p.nome || "?"} (${p.idade || "?"}a)`);

    // Ordenar logs por data decrescente (mais recentes primeiro)
    const sortedLogs = [...(logs || [])].sort((a: any, b: any) => {
      const getMs = (l: any) => {
        if (l.dataHora?.seconds) return l.dataHora.seconds * 1000;
        if (l.dataHora?._seconds) return l.dataHora._seconds * 1000;
        if (typeof l.dataHora === 'string') {
          const t = new Date(l.dataHora).getTime();
          if (!isNaN(t)) return t;
        }
        if (l.dataTurno) {
          const t = new Date(l.dataTurno).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };
      return getMs(b) - getMs(a);
    });

    const logsMin = sortedLogs.slice(0, 100).map((l: any) => {
      const nome = (patients || []).find((p: any) => p.id === l.pacienteId)?.nome || l.pacienteId || "?";
      const dataHoraStr = fmtTs(l.dataHora);
      const dataStr = dataHoraStr ? `${dataHoraStr} (Turno: ${l.dataTurno || "?"})` : (l.dataTurno || "?");
      const tipo = l.tipoLabel || l.tipo || "?";
      const status = l.status || "?";

      // Coletar TODAS as observações e detalhes sem descartar observacaoTurno ou observacao
      const notesSet = new Set<string>();
      [l.detalhe, l.observacaoTurno, l.observacao, l.resumo].forEach((val: any) => {
        if (typeof val === 'string' && val.trim().length > 0 && val.trim() !== status) {
          notesSet.add(val.trim());
        }
      });
      const notes = Array.from(notesSet).join(" | ");

      return notes 
        ? `${nome} | ${tipo}: ${status} [Notas: ${notes}] | Data: ${dataStr}` 
        : `${nome} | ${tipo}: ${status} | Data: ${dataStr}`;
    });

    // ─── PROMPT FINAL DO AGENTE ───
    let finalPrompt = prompt || "Faça uma síntese situacional da rotina dos residentes.";
    finalPrompt += `\n\nDATA ATUAL DO SISTEMA: ${hoje}\nPACIENTES CADASTRADOS: ${pacientesMin.join(", ")}\nLOGS RECENTES DE ROTINA:\n${logsMin.join("\n")}`;

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

