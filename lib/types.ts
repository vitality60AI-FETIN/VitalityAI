import { Timestamp } from "firebase/firestore";

// ─── Firestore Timestamp helper ───
/** Tipo para campos de data vindos do Firestore (pode ser Timestamp nativo ou já serializado) */
export type FirestoreTimestamp = Timestamp | { toDate: () => Date; toMillis: () => number };

// ─── Paciente ───
export interface Paciente {
  id: string;
  nome: string;
  idade: string;
  statusSeguranca: string;
}

// ─── Cuidador ───
export interface CuidadorData {
  id: string;
  nome?: string;
  email?: string;
  role?: string;
  instituicaoId?: string;
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
export interface AIReport {
  resumo_geral: string;
  pontos_atencao: string[];
  recomendacoes_rotina: string[];
}
