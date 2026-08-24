import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ─── CASCATA DE MODELOS ───
// Ordem de prioridade: tenta o primeiro, se falhar (429/503/404) tenta o próximo
const MODEL_CASCADE = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
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
Sua função é analisar os dados de rotina dos residentes e responder às dúvidas da equipe com máxima precisão, clareza, concisão e foco no que foi perguntado.

REGRAS DE CONCISÃO, LINGUAGEM E FOCO NO PROMPT:

1. FOCO E OBJETIVIDADE TOTAL NA PERGUNTA DO USUÁRIO:
   - Responda DIRETA e OBJETIVAMENTE unicamente ao que o usuário perguntou.
   - Se o usuário perguntou sobre um residente específico (ex: "Como está o Seu João?"), responda EXCLUSIVAMENTE sobre aquele residente. NUNCA mencione outros residentes ou a instituição inteira a menos que solicitado.
   - Seja conciso e direto ao ponto. Evite introduções longas, textos prolixos, relatórios genéricos ou repetições desnecessárias. Mantenha respostas curtas e legíveis para bate-papo/chat (idealmente entre 2 a 4 parágrafos ou tópicos objetivos).

2. ISOLAMENTO RIGOROSO DE INSTITUIÇÃO:
   - Você DEVE responder UNICAMENTE com base nos residentes e registros da INSTITUIÇÃO ATIVA fornecida no contexto.
   - É STRICTAMENTE PROIBIDO responder ou inferir dados de idosos pertencentes a outras instituições.
   - Se a instituição ativa consultada não possuir residentes ou logs cadastrados (ex: instituição recém-criada sem idosos), informe claramente: "A instituição ativa consultada não possui residentes ou registros cadastrados no momento."

3. QUANDO ESTRUTURAR RESPOSTAS MAIS LONGAS:
   - Para perguntas específicas de um residente ou dúvida pontual: responda diretamente a dúvida, trazendo o status mais recente, eventuais alertas/recusas e orientações práticas imediatas.
   - Apenas apresente um relatório geral completo dividido em seções (🚨 Alertas / ✅ Sem Alertas / ⚠️ Lacunas / 🛡️ Recomendações) se o usuário pedir EXPLICITAMENTE por "resumo geral da casa", "relatório de todos", "situação geral da instituição" ou "auditoria completa".
   - Apenas apresente um "## Plano Personalizado" de 4 pilares se o usuário pedir especificamente um "plano" ou "orientação de treino/dieta".

4. TRIAGEM RIGOROSA DE RISCOS E ALERTAS (TOLERÂNCIA ZERO A FALSOS POSITIVOS):
   - Examine minuciosamente todos os registros (logs) e observações dos cuidadores.
   - Qualquer status de "Recusou", "Parcial", "Não Realizado", "Ausente", "Alterado", "Ruim", ou notas contendo dor, queda, febre, recusa alimentar/hídrica, ausência de medicação, agitação ou insônia DEVE SER IMEDIATAMENTE DESTACADO COMO ALERTA DE RISCO (🚨 [ALERTA DE RISCO]).
   - Se um residente teve registros mistos (ex: almoçou bem, mas recusou a medicação), DESTAQUE A RECUSA COMO PONTO PRINCIPAL DE ATENÇÃO. NUNCA descreva o quadro de um residente como "tranquilo" ou "sem alterações" se houver recusas/intercorrências registradas no período.

5. REGRAS DE SEGURANÇA E CONDUTA:
   - NÃO É MÉDICO: Nunca forneça diagnósticos definitivos ou prescrições farmacológicas. Em intercorrências graves (como quedas com trauma, febre persistente, dor intensa), recomende avaliação médica imediata.
   - FIDELIDADE ABSOLUTA AOS DADOS: Baseie-se unicamente nos dados fornecidos. Não invente ou presuma fatos que não constem nos logs.
   - FORMATO: Responda em Português (Brasil) utilizando Markdown limpo, direto e bem formatado.`;

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
    const { prompt, patients, logs, instituicaoId, instituicaoNome } = body;

    // ─── FILTRAR E SANITIZAR DADOS POR INSTITUIÇÃO ATIVA ───
    const filteredPatients = (patients || []).filter((p: any) => !instituicaoId || !p.instituicaoId || p.instituicaoId === instituicaoId);
    const filteredLogs = (logs || []).filter((l: any) => !instituicaoId || !l.instituicaoId || l.instituicaoId === instituicaoId);

    const hoje = new Date().toLocaleDateString('pt-BR');
    const pacientesMin = filteredPatients.map((p: any) => `${p.nome || "?"} (${p.idade || "?"}a)`);

    // Ordenar logs por data decrescente (mais recentes primeiro)
    const sortedLogs = [...filteredLogs].sort((a: any, b: any) => {
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
      const nome = filteredPatients.find((p: any) => p.id === l.pacienteId)?.nome || l.pacienteId || "?";
      const dataHoraStr = fmtTs(l.dataHora);
      const dataStr = dataHoraStr ? `${dataHoraStr} (Turno: ${l.dataTurno || "?"})` : (l.dataTurno || "?");
      const tipo = l.tipoLabel || l.tipo || "?";
      const status = l.status || "?";

      // Coletar observações
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
    const instHeader = instituicaoNome || instituicaoId || "Instituição Ativa";
    let finalPrompt = prompt || "Faça uma síntese situacional da rotina dos residentes.";
    finalPrompt += `\n\nINSTITUIÇÃO ATIVA CONSULTADA: ${instHeader}\nDATA ATUAL DO SISTEMA: ${hoje}\nPACIENTES CADASTRADOS NESTA INSTITUIÇÃO (${filteredPatients.length}): ${pacientesMin.length > 0 ? pacientesMin.join(", ") : "Nenhum paciente cadastrado nesta instituição"}\nLOGS RECENTES DE ROTINA NESTA INSTITUIÇÃO (${logsMin.length}): ${logsMin.length > 0 ? "\n" + logsMin.join("\n") : "Nenhum log registrado para esta instituição"}`;

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

