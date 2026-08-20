import { NormalizedLogRecord } from "./logNormalizer";
import { AIReport, Paciente } from "./types";

export type StatusSeguranca = "Verde" | "Amarelo" | "Vermelho";

/**
 * Deriva o status de segurança do paciente com base nos logs recentes e no relatório de IA.
 */
export function calcularStatusSeguranca(
  paciente: { id?: string; nome?: string; statusSeguranca?: string },
  logs: (NormalizedLogRecord | any)[],
  aiReport?: AIReport | null
): StatusSeguranca {
  if (!paciente) return "Verde";

  const pNome = (paciente.nome || "").toLowerCase();
  const pId = paciente.id || "";

  // Filtrar logs pertencentes a este paciente
  const pacienteLogs = (logs || []).filter((l) => {
    if (pId && l.pacienteId === pId) return true;
    if (pNome && l.pacienteNome && String(l.pacienteNome).toLowerCase() === pNome) return true;
    return false;
  });

  let maxRisco: StatusSeguranca = "Verde";

  // Analisar logs
  for (const log of pacienteLogs) {
    const tipo = String(log.tipo || log.tipoRotina || log.categoria || "").toLowerCase();
    const status = String(log.status || log.valor || log.estado || "").toLowerCase();
    const detalhe = String(log.detalhe || log.detail || log.observacao || log.resumo || "").toLowerCase();
    const textCombined = `${tipo} ${status} ${detalhe}`;

    // Nível Vermelho (Alerta / Risco Crítico)
    if (
      tipo === "incidente" ||
      status.includes("queda") ||
      status.includes("febre") ||
      status.includes("desidratação") ||
      status.includes("infecção") ||
      status.includes("urgênc") ||
      (tipo === "medicacao" && (status.includes("recusa") || status.includes("não"))) ||
      (tipo === "cognitivo" && (status.includes("agressiv") || status.includes("desorientad"))) ||
      textCombined.includes("queda") ||
      textCombined.includes("febre") ||
      textCombined.includes("emergência")
    ) {
      maxRisco = "Vermelho";
      break; // Maior risco atingido
    }

    // Nível Amarelo (Atenção / Alerta Moderado)
    if (
      (tipo === "alimentacao" && (status.includes("recus") || status.includes("metade") || status.includes("não"))) ||
      (tipo === "hidratacao" && (status.includes("pouca") || status.includes("recus"))) ||
      (tipo === "medicacao" && status.includes("atrasad")) ||
      (tipo === "sono" && (status.includes("insônia") || status.includes("agitado"))) ||
      (tipo === "humor" && (status.includes("triste") || status.includes("ansioso"))) ||
      (tipo === "cognitivo" && (status.includes("deprimid") || status.includes("apátic"))) ||
      textCombined.includes("recusou") ||
      textCombined.includes("pouca") ||
      textCombined.includes("atrasad") ||
      textCombined.includes("dor")
    ) {
      if (maxRisco === "Verde") {
        maxRisco = "Amarelo";
      }
    }
  }

  // Analisar relatório de IA (se houver)
  if (aiReport && pNome) {
    const pontosAtencaoStr = (aiReport.pontos_atencao || []).join(" ").toLowerCase();
    const temRecomendacao = (aiReport.recomendacoes_rotina || []).some(
      (r) => r.paciente && r.paciente.toLowerCase().includes(pNome)
    );

    if (pontosAtencaoStr.includes(pNome) || temRecomendacao) {
      if (maxRisco === "Verde") {
        maxRisco = "Amarelo";
      }
    }
  }

  // Se o paciente já tiver status explícito no Firestore (ex: "Amarelo" ou "Vermelho") e nenhum log limpou isso
  if (maxRisco === "Verde" && paciente.statusSeguranca && paciente.statusSeguranca !== "Verde") {
    return paciente.statusSeguranca as StatusSeguranca;
  }

  return maxRisco;
}

/**
 * Retorna lista de pacientes atualizados com statusSeguranca derivado de logs e IA.
 */
export function enriquecerPacientesComStatus<T extends Paciente>(
  pacientes: T[],
  logs: any[],
  aiReport?: AIReport | null
): T[] {
  return pacientes.map((paciente) => ({
    ...paciente,
    statusSeguranca: calcularStatusSeguranca(paciente, logs, aiReport),
  }));
}
