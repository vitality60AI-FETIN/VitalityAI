import { NormalizedLogRecord } from "./logNormalizer";
import { AIReport, Paciente } from "./types";

export type StatusSeguranca = "Verde" | "Amarelo" | "Vermelho";

/**
 * Deriva dinamicamente o status de segurança do paciente com base estrita nos logs recentes.
 * • "Verde" (Estável): Rotina regular, alimentação boa, medicação administrada, sem incidentes.
 * • "Amarelo" (Atenção): Refeição parcial (metade), hidratação pouca, medicação atrasada, insônia ou humor tristonho.
 * • "Vermelho" (Alerta Crítico): Incidentes (quedas, febre), medicação recusada, dor aguda ou confusão/agressividade.
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

  // Se não há logs registrados para este paciente, seu status padrão é Estável (Verde)
  if (pacienteLogs.length === 0) {
    return "Verde";
  }

  let maxRisco: StatusSeguranca = "Verde";
  const now = Date.now();
  const seteDiasMs = 7 * 24 * 60 * 1000;

  // Analisar logs do paciente do mais recente para o mais antigo
  for (const log of pacienteLogs) {
    const ts =
      log.dataHora && typeof log.dataHora.toDate === "function"
        ? log.dataHora.toDate().getTime()
        : 0;

    // Considerar logs dos últimos 7 dias para avaliação de risco
    if (ts && now - ts > seteDiasMs) continue;

    const tipo = String(log.tipo || log.tipoRotina || log.categoria || "").toLowerCase();
    const status = String(log.status || log.valor || log.estado || "").toLowerCase();
    const detalhe = String(log.detalhe || log.detail || log.observacao || log.resumo || "").toLowerCase();
    const textCombined = `${tipo} ${status} ${detalhe}`;

    const isSemIntercorrencia =
      status.includes("sem intercorrênc") ||
      status.includes("sem intercorrenc") ||
      status.includes("sem interferênc") ||
      status.includes("sem interferenc") ||
      status.includes("nenhum") ||
      status.includes("nenhuma") ||
      status.includes("normal") ||
      detalhe.includes("sem intercorrênc") ||
      detalhe.includes("sem intercorrenc") ||
      detalhe.includes("sem interferênc") ||
      detalhe.includes("sem interferenc") ||
      textCombined.includes("sem intercorrênc") ||
      textCombined.includes("sem intercorrenc") ||
      textCombined.includes("sem interferênc") ||
      textCombined.includes("sem interferenc");

    // Nível Vermelho (Incidentes Críticos / Alertas de Urgência)
    if (
      !isSemIntercorrencia &&
      (tipo === "incidente" ||
        status.includes("queda") ||
        status.includes("febre") ||
        status.includes("desidratação") ||
        status.includes("infecção") ||
        status.includes("urgênc") ||
        (tipo === "medicacao" && (status.includes("recusa") || status.includes("não administ"))) ||
        (tipo === "cognitivo" && (status.includes("agressiv") || status.includes("desorientad"))) ||
        textCombined.includes("queda") ||
        textCombined.includes("febre") ||
        textCombined.includes("emergência"))
    ) {
      maxRisco = "Vermelho";
      break; // Risco máximo atingido
    }

    // Nível Amarelo (Atenção Moderada)
    if (
      (tipo === "alimentacao" && (status.includes("recus") || status.includes("metade"))) ||
      (tipo === "hidratacao" && (status.includes("pouca") || status.includes("recus"))) ||
      (tipo === "medicacao" && status.includes("atrasad")) ||
      (tipo === "sono" && (status.includes("insônia") || status.includes("agitado"))) ||
      (tipo === "humor" && (status.includes("triste") || status.includes("ansioso"))) ||
      (tipo === "cognitivo" && (status.includes("deprimid") || status.includes("apátic")))
    ) {
      if (maxRisco === "Verde") {
        maxRisco = "Amarelo";
      }
    }
  }

  return maxRisco;
}

/**
 * Retorna lista de pacientes atualizados com statusSeguranca derivado dos logs em tempo real.
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
