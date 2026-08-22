import { Timestamp } from "firebase/firestore";

// ─── Firestore Timestamp helper ───
/** Tipo para campos de data vindos do Firestore (pode ser Timestamp nativo ou já serializado) */
export type FirestoreTimestamp = Timestamp | { toDate: () => Date; toMillis: () => number };

// ─── Paciente ───
export interface Paciente {
  id: string;
  nome: string;
  idade: string;
  fotoUrl?: string;
  statusSeguranca: string;
}

// ─── Cuidador ───
export interface CuidadorData {
  id: string;
  nome?: string;
  nomeCompleto?: string;
  email?: string;
  role?: string;
  instituicaoId?: string;
  fotoUrl?: string;
  whatsapp?: string;
  tipoCuidador?: string;
  cpf?: string;
  dataNascimento?: string;
}

// ─── Insights History ───
export interface InsightHistoryItem {
  id: string;
  instituicaoId: string;
  cuidadorId: string;
  pergunta: string;
  resposta: string;
  dataHora?: FirestoreTimestamp;
}

// ─── AI Report ───
export interface AIReportDistribuicao {
  categoria: string;
  ok: number;
  alerta: number;
}

export interface AIReportPacienteRisco {
  nome: string;
  nivel: number;
}

export interface AIReportTendencia {
  dia: string;
  incidentes: number;
  positivos: number;
}

export interface AIReportGraficos {
  distribuicao_status: AIReportDistribuicao[];
  pacientes_risco: AIReportPacienteRisco[];
  tendencia_semanal: AIReportTendencia[];
}

export interface AIReportRecomendacao {
  paciente: string;
  data_referencia: string;
  acoes: string[];
}

export interface AIReport {
  resumo_geral: string;
  pontos_atencao: string[];
  recomendacoes_rotina: AIReportRecomendacao[];
  graficos?: AIReportGraficos;
}
